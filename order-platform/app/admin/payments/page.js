// app/admin/payments/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, Download, X, AlertCircle } from 'lucide-react';

export default function AdminPayments() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadPayments();
  }, [router]);

  const loadPayments = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers(full_name, company_name, phone_number),
        vendors(company_name, phone_number)
      `)
      .in('status', ['payment_received', 'customer_accepted'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const handleVerifyPayment = async (orderId) => {
    if (!confirm('Confirm that you have verified this payment receipt?')) return;
    
    setActionLoading(true);
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (!error) {
      alert('Payment verified! Order moved to processing.');
      await loadPayments();
      setSelectedOrder(null);
    } else {
      alert('Error: ' + error.message);
    }
    setActionLoading(false);
  };

  const handleRejectPayment = async (orderId) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'unpaid',
        status: 'customer_accepted',
        vendor_notes: `Payment rejected: ${reason}`
      })
      .eq('id', orderId);

    if (!error) {
      alert('Payment rejected. Customer will be notified.');
      await loadPayments();
      setSelectedOrder(null);
    } else {
      alert('Error: ' + error.message);
    }
    setActionLoading(false);
  };

  const viewReceipt = async (order) => {
    setSelectedOrder(order);
    if (order.payment_receipt_url) {
      // For Telegram file IDs, you would need to fetch the file through Telegram Bot API
      // For now, we'll show the file ID
      setReceiptUrl(order.payment_receipt_url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingPayments = orders.filter(o => o.status === 'payment_received' && o.payment_status !== 'paid');
  const verifiedPayments = orders.filter(o => o.payment_status === 'paid');

  return (
    <DashboardLayout userType="admin" userData={userData}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">Verify customer payment receipts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified Payments</p>
                <p className="text-2xl font-bold text-green-600">{verifiedPayments.length}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()} Birr
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Payment Verification</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No pending payment verifications
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.customers?.company_name || order.customers?.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.vendors?.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.total_amount} Birr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.payment_receipt_url ? (
                          <button
                            onClick={() => viewReceipt(order)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-red-600 text-sm">No receipt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.updated_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleVerifyPayment(order.id)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => handleRejectPayment(order.id)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verified Payments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Verified Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verifiedPayments.slice(0, 10).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.customers?.company_name || order.customers?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.vendors?.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {order.total_amount} Birr
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.paid_at ? new Date(order.paid_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Order #:</span> {selectedOrder.order_number}</p>
                  <p><span className="font-medium">Customer:</span> {selectedOrder.customers?.company_name || selectedOrder.customers?.full_name}</p>
                  <p><span className="font-medium">Vendor:</span> {selectedOrder.vendors?.company_name}</p>
                  <p><span className="font-medium">Amount:</span> <span className="text-lg font-bold text-blue-600">{selectedOrder.total_amount} Birr</span></p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Receipt File ID</h3>
                    <p className="text-sm text-gray-700 mt-1 font-mono bg-white px-2 py-1 rounded">
                      {receiptUrl}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      💡 To view the actual image, use the Telegram Bot API with this file_id and your bot token
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleVerifyPayment(selectedOrder.id)}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  <CheckCircle className="inline h-5 w-5 mr-2" />
                  Verify Payment
                </button>
                <button
                  onClick={() => handleRejectPayment(selectedOrder.id)}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  <XCircle className="inline h-5 w-5 mr-2" />
                  Reject Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}