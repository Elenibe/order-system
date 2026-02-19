// app/admin/orders/page.js (IMPROVED VERSION)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { getAllOrders } from '@/lib/supabase';
import { X, Image, FileText, Mic, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminOrders() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadOrders();
  }, [router]);

  const loadOrders = async () => {
    const result = await getAllOrders();
    if (result.data) {
      setOrders(result.data);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending_submission': 'bg-gray-100 text-gray-800',
      'pending_quote': 'bg-yellow-100 text-yellow-800',
      'quoted': 'bg-blue-100 text-blue-800',
      'customer_accepted': 'bg-purple-100 text-purple-800',
      'payment_pending': 'bg-orange-100 text-orange-800',
      'payment_received': 'bg-green-100 text-green-800',
      'processing': 'bg-indigo-100 text-indigo-800',
      'shipped': 'bg-cyan-100 text-cyan-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'voice': return <Mic className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const statusCounts = {
    all: orders.length,
    pending_quote: orders.filter(o => o.status === 'pending_quote').length,
    quoted: orders.filter(o => o.status === 'quoted').length,
    payment_received: orders.filter(o => o.status === 'payment_received').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
            <p className="text-gray-600 mt-1">Monitor and manage all platform orders</p>
          </div>
          <button
            onClick={() => router.push('/admin/payments')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2"
          >
            <Clock className="h-5 w-5" />
            Pending Payments ({orders.filter(o => o.status === 'payment_received' && o.payment_status !== 'paid').length})
          </button>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize text-sm ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace(/_/g, ' ')} ({count})
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.customers?.full_name || order.customers?.company_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.vendors?.company_name || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {order.total_amount ? `${order.total_amount} Birr` : 'Pending'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {order.commission_amount ? `${order.commission_amount} Birr` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.payment_receipt_url && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status === 'paid' ? '✓ Verified' : '⏳ Pending'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Order #:</span> {selectedOrder.order_number}</p>
                    <p><span className="font-medium">Status:</span> <span className="capitalize">{selectedOrder.status.replace(/_/g, ' ')}</span></p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    {selectedOrder.total_amount && (
                      <>
                        <p><span className="font-medium">Total Amount:</span> <span className="text-lg font-bold text-gray-900">{selectedOrder.total_amount} Birr</span></p>
                        <p><span className="font-medium">Commission:</span> <span className="text-blue-600 font-semibold">{selectedOrder.commission_amount} Birr</span></p>
                        <p><span className="font-medium">Vendor Amount:</span> <span className="text-green-600 font-semibold">{selectedOrder.vendor_amount} Birr</span></p>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer & Vendor</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Customer:</span> {selectedOrder.customers?.full_name || selectedOrder.customers?.company_name}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.customers?.phone_number}</p>
                    <p><span className="font-medium">Address:</span> {selectedOrder.delivery_address || selectedOrder.customers?.address}</p>
                    {selectedOrder.vendors && (
                      <>
                        <div className="border-t pt-2 mt-2">
                          <p><span className="font-medium">Vendor:</span> {selectedOrder.vendors.company_name}</p>
                          <p><span className="font-medium">Vendor Phone:</span> {selectedOrder.vendors.phone_number}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Receipt */}
              {selectedOrder.payment_receipt_url && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-6 w-6 text-yellow-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Receipt</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Receipt Status:</span>{' '}
                          <span className={`font-semibold ${
                            selectedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {selectedOrder.payment_status === 'paid' ? '✓ Verified' : '⏳ Awaiting Verification'}
                          </span>
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">File ID:</span>{' '}
                          <code className="bg-white px-2 py-1 rounded text-xs">{selectedOrder.payment_receipt_url}</code>
                        </p>
                        {selectedOrder.paid_at && (
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Verified At:</span> {new Date(selectedOrder.paid_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => router.push('/admin/payments')}
                        className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm font-medium"
                      >
                        Go to Payment Verification →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Request</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedOrder.product_description || 'No description provided'}</p>
                </div>
              </div>

              {/* Attached Files */}
              {selectedOrder.order_files && selectedOrder.order_files.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Attached Files ({selectedOrder.order_files.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedOrder.order_files.map((file, index) => (
                      <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex items-center space-x-2 mb-2">
                          {getFileIcon(file.file_type)}
                          <span className="text-sm font-medium capitalize">{file.file_type}</span>
                        </div>
                        {file.telegram_file_id && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1 font-mono truncate">{file.telegram_file_id}</p>
                            <p className="text-xs text-blue-600">Telegram File</p>
                          </div>
                        )}
                        {file.file_name && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    💡 Tip: To view images, download them from Telegram using the bot token and file_id
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => router.push(`/admin/orders/${selectedOrder.id}`)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Manage Order
                </button>
                {selectedOrder.payment_receipt_url && selectedOrder.payment_status !== 'paid' && (
                  <button
                    onClick={() => router.push('/admin/payments')}
                    className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700"
                  >
                    Verify Payment
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