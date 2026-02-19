// lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Customer functions
async function getCustomer(telegramId) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching customer:', error);
    return null;
  }
  
  return data;
}

async function createCustomer(customerData) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
  
  return data;
}

async function updateCustomer(telegramId, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('telegram_id', telegramId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
  
  return data;
}

// Order functions
async function createOrder(orderData) {
  // Generate order number
  const { data: orderNumber } = await supabase.rpc('generate_order_number');
  
  const { data, error } = await supabase
    .from('orders')
    .insert([{ ...orderData, order_number: orderNumber || `ORD-${Date.now()}` }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating order:', error);
    throw error;
  }
  
  return data;
}

async function getCustomerOrders(telegramId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      vendors(company_name, phone_number),
      order_files(*)
    `)
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  
  return data;
}

async function getOrder(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      vendors(company_name, phone_number),
      order_files(*)
    `)
    .eq('id', orderId)
    .single();
  
  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }
  
  return data;
}

async function updateOrder(orderId, updates) {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating order:', error);
    throw error;
  }
  
  return data;
}

// Add order file
async function addOrderFile(fileData) {
  const { data, error } = await supabase
    .from('order_files')
    .insert([fileData])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding order file:', error);
    throw error;
  }
  
  return data;
}

// Get categories
async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data;
}

// Get payment accounts
async function getPaymentAccounts(vendorId) {
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching payment accounts:', error);
    return [];
  }
  
  return data;
}

// Get quotes for an order
async function getOrderQuotes(orderId) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, vendors(company_name, rating, phone_number)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
  
  return data;
}

// Accept a quote
async function acceptQuote(quoteId, orderId) {
  // Update quote status
  await supabase
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId);
  
  // Get quote details
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, vendors(id)')
    .eq('id', quoteId)
    .single();
  
  if (quote) {
    // Update order
    await supabase
      .from('orders')
      .update({
        vendor_id: quote.vendors.id,
        total_amount: quote.quoted_price,
        commission_amount: quote.quoted_price * 0.10, // 10% commission
        vendor_amount: quote.quoted_price * 0.90,
        status: 'customer_accepted'
      })
      .eq('id', orderId);
  }
}


async function createMessage(messageData) {
  const { data, error } = await supabase
    .from('order_messages')
    .insert([messageData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating message:', error);
    throw error;
  }
  
  return data;
}

async function getOrderMessages(orderId) {
  const { data, error } = await supabase
    .from('order_messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return data;
}

async function markMessagesAsRead(orderId, senderType) {
  // Mark all messages from the opposite sender as read
  const { error } = await supabase
    .from('order_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('sender_type', senderType)
    .eq('is_read', false);
  
  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }

  // Reset unread count
  const column = senderType === 'customer' ? 'unread_vendor_messages' : 'unread_customer_messages';
  await supabase
    .from('orders')
    .update({ [column]: 0 })
    .eq('id', orderId);
}

async function getUnreadMessageCount(orderId, forSender) {
  const column = forSender === 'customer' ? 'unread_customer_messages' : 'unread_vendor_messages';
  
  const { data, error } = await supabase
    .from('orders')
    .select(column)
    .eq('id', orderId)
    .single();
  
  if (error) return 0;
  return data[column] || 0;
}

// Get orders with message counts for vendor
async function getVendorOrdersWithMessages(vendorId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers(full_name, company_name, phone_number),
      unread_vendor_messages
    `)
    .or(`vendor_id.eq.${vendorId},vendor_id.is.null`)
    .in('status', ['pending_quote', 'quoted', 'customer_accepted'])
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching vendor orders:', error);
    return { data: [], error };
  }
  
  return { data, error: null };
}


// Vendor lookup by deep link
async function getVendorByDeepLink(deepLink) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('bot_deep_link', deepLink)
    .eq('status', 'approved')
    .single();
  
  if (error) {
    console.error('Error fetching vendor by deep link:', error);
    return null;
  }
  
  return data;
}

// Get vendor's business category details
async function getVendorCategory(vendorId) {
  const { data, error } = await supabase
    .from('vendors')
    .select('business_category, business_categories(*)')
    .eq('id', vendorId)
    .single();
  
  if (error) {
    console.error('Error fetching vendor category:', error);
    return null;
  }
  
  return data;
}

// Create order with vendor assignment
async function createOrderForVendor(orderData, vendorId) {
  // Generate order number
  const { data: orderNumber } = await supabase.rpc('generate_order_number');
  
  const { data, error } = await supabase
    .from('orders')
    .insert([{ 
      ...orderData, 
      order_number: orderNumber || `ORD-${Date.now()}`,
      vendor_id: vendorId, // Assign to specific vendor immediately
      status: 'pending_submission'
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating order:', error);
    throw error;
  }
  
  return data;
}

module.exports = {
  supabase,
  getCustomer,
  createCustomer,
  updateCustomer,
  createOrder,
  getCustomerOrders,
  getOrder,
  updateOrder,
  addOrderFile,
  getCategories,
  getPaymentAccounts,
  getOrderQuotes,
  acceptQuote,
  createMessage,
  getOrderMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  getVendorOrdersWithMessages,
  getVendorByDeepLink,
  getVendorCategory,
  createOrderForVendor

};