// components/DashboardLayout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Menu, X, Store, FileText, DollarSign, Bell, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { retrySupabaseQuery } from '@/lib/retryFetch';


export default function DashboardLayout({ children, userType = 'admin', userData }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  // Poll for notifications (vendor only)
// Poll for notifications
useEffect(() => {
  if (!userData?.id) return;
  
const fetchNotifications = async () => {
  try {
    if (userType === 'vendor') {
      // Try with retry first
      try {
        const ordersResult = await retrySupabaseQuery(() =>
          supabase
            .from('orders')
            .select('id')
            .eq('vendor_id', userData.id)
        );
        
        if (!ordersResult.data?.length) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        
        const orderIds = ordersResult.data.map(o => o.id);
        
        const messagesResult = await retrySupabaseQuery(() =>
          supabase
            .from('order_messages')
            .select(`
              id,
              message_text,
              sender_type,
              is_read,
              created_at,
              order_id,
              orders (
                id,
                order_number,
                vendor_id
              )
            `)
            .eq('sender_type', 'customer')
            .eq('is_read', false)
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
            .limit(10)
        );
        
        setNotifications(messagesResult.data || []);
        setUnreadCount(messagesResult.data?.length || 0);
        
      } catch (retryError) {
        // If retry fails, try direct (without retry)
        console.log('[Notifications] Retry failed, trying direct...');
        
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id')
          .eq('vendor_id', userData.id);
        
        if (!ordersData?.length) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        
        const orderIds = ordersData.map(o => o.id);
        
        const { data: messagesData } = await supabase
          .from('order_messages')
          .select(`
            id,
            message_text,
            sender_type,
            is_read,
            created_at,
            order_id,
            orders (
              id,
              order_number,
              vendor_id
            )
          `)
          .eq('sender_type', 'customer')
          .eq('is_read', false)
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setNotifications(messagesData || []);
        setUnreadCount(messagesData?.length || 0);
      }
      
    } else if (userType === 'admin') {
      // Admin logic (same pattern)
      try {
        const result = await retrySupabaseQuery(() =>
          supabase
            .from('admin_messages')
            .select(`
              id,
              message_text,
              sender_type,
              is_read,
              created_at,
              vendor_id,
              subject,
              vendors (
                id,
                company_name
              )
            `)
            .eq('sender_type', 'vendor')
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10)
        );
        
        setNotifications(result.data || []);
        setUnreadCount(result.data?.length || 0);
        
      } catch (retryError) {
        // Fallback to direct
        const { data } = await supabase
          .from('admin_messages')
          .select(`
            id,
            message_text,
            sender_type,
            is_read,
            created_at,
            vendor_id,
            subject,
            vendors (
              id,
              company_name
            )
          `)
          .eq('sender_type', 'vendor')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setNotifications(data || []);
        setUnreadCount(data?.length || 0);
      }
    }
  }  catch (retryError) {
  console.error('[v0] Admin notifications fetch failed:', retryError.message);
  // Silently fail and show empty state instead of crashing
  setNotifications([]);
  setUnreadCount(0);
}
};
  
  fetchNotifications();
  const interval = setInterval(fetchNotifications, 5000);
  return () => clearInterval(interval);
}, [userType, userData?.id]);



useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Network connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('❌ Network connection lost');
    };
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



  // Mark single notification as read
const markAsRead = async (messageId) => {
  const table = userType === 'admin' ? 'admin_messages' : 'order_messages';
  
  await supabase
    .from(table)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId);
  
  setNotifications(notifications.filter(n => n.id !== messageId));
  setUnreadCount(prev => Math.max(0, prev - 1));
};

  // Mark all as read
const markAllAsRead = async () => {
  const ids = notifications.map(n => n.id);
  if (ids.length === 0) return;
  
  const table = userType === 'admin' ? 'admin_messages' : 'order_messages';
  
  await supabase
    .from(table)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids);
  
  setNotifications([]);
  setUnreadCount(0);
};
  const handleLogout = () => {
    localStorage.removeItem(`${userType}_session`);
    router.push(userType === 'admin' ? '/admin/login' : '/vendor/login');
  };

  // Navigation items based on user type
  const adminNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Store, label: 'Vendors', href: '/admin/vendors' },
    { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
    { icon: Users, label: 'Customers', href: '/admin/customers' },
    { icon: Package, label: 'Products', href: '/admin/products' },
    { icon: DollarSign, label: 'Payments', href: '/admin/payments' },
    { icon: FileText, label: 'Reports', href: '/admin/reports' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
    { icon: MessageSquare, label: 'Vendor Support', href: '/admin/vendor-support' },
    { icon: CheckCircle, label: 'Change Requests', href: '/admin/change-requests' },
  ];

  const vendorNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/vendor/dashboard' },
    { icon: Package, label: 'My Products', href: '/vendor/products' },
    { icon: ShoppingCart, label: 'Orders', href: '/vendor/orders' },
    { icon: Users, label: 'Customers', href: '/vendor/customers' },
    { icon: DollarSign, label: 'Payments', href: '/vendor/payments' },
    { icon: DollarSign, label: 'Earnings', href: '/vendor/earnings' },
    { icon: Settings, label: 'Settings', href: '/vendor/settings' },
    { icon: MessageSquare, label: 'Contact Admin', href: '/vendor/contact-admin' },
  ];

  const navItems = userType === 'admin' ? adminNavItems : vendorNavItems;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              {/* Logo */}
              <div className="flex items-center">
                <Store className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {userType === 'admin' ? 'Admin Panel' : 'Vendor Dashboard'}
                </span>
              </div>
            </div>

            {/* Right side items */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
  <div className="p-4 text-center text-gray-500">
    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
    <p>No new notifications</p>
  </div>
) : (
  notifications.map((notif) => (
    <div
      key={notif.id}
      className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      onClick={() => {
        markAsRead(notif.id);
        setShowNotifications(false);
        if (userType === 'admin') {
          router.push('/admin/vendor-support');
        } else {
          router.push('/vendor/orders');
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {userType === 'admin' 
              ? `Message from ${notif.vendors?.company_name}`
              : `New message from customer`
            }
          </p>
          <p className="text-xs text-gray-600">
            {userType === 'admin' 
              ? notif.subject
              : `Order #${notif.orders?.order_number}`
            }
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            "{notif.message_text?.substring(0, 50)}{notif.message_text?.length > 50 ? '...' : ''}"
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  ))
)}
                    </div>
                    
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-gray-200">
                        <Link
                          href="/vendor/orders"
                          onClick={() => setShowNotifications(false)}
                          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all messages
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">
                    {userData?.full_name || userData?.company_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{userType}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {(userData?.full_name || userData?.company_name || 'U')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>


{/* NETWORK STATUS BANNER */}
      {/* ============================================ */}
      {!isOnline && (
        <div className="fixed top-16 left-0 right-0 bg-red-500 text-white text-center py-3 z-50 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <svg 
              className="h-5 w-5 animate-pulse" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
              />
            </svg>
            <span className="font-medium">
              ⚠️ No internet connection. Trying to reconnect...
            </span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-full bg-white border-r border-gray-200 w-64 transform transition-transform duration-200 ease-in-out z-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="mt-5 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors mt-4"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Close notifications when clicking outside */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </div>
  );
}