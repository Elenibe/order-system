import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Change this!
);

export async function POST(request) {
  try {
    const { orderId, vendorId, message } = await request.json();

    if (!orderId || !vendorId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Save message to database
    const { data: savedMessage, error: messageError } = await supabase
      .from('order_messages')
      .insert([{
        order_id: orderId,
        sender_type: 'vendor',
        sender_id: vendorId,
        telegram_id: order.telegram_id,
        message_text: message,
        message_type: 'question',
        is_read: false
      }])
      .select()
      .single();

    if (messageError) throw messageError;

    // Update customer state
    await supabase
      .from('customers')
      .update({ state: 'answering_vendor_question' })
      .eq('telegram_id', order.telegram_id);

    // ⚠️ THIS IS THE PROBLEM - We need to send to the bot!
    // For now, just save to DB and the bot will send via the sendVendorQuestionToCustomer function
    
    return NextResponse.json({ success: true, message: savedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}