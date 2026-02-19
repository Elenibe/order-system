'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function ChangeRequests() {
  const router = useRouter();
  const [adminData, setAdminData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setAdminData(session);
    loadRequests();
  }, [router]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_change_requests')
        .select(`
          *,
          vendors (
            id,
            company_name,
            email,
            phone,
            contact_person
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading change requests:', error);
      setLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Get the request details
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update the vendor table with new value
      const updateData = {};
      updateData[request.field_name] = request.proposed_value;

      const { error: vendorError } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', request.vendor_id);

      if (vendorError) throw vendorError;

      // Update the change request status
      const { error: requestError } = await supabase
        .from('vendor_change_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminData.id
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Send notification to vendor
      await supabase
        .from('admin_messages')
        .insert({
          vendor_id: request.vendor_id,
          subject: `Change Approved: ${getFieldLabel(request.field_name)}`,
          message_text: `Your request to change ${getFieldLabel(request.field_name)} from "${request.current_value}" to "${request.proposed_value}" has been approved and is now active.`,
          sender_type: 'admin'
        });

      alert('Request approved! Changes applied to vendor account.');
      setSelectedRequest(null);
      setAdminNotes('');
      await loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const rejectRequest = async (requestId) => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update the change request status
      const { error: requestError } = await supabase
        .from('vendor_change_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminData.id
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Send notification to vendor
      await supabase
        .from('admin_messages')
        .insert({
          vendor_id: request.vendor_id,
          subject: `Change Request Rejected: ${getFieldLabel(request.field_name)}`,
          message_text: `Your request to change ${getFieldLabel(request.field_name)} has been rejected.\n\nReason: ${adminNotes}`,
          sender_type: 'admin'
        });

      alert('Request rejected. Vendor has been notified.');
      setSelectedRequest(null);
      setAdminNotes('');
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      company_name: 'Company Name',
      email: 'Email Address',
      phone: 'Phone Number',
      payment_accounts: 'Payment Accounts'
    };
    return labels[field] || field;
  };

  const getStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'bg-green-50 border-green-200';
    if (status === 'rejected') return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const filteredRequests = requests.filter(r => r.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="admin" userData={adminData}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Change Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve vendor information changes</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          {['pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                filterStatus === status
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="capitalize">{status}</span>
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                {requests.filter(r => r.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">
                {filterStatus === 'pending' ? 'Pending' : filterStatus === 'approved' ? 'Approved' : 'Rejected'} Requests
              </h2>
            </div>

            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No {filterStatus} requests</p>
                </div>
              ) : (
                filteredRequests.map(request => (
                  <button
                    key={request.id}
                    onClick={() => {
                      setSelectedRequest(request);
                      setAdminNotes('');
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                      selectedRequest?.id === request.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {getStatusIcon(request.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {request.vendors?.company_name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {getFieldLabel(request.field_name)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`p-6 border-b-4 ${getStatusColor(selectedRequest.status)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedRequest.vendors?.company_name}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Requested change: <span className="font-semibold">{getFieldLabel(selectedRequest.field_name)}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedRequest.status)}
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Current Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Value
                    </label>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-gray-900 font-mono">
                        {selectedRequest.current_value || '(Not set)'}
                      </p>
                    </div>
                  </div>

                  {/* Proposed Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed New Value
                    </label>
                    <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                      <p className="text-gray-900 font-mono font-semibold">
                        {selectedRequest.proposed_value}
                      </p>
                    </div>
                  </div>

                  {/* Vendor Contact Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Vendor Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Contact Person:</span> {selectedRequest.vendors?.contact_person}</p>
                      <p><span className="font-medium">Email:</span> {selectedRequest.vendors?.email}</p>
                      <p><span className="font-medium">Phone:</span> {selectedRequest.vendors?.phone}</p>
                    </div>
                  </div>

                  {/* Request Timestamps */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Requested: {new Date(selectedRequest.created_at).toLocaleString()}</p>
                    {selectedRequest.reviewed_at && (
                      <p>Reviewed: {new Date(selectedRequest.reviewed_at).toLocaleString()}</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedRequest.status === 'pending' ? 'Admin Notes (optional)' : 'Review Notes'}
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this request..."
                      disabled={selectedRequest.status !== 'pending'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      rows="3"
                    />
                    {selectedRequest.admin_notes && (
                      <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Previous Notes:</p>
                        <p className="text-sm text-gray-700">{selectedRequest.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {selectedRequest.status === 'pending' && (
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => approveRequest(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {processing ? 'Processing...' : 'Approve Request'}
                      </button>
                      <button
                        onClick={() => rejectRequest(selectedRequest.id)}
                        disabled={processing || !adminNotes.trim()}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        {processing ? 'Processing...' : 'Reject Request'}
                      </button>
                    </div>
                  )}

                  {selectedRequest.status !== 'pending' && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        This request has already been {selectedRequest.status}. No further action can be taken.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-full flex items-center justify-center min-h-96">
                <div className="text-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a request to view details and take action</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}