// app/admin/vendors/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { getAllVendors, updateVendor } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Phone,
  Mail,
  Building,
  User,
  Ban
} from 'lucide-react';

export default function AdminVendors() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadVendors();
  }, [router]);

  useEffect(() => {
    filterVendors();
  }, [vendors, filter, searchTerm]);

  const loadVendors = async () => {
    const result = await getAllVendors();
    if (result.data) {
      setVendors(result.data);
    }
    setLoading(false);
  };

  const filterVendors = () => {
    let filtered = vendors;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(v => v.status === filter);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
  };

  const handleApprove = async (vendorId) => {
    setActionLoading(true);
    const result = await updateVendor(vendorId, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: userData.id
    });

    if (!result.error) {
      await loadVendors();
      setSelectedVendor(null);
      alert('Vendor approved successfully!');
    } else {
      alert('Error approving vendor: ' + result.error);
    }
    setActionLoading(false);
  };

  const handleReject = async (vendorId) => {
    setActionLoading(true);
    const result = await updateVendor(vendorId, {
      status: 'rejected'
    });

    if (!result.error) {
      await loadVendors();
      setSelectedVendor(null);
      alert('Vendor rejected');
    } else {
      alert('Error rejecting vendor: ' + result.error);
    }
    setActionLoading(false);
  };

  const handleSuspend = async (vendorId) => {
    setActionLoading(true);
    const result = await updateVendor(vendorId, {
      status: 'suspended'
    });

    if (!result.error) {
      await loadVendors();
      setSelectedVendor(null);
      alert('Vendor suspended');
    } else {
      alert('Error suspending vendor: ' + result.error);
    }
    setActionLoading(false);
  };

  // FIXED: This is for VENDOR status, not ORDER status
  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4 mr-1" />,
        text: 'Pending Approval'
      },
      approved: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        text: 'Approved'
      },
      rejected: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-4 w-4 mr-1" />,
        text: 'Rejected'
      },
      suspended: {
        color: 'bg-gray-100 text-gray-800',
        icon: <Ban className="h-4 w-4 mr-1" />,
        text: 'Suspended'
      }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="admin" userData={userData}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
            <p className="text-gray-600 mt-1">Manage vendor accounts and approvals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Vendors</p>
            <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">
              {vendors.filter(v => v.status === 'pending').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.status === 'approved').length}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Rejected/Suspended</p>
            <p className="text-2xl font-bold text-red-600">
              {vendors.filter(v => ['rejected', 'suspended'].includes(v.status)).length}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendors..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected', 'suspended'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No vendors found
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{vendor.company_name}</p>
                          <p className="text-xs text-gray-500">TIN: {vendor.tin_number || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{vendor.contact_person}</p>
                          <p className="text-gray-500">{vendor.email}</p>
                          <p className="text-gray-500">{vendor.phone_number}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(vendor.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Vendor Details</h2>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Company Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Company Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">TIN Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.tin_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedVendor.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Business Category</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedVendor.business_category || 'general'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bot Deep Link</p>
                    <p className="text-sm font-medium text-blue-600">{selectedVendor.bot_deep_link || 'Not set'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Contact Person</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.contact_person}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.phone_number}</p>
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              {selectedVendor.bank_account_number && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Bank Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Account Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.bank_account_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Account Number</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.bank_account_number}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Bank Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.bank_name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedVendor.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedVendor.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedVendor.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject
                    </button>
                  </>
                )}
                {selectedVendor.status === 'approved' && (
                  <button
                    onClick={() => handleSuspend(selectedVendor.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Suspend Vendor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}