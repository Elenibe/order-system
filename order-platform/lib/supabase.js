// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// ============================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================

// Validate that required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ MISSING: NEXT_PUBLIC_SUPABASE_URL');
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured in environment variables');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ MISSING: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured in environment variables');
}

// Validate URL format
try {
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch (e) {
  console.error('❌ INVALID URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  throw new Error(`Invalid SUPABASE_URL format: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
}

console.log('✅ [Supabase] Environment variables validated');
console.log('✅ [Supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Client-side Supabase client (for browser)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side Supabase client (with service role - full access)
// This needs to use createClient separately for server-side
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error) {
  console.error('Supabase error:', error);
  return {
    error: error.message || 'An error occurred',
    details: error
  };
}

// Vendor functions
export async function getVendorByEmail(email) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function createVendor(vendorData) {
  const { data, error } = await supabase
    .from('vendors')
    .insert([vendorData])
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function updateVendor(vendorId, updates) {
  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', vendorId)
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function getAllVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { data };
}

// Product functions
export async function getVendorProducts(vendorId) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name_en, name_am)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { data };
}

export async function createProduct(productData) {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function updateProduct(productId, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  
  if (error) return { error: error.message };
  return { success: true };
}

export async function getVendorOrders(vendorId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers(full_name, phone_number, company_name),
        order_items(*),
        order_files(*)
      `)
      .order('created_at', { ascending: false });
    
    console.log('Supabase response:', { data, error }); // Debug
    
    if (error) {
      console.error('Error fetching orders:', error);
      return { data: [], error: error.message };
    }
    
    return { data: data || [] };
  } catch (err) {
    console.error('Exception in getVendorOrders:', err);
    return { data: [], error: err.message };
  }
}
export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers(full_name, phone_number, company_name),
      vendors(company_name),
      order_items(*),
      order_files(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { data };
}

export async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers(full_name, phone_number, company_name, address),
      vendors(company_name, phone_number),
      order_items(*),
      order_files(*)
    `)
    .eq('id', orderId)
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function updateOrder(orderId, updates) {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

// Quote functions
export async function createQuote(quoteData) {
  const { data, error } = await supabase
    .from('quotes')
    .insert([quoteData])
    .select()
    .single();
  
  if (error) return { error: error.message };
  return { data };
}

export async function getOrderQuotes(orderId) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, vendors(company_name, rating)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { data };
}

// Category functions
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) return { error: error.message };
  return { data };
}

// Payment accounts
export async function getPaymentAccounts() {
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) return { error: error.message };
  return { data };
}

// Dashboard statistics
export async function getDashboardStats() {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount, commission_amount, status');
  
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('status');
  
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id');
  
  if (ordersError || vendorsError || customersError) {
    return { error: 'Error fetching stats' };
  }
  
  const totalRevenue = orders?.reduce((sum, order) => 
    sum + (parseFloat(order.total_amount) || 0), 0) || 0;
  
  const totalCommission = orders?.reduce((sum, order) => 
    sum + (parseFloat(order.commission_amount) || 0), 0) || 0;
  
  const activeVendors = vendors?.filter(v => v.status === 'approved').length || 0;
  const pendingVendors = vendors?.filter(v => v.status === 'pending').length || 0;
  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const totalCustomers = customers?.length || 0;
  
  return {
    data: {
      totalRevenue,
      totalCommission,
      activeVendors,
      pendingVendors,
      totalOrders,
      completedOrders,
      totalCustomers
    }
  };
}

export async function getVendorStats(vendorId) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('vendor_amount, status, customer_rating')
    .eq('vendor_id', vendorId);
  
  if (error) return { error: error.message };
  
  const totalEarnings = orders?.reduce((sum, order) => 
    sum + (parseFloat(order.vendor_amount) || 0), 0) || 0;
  
  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const pendingOrders = orders?.filter(o => 
    ['pending_quote', 'quoted', 'payment_pending'].includes(o.status)).length || 0;
  
  const ratings = orders?.filter(o => o.customer_rating).map(o => o.customer_rating) || [];
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : 0;
  
  return {
    data: {
      totalEarnings,
      totalOrders,
      completedOrders,
      pendingOrders,
      averageRating
    }
  };
}