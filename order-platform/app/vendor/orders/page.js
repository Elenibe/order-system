'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { X, Eye, DollarSign, MessageSquare, Clock } from 'lucide-react';
import VendorOrderMessages from '@/components/VendorOrderMessages';
import { retrySupabaseQuery } from '@/lib/retryFetch';

export default function VendorOrders() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showMessages, setShowMessages] = useState(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingQuote, setExistingQuote] = useState(null);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    const session = getSession('vendor');
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    setUserData(session);
    loadOrders(session.id);
  }, [router]);

  const loadOrders = async (vendorId) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers(full_name, company_name, phone_number),
        order_files(*)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log('Loaded orders for vendor:', vendorId, 'Count:', data?.length || 0);
    setOrders(data || []);
    
    await loadPendingPaymentsCount(vendorId);
  } catch (error) {
    console.error('Error loading orders:', error);  // ❌ Shows {}
  } finally {
    setLoading(false);
  }
};

const loadPendingPaymentsCount = async (vendorId) => {
  try {
    const result = await retrySupabaseQuery(() =>
      supabase
        .from('orders')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('status', 'payment_pending')
    );
    
    setPendingPaymentsCount(result.data?.length || 0);
  } catch (error) {
    console.error('[Pending Payments] Failed to load count:', {
      message: error?.message || 'Unknown error',
      code: error?.code
    });
    setPendingPaymentsCount(0);
  }
};
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!confirm(`Change status to ${newStatus}?`)) return;
    
    try {
      const response = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Order status updated! Customer has been notified.');
        setSelectedOrder(null);
        loadOrders(userData.id);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending_quote': { label: 'Pending Quote', color: 'bg-yellow-100 text-yellow-800' },
      'quoted': { label: 'Quoted', color: 'bg-blue-100 text-blue-800' },
      'payment_pending': { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800' },
      'payment_received': { label: 'Payment Verified', color: 'bg-green-100 text-green-800' },
      'processing': { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
      'shipped': { label: 'Ready for Delivery', color: 'bg-blue-100 text-blue-800' },
      'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-800' },
      'completed': { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    };
    
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  const checkExistingQuote = async (orderId, vendorId) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId)
        .single();
      
      if (data) {
        setExistingQuote(data);
        setQuoteAmount(data.quoted_price.toString());
        setDeliveryDays(data.delivery_days?.toString() || '');
        setNotes(data.notes || '');
      } else {
        setExistingQuote(null);
        setQuoteAmount('');
        setDeliveryDays('');
        setNotes('');
      }
    } catch (error) {
      console.error('Error checking quote:', error);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    await checkExistingQuote(order.id, userData.id);
  };

  const handleSendQuote = async () => {
    if (!quoteAmount) {
      alert('Please enter a quote amount');
      return;
    }

    setSubmitting(true);
    try {
      const quoteData = {
        order_id: selectedOrder.id,
        vendor_id: userData.id,
        quoted_price: parseFloat(quoteAmount),
        delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
        notes: notes || null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('orders')
        .update({ status: 'quoted' })
        .eq('id', selectedOrder.id);

      const notificationResponse = await fetch('/api/send-quote-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          telegramId: selectedOrder.telegram_id,
          quotePrice: quoteData.quoted_price,
          deliveryDays: quoteData.delivery_days,
          notes: quoteData.notes
        })
      });

      alert('Quote sent successfully!');
      setSelectedOrder(null);
      setExistingQuote(null);
      loadOrders(userData.id);
    } catch (error) {
      console.error('Error sending quote:', error);
      alert('Error sending quote: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="vendor" userData={userData}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage and respond to customer orders</p>
          </div>
          
          {/* Pending Payments Button */}
          {pendingPaymentsCount > 0 && (
            <button
              onClick={() => router.push('/vendor/payments')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center shadow-lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              Pending Payments ({pendingPaymentsCount})
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customers?.full_name || order.customers?.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setShowMessages(order)}
                        className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {order.unread_vendor_messages > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {order.unread_vendor_messages}
                          </span>
                        )}
                        Messages
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleSelectOrder(order)}
                        className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View & Quote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Messages Modal */}
      {showMessages && (
        <VendorOrderMessages
          order={showMessages}
          vendorId={userData.id}
          onClose={() => {
            setShowMessages(null);
            loadOrders(userData.id);
          }}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setExistingQuote(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">Order #:</span> {selectedOrder.order_number}</p>
                  <p><span className="font-medium">Customer:</span> {selectedOrder.customers?.full_name || selectedOrder.customers?.company_name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.customers?.phone_number}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.delivery_address || 'Not provided'}</p>
                  <p><span className="font-medium">Status:</span> {getStatusBadge(selectedOrder.status)}</p>
                </div>
              </div>

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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Attached Files</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.order_files.map((file, index) => (
                      <a
                        key={index}
                        href={`/api/telegram-download?file_id=${file.telegram_file_id}&file_type=${file.file_type}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-2"
                        download
                      >
                        <span className="text-lg">
                          {file.file_type === 'image' && '🖼️'}
                          {file.file_type === 'document' && '📄'}
                          {file.file_type === 'voice' && '🎙️'}
                        </span>
                        Download {file.file_type}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Quote Form */}
              {!existingQuote ? (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                    Send Your Quote
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quote Price (Birr) *
                      </label>
                      <input
                        type="number"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter your price"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Time (days)
                      </label>
                      <input
                        type="number"
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g., 3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Any additional information..."
                      />
                    </div>

                    <button
                      onClick={handleSendQuote}
                      disabled={submitting || !quoteAmount}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {submitting ? 'Sending Quote...' : 'Send Quote to Customer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">✓ Quote Already Sent</h3>
                  <div className="space-y-1 text-blue-800">
                    <p><span className="font-medium">Price:</span> {existingQuote.quoted_price} Birr</p>
                    <p><span className="font-medium">Delivery:</span> {existingQuote.delivery_days || 'Not specified'} days</p>
                    {existingQuote.notes && (
                      <p><span className="font-medium">Notes:</span> {existingQuote.notes}</p>
                    )}
                    <p className="text-sm mt-2">Status: <span className="capitalize">{existingQuote.status}</span></p>
                  </div>
                </div>
              )}

              {/* STATUS ACTION BUTTONS */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Actions</h3>
                
                {/* When payment receipt uploaded but not verified yet */}
                {selectedOrder.status === 'payment_pending' && (
                  <div>
                    <div className="mb-3 p-3 bg-orange-50 rounded border border-orange-200">
                      <p className="text-sm text-orange-800">
                        ⏳ Payment receipt uploaded. Please verify the receipt.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/vendor/payments')}
                      className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 mb-2 flex items-center justify-center font-medium"
                    >
                      🧾 Verify Receipt
                    </button>
                  </div>
                )}

                {/* When payment is verified - Start Processing */}
                {selectedOrder.status === 'payment_received' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 mb-2 flex items-center justify-center font-medium"
                  >
                    ⚙️ Start Processing Order
                  </button>
                )}

                {/* When processing - Mark as ready for delivery */}
                {selectedOrder.status === 'processing' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 mb-2 flex items-center justify-center font-medium"
                  >
                    📦 Ready for Delivery (Request Address)
                  </button>
                )}

                {/* When shipped - Show delivery info and mark as delivered */}
                {selectedOrder.status === 'shipped' && (
                  <div>
                    {selectedOrder.delivery_address ? (
                      <div className="mb-3 p-3 bg-white rounded border">
                        <p className="font-semibold mb-2">Delivery Information:</p>
                        <p className="text-sm">📍 {selectedOrder.delivery_address}</p>
                        <p className="text-sm">📱 {selectedOrder.delivery_phone || 'Not provided'}</p>
                      </div>
                    ) : (
                      <div className="mb-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          ⏳ Waiting for customer to provide delivery address...
                        </p>
                      </div>
                    )}
                    
                    {selectedOrder.delivery_address && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 mb-2 flex items-center justify-center font-medium"
                      >
                        ✅ Mark as Delivered
                      </button>
                    )}
                  </div>
                )}

                {/* When delivered - Mark as completed */}
                {selectedOrder.status === 'delivered' && (
                  <div>
                    <div className="mb-3 p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-green-800">
                        ✅ Order delivered! Waiting for customer confirmation.
                      </p>
                    </div>
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                      className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center font-medium"
                    >
                      🎉 Mark as Completed
                    </button>
                  </div>
                )}

                {/* When completed - Show success */}
                {selectedOrder.status === 'completed' && (
                  <div className="p-4 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800 text-center font-medium">
                      🎉 Order completed successfully!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}