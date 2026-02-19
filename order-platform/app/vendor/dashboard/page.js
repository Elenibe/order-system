'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { getSession } from '@/lib/auth';
import { getVendorOrders } from '@/lib/supabase';
import { 
  DollarSign, 
  ShoppingCart, 
  Star,
  Clock
} from 'lucide-react';

export default function VendorDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const session = getSession('vendor');
    console.log('Session:', session);
    
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    
    if (session.status !== 'approved') {
      router.push('/vendor/pending-approval');
      return;
    }
    
    setUserData(session);
    loadOrders(session.id);
  }, [router]);

const loadOrders = async (vendorId) => {
    try {
        console.log('Loading orders for vendor:', vendorId);
        
        if (!vendorId) {
            console.log('No vendor ID provided');
            setRecentOrders([]);
            setLoading(false);
            return;
        }
        
        const result = await getVendorOrders(vendorId);
        console.log('Got result:', result);
        
        if (result && result.error) {
            console.error('Error from getVendorOrders:', result.error.message || result.error);
            setError(result.error.message || 'Failed to load orders');
            setRecentOrders([]);
        } else if (result && result.data) {
            const vendorOrders = result.data.filter(order => order.vendor_id === vendorId); // Filter for specific vendor
            console.log('Setting orders:', vendorOrders.length, 'orders');
            setRecentOrders(vendorOrders);
            setError(null);
        } else {
            console.log('No data in result');
            setRecentOrders([]);
        }
    } catch (err) {
        console.error('Exception loading orders:', err.message || err);
        setError(err.message || 'An error occurred');
        setRecentOrders([]);
    } finally {
        setLoading(false);
    }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {userData?.company_name}!</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="New Requests"
            value={recentOrders.filter(o => !o.vendor_id).length}
            icon={Clock}
            color="yellow"
            subtext="Need your quote"
          />
          <StatsCard
            title="Total Orders"
            value={recentOrders.length}
            icon={ShoppingCart}
            color="blue"
            subtext="All orders"
          />
          <StatsCard
            title="Earnings"
            value="0 Birr"
            icon={DollarSign}
            color="green"
            subtext="Coming soon"
          />
          <StatsCard
            title="Rating"
            value="5.0"
            icon={Star}
            color="purple"
            subtext="Coming soon"
          />
        </div>

        {/* ✅ ADD THIS DEEP LINK SECTION HERE - RIGHT AFTER THE STATS GRID */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-2">📱 Your Order Link</h2>
          <p className="text-purple-100 text-sm mb-4">
            Share this link with your customers to receive orders directly
          </p>
          
          {userData?.bot_deep_link ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <code className="text-base sm:text-lg font-mono break-all">
                  t.me/Teq2Bot?start={userData.bot_deep_link}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://t.me/Teq2Bot?start=${userData.bot_deep_link}`);
                    alert('✅ Link copied to clipboard!');
                  }}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 font-medium transition-colors whitespace-nowrap"
                >
                  📋 Copy Link
                </button>
              </div>
              <p className="text-xs text-purple-200 mt-3">
                💡 Share on social media, print on receipts, or send to customers via WhatsApp
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4">
              <p className="text-yellow-100">
                ⚠️ Your deep link is being set up. Contact admin if this persists.
              </p>
            </div>
          )}
        </div>
        {/* ✅ DEEP LINK SECTION ENDS HERE */}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Orders ({recentOrders.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div>No orders found</div>
                      <div className="text-sm mt-2">Orders from your deep link will appear here</div>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.customers?.full_name || order.customers?.company_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {order.product_description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          !order.vendor_id ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {!order.vendor_id ? '🆕 NEW' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                              onClick={() => router.push('/vendor/orders')} // Redirect to /vendor/orders
                              className="text-blue-600 hover:text-blue-700 font-medium"
                             >
                              {!order.vendor_id ? 'Send Quote' : 'View'}
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
    </DashboardLayout>
  );
}