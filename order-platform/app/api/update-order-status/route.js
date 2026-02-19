// app/api/update-order-status/route.js
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { orderId, newStatus, deliveryDate, notes } = await request.json();

    console.log('[STATUS UPDATE] Order:', orderId, 'New Status:', newStatus);

    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Add delivery date if provided
    if (deliveryDate) {
      updateData.estimated_delivery_date = deliveryDate;
    }

    // Add actual delivery date when marked as delivered
    if (newStatus === 'delivered') {
      updateData.actual_delivery_date = new Date().toISOString();
    }

    // Add vendor notes if provided
    if (notes) {
      updateData.vendor_notes = notes;
    }

    // Update order status
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*, customers(telegram_id, language)')
      .single();

    if (error) throw error;

    console.log('[STATUS UPDATE] Order updated successfully');

    // Send Telegram notification to customer
    const telegramId = order.customers?.telegram_id || order.telegram_id;
    const language = order.customers?.language || 'english';

    if (telegramId) {
      const messages = {
        payment_received: {
          english: `✅ Payment verified for Order #${order.order_number}\n\nYour order has been confirmed!`,
          amharic: `✅ ክፍያ ተረጋግጧል - ትዕዛዝ #${order.order_number}\n\nትዕዛዝዎ ተረጋግጧል!`
        },
        processing: {
          english: `⚙️ Order #${order.order_number} is now being processed!\n\nWe'll notify you when it's ready.`,
          amharic: `⚙️ ትዕዛዝ #${order.order_number} በሂደት ላይ ነው!\n\nዝግጁ ሲሆን እናሳውቅዎታለን።`
        },
        shipped: {
          english: `📦 Order #${order.order_number} is ready for delivery!\n\nPlease reply with your delivery details:\n\n📍 Full delivery address\n📱 Contact phone number\n🕐 Preferred delivery time\n\nJust type your address and we'll handle the rest!`,
          amharic: `📦 ትዕዛዝ #${order.order_number} ለማድረስ ዝግጁ ነው!\n\nእባክዎ የማድረሻ መረጃዎን ይላኩ:\n\n📍 ሙሉ የማድረሻ አድራሻ\n📱 የስልክ ቁጥር\n🕐 ተፈላጊ የማድረሻ ጊዜ\n\nአድራሻዎን ብቻ ይፃፉ!`
        },
        delivered: {
          english: `✅ Order #${order.order_number} has been delivered!\n\nPlease confirm you received your order.\n\nType /confirm_delivery_${orderId} to confirm.`,
          amharic: `✅ ትዕዛዝ #${order.order_number} ደርሷል!\n\nትዕዛዝዎን መቀበልዎን ያረጋግጡ።\n\nለማረጋገጥ /confirm_delivery_${orderId} ይተይቡ።`
        },
        completed: {
          english: `🎉 Order #${order.order_number} is complete!\n\nThank you for your business!\n\nWe hope to serve you again soon.`,
          amharic: `🎉 ትዕዛዝ #${order.order_number} ተጠናቋል!\n\nለንግድዎ እናመሰግናለን!\n\nድጋሚ እንድናገልግልዎ ተስፋ እናደርጋለን።`
        }
      };

      const message = messages[newStatus]?.[language];

      if (message) {
        console.log('[STATUS UPDATE] Sending notification to:', telegramId);

        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramId,
            text: message
          })
        });

        console.log('[STATUS UPDATE] Notification sent successfully');
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('[STATUS UPDATE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}