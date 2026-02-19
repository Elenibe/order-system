// app/admin/dashboard/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getAllOrders } from '@/lib/supabase';
import { 
  DollarSign, 
  ShoppingCart, 
  Store, 
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    const statsResult = await getDashboardStats();
    if (statsResult.data) {
      setStats(statsResult.data);
    }

    const ordersResult = await getAllOrders();
    if (ordersResult.data) {
      setRecentOrders(ordersResult.data.slice(0, 10));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending_quote': 'bg-yellow-100 text-yellow-800',
      'quoted': 'bg-blue-100 text-blue-800',
      'customer_accepted': 'bg-purple-100 text-purple-800',
      'payment_pending': 'bg-orange-100 text-orange-800',
      'payment_received': 'bg-green-100 text-green-800',
      'processing': 'bg-indigo-100 text-indigo-800',
      'shipped': 'bg-cyan-100 text-cyan-800',
      'delivered': 'bg-emerald-100 text-emerald-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'disputed': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout userType="admin" userData={userData}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value={`${stats?.totalRevenue?.toLocaleString() || 0} Birr`}
            icon={DollarSign}
            color="green"
            subtext="All time"
          />
          <StatsCard
            title="Commission Earned"
            value={`${stats?.totalCommission?.toLocaleString() || 0} Birr`}
            icon={TrendingUp}
            color="blue"
            subtext="Platform earnings"
          />
          <StatsCard
            title="Active Vendors"
            value={stats?.activeVendors || 0}
            icon={Store}
            color="purple"
            subtext={`${stats?.pendingVendors || 0} pending approval`}
          />
          <StatsCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            icon={ShoppingCart}
            color="indigo"
            subtext={`${stats?.completedOrders || 0} completed`}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/vendors')}
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <Store className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Manage Vendors</h3>
              <p className="text-sm text-gray-600">Approve or manage vendor accounts</p>
            </button>
            <button
              onClick={() => router.push('/admin/orders')}
              className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left"
            >
              <ShoppingCart className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Orders</h3>
              <p className="text-sm text-gray-600">Monitor all platform orders</p>
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
            >
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-600">Analytics and financial reports</p>
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              <button
                onClick={() => router.push('/admin/orders')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>
          </div>
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
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.total_amount ? `${order.total_amount} Birr` : 'Pending'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}