import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Change this!
);

export async function GET(request, { params }) {
  try {
    const { orderId } = params;

    const { data: messages, error } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    await supabase
      .from('order_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('sender_type', 'customer')
      .eq('is_read', false);

    await supabase
      .from('orders')
      .update({ unread_vendor_messages: 0 })
      .eq('id', orderId);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}