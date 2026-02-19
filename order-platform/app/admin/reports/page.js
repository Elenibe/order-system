// app/admin/reports/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, ShoppingCart, Users, Download, Calendar } from 'lucide-react';

export default function AdminReports() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
    topVendors: [],
    revenueByMonth: [],
    ordersByStatus: {}
  });

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setUserData(session);
    loadReports();
  }, [router, dateRange]);

  const loadReports = async () => {
    setLoading(true);

    // Get date filter
    let dateFilter = null;
    const now = new Date();
    if (dateRange === 'today') {
      dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else if (dateRange === 'week') {
      dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString();
    } else if (dateRange === 'month') {
      dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }

    // Fetch orders
    let query = supabase
      .from('orders')
      .select('*, vendors(company_name, id)');
    
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: orders } = await query;

    if (orders) {
      // Calculate stats
      const totalRevenue = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const totalCommission = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.commission_amount || 0), 0);

      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

      const averageOrderValue = orders.length > 0 
        ? orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / orders.length 
        : 0;

      // Top vendors by revenue
      const vendorRevenue = {};
      orders.forEach(o => {
        if (o.vendor_id && o.vendor_amount) {
          if (!vendorRevenue[o.vendor_id]) {
            vendorRevenue[o.vendor_id] = {
              name: o.vendors?.company_name || 'Unknown',
              revenue: 0,
              orders: 0
            };
          }
          vendorRevenue[o.vendor_id].revenue += o.vendor_amount;
          vendorRevenue[o.vendor_id].orders += 1;
        }
      });

      const topVendors = Object.values(vendorRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Orders by status
      const ordersByStatus = {};
      orders.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      });

      // Revenue by month (last 6 months)
      const revenueByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });

        revenueByMonth.push({
          month: monthStart.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
          revenue: monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          orders: monthOrders.length
        });
      }

      setStats({
        totalRevenue,
        totalCommission,
        totalOrders: orders.length,
        completedOrders,
        cancelledOrders,
        averageOrderValue,
        topVendors,
        revenueByMonth,
        ordersByStatus
      });
    }

    setLoading(false);
  };

  const exportReport = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `${stats.totalRevenue} Birr`],
      ['Total Commission', `${stats.totalCommission} Birr`],
      ['Total Orders', stats.totalOrders],
      ['Completed Orders', stats.completedOrders],
      ['Cancelled Orders', stats.cancelledOrders],
      ['Average Order Value', `${stats.averageOrderValue.toFixed(2)} Birr`],
      [],
      ['Top Vendors by Revenue'],
      ['Vendor', 'Revenue', 'Orders'],
      ...stats.topVendors.map(v => [v.name, v.revenue, v.orders])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
          </div>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
            <div className="flex gap-2 ml-4">
              {['all', 'today', 'week', 'month'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize text-sm ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-100 mt-1">Birr</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Commission Earned</p>
                <p className="text-3xl font-bold mt-1">{stats.totalCommission.toLocaleString()}</p>
                <p className="text-sm text-blue-100 mt-1">Birr</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Orders</p>
                <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
                <p className="text-sm text-purple-100 mt-1">{stats.completedOrders} completed</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-purple-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Avg Order Value</p>
                <p className="text-3xl font-bold mt-1">{stats.averageOrderValue.toFixed(0)}</p>
                <p className="text-sm text-orange-100 mt-1">Birr</p>
              </div>
              <DollarSign className="h-12 w-12 text-orange-100" />
            </div>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          <div className="space-y-3">
            {stats.revenueByMonth.map((month, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-24 text-sm text-gray-600">{month.month}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                  <div
                    className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                    style={{
                      width: `${Math.min((month.revenue / Math.max(...stats.revenueByMonth.map(m => m.revenue))) * 100, 100)}%`
                    }}
                  >
                    {month.revenue.toLocaleString()} Birr
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-gray-600 ml-3">
                  {month.orders} orders
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors & Order Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Vendors */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Vendors by Revenue</h2>
            <div className="space-y-3">
              {stats.topVendors.map((vendor, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{vendor.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Birr</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders by Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Orders by Status</h2>
            <div className="space-y-3">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.totalOrders) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-300 text-sm">Success Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Cancellation Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Commission Rate</p>
              <p className="text-2xl font-bold">
                {stats.totalRevenue > 0 ? ((stats.totalCommission / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Total Vendors</p>
              <p className="text-2xl font-bold">{stats.topVendors.length}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}