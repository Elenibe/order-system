'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  ShoppingBag, 
  Phone, 
  MapPin, 
  Building,
  Calendar,
  Search,
  Eye,
  X
} from 'lucide-react';

export default function VendorCustomers() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const session = getSession('vendor');
    
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    
    if (session.status !== 'approved') {
      router.push('/vendor/pending-approval');
      return;
    }
    
    setUserData(session);
    loadCustomers(session.id);
  }, [router]);

  const loadCustomers = async (vendorId) => {
    try {
      setLoading(true);
      
      // Get all orders for this vendor with customer details
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            telegram_id,
            full_name,
            company_name,
            phone_number,
            address,
            registration_type,
            tin_number,
            created_at
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Group orders by customer and calculate stats
      const customerMap = new Map();
      
      orders?.forEach(order => {
        if (!order.customers) return;
        
        const customerId = order.customers.id;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            ...order.customers,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: null,
            orders: []
          });
        }
        
        const customer = customerMap.get(customerId);
        customer.totalOrders += 1;
        customer.totalSpent += parseFloat(order.total_amount || 0);
        customer.orders.push(order);
        
        if (!customer.lastOrderDate || new Date(order.created_at) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = order.created_at;
        }
      });

      setCustomers(Array.from(customerMap.values()));
      setLoading(false);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const viewCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders(customer.orders);
    setShowModal(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.company_name?.toLowerCase().includes(searchLower) ||
      customer.phone_number?.includes(searchTerm) ||
      customer.address?.toLowerCase().includes(searchLower)
    );
  });

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Customers</h1>
            <p className="text-gray-600 mt-1">Manage and view your customer base</p>
          </div>
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-semibold">
            <Users className="inline w-5 h-5 mr-2" />
            {customers.length} Total Customers
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Customers</p>
                <p className="text-3xl font-bold mt-2">{customers.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-2">
                  {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
                </p>
              </div>
              <ShoppingBag className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  {customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)} Birr
                </p>
              </div>
              <ShoppingBag className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, company, phone, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <div>No customers found</div>
                      <div className="text-sm mt-1">
                        {searchTerm ? 'Try a different search term' : 'Customers will appear here once they place orders'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            {customer.registration_type === 'company' ? (
                              <Building className="w-5 h-5 text-purple-600" />
                            ) : (
                              <Users className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.full_name || customer.company_name}
                            </div>
                            {customer.registration_type === 'company' && customer.tin_number && (
                              <div className="text-xs text-gray-500">
                                TIN: {customer.tin_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {customer.phone_number || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start text-sm text-gray-600 max-w-xs">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{customer.address || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                          {customer.totalOrders}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.totalSpent.toFixed(2)} Birr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {customer.lastOrderDate 
                            ? new Date(customer.lastOrderDate).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => viewCustomerDetails(customer)}
                          className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
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

      {/* Customer Details Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCustomer.full_name || selectedCustomer.company_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {selectedCustomer.registration_type}
                    </p>
                  </div>
                  {selectedCustomer.registration_type === 'company' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Company Name</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedCustomer.company_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">TIN Number</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedCustomer.tin_number}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCustomer.phone_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCustomer.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer Since</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedCustomer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 font-medium">Total Orders</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 font-medium">Total Spent</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    {selectedCustomer.totalSpent.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Birr</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-600 font-medium">Avg Order Value</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">
                    {(selectedCustomer.totalSpent / selectedCustomer.totalOrders).toFixed(2)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Birr</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Order History</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {customerOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{order.order_number}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(order.created_at).toLocaleDateString()} at{' '}
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'payment_received' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'customer_accepted' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {order.total_amount && (
                            <p className="text-lg font-bold text-gray-900 mt-2">
                              {order.total_amount} Birr
                            </p>
                          )}
                        </div>
                      </div>
                      {order.product_description && (
                        <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mt-2">
                          {order.product_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}