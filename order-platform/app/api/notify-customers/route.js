// app/api/notify-customers/route.js
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, productCode, productName } = body;

    console.log('[NOTIFY] Notifying customers for product:', productCode);

    // Get customers waiting for this product
    const { data: waitlistCustomers, error: fetchError } = await supabase
      .from('product_waitlist')
      .select('id, customer_id, product_code')
      .eq('product_id', productId)
      .eq('notified', false);

    if (fetchError) {
      console.error('[NOTIFY] Database error:', fetchError);
      return Response.json({ error: 'Failed to fetch waitlist', notified: 0 }, { status: 500 });
    }

    console.log('[NOTIFY] Found', waitlistCustomers?.length || 0, 'customers waiting');

    if (!waitlistCustomers || waitlistCustomers.length === 0) {
      return Response.json({ notified: 0 });
    }

    let notificationCount = 0;
    const waitlistIdsToDelete = [];

    for (const waitlist of waitlistCustomers) {
      try {
        // customer_id is the Telegram ID (stored as TEXT)
        const telegramId = waitlist.customer_id;
        
        console.log('[NOTIFY] Processing customer telegram_id:', telegramId);

        // Get customer info (optional, just for language preference)
        const { data: customer } = await supabase
          .from('customers')
          .select('language')
          .eq('telegram_id', telegramId)
          .single();

        // Prepare notification message
        const message = customer?.language === 'amharic'
          ? `🎉 ጥሩ ዜና!\n\n"${productName}" (ኮድ: ${productCode}) ዳግም በእቃ ውስጥ ገብቷል!\n\n/order በመጻፍ አሁን ይዘዙ።`
          : `🎉 Good news!\n\n"${productName}" (Code: ${productCode}) is back in stock!\n\nType /order to place an order now.`;

        console.log('[NOTIFY] Sending to telegram_id:', telegramId);

        // Send Telegram notification
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: message
            })
          }
        );

        const telegramResult = await telegramResponse.json();

        if (telegramResponse.ok && telegramResult.ok) {
          // SUCCESS - Add to delete list
          waitlistIdsToDelete.push(waitlist.id);
          notificationCount++;
          console.log('[NOTIFY] ✅ Notified:', telegramId);
        } else {
          console.error('[NOTIFY] ❌ Telegram error for', telegramId, ':', telegramResult);
        }
      } catch (err) {
        console.error('[NOTIFY] Error processing customer:', err);
      }
    }

    // DELETE all successfully notified customers from waitlist
    if (waitlistIdsToDelete.length > 0) {
      console.log('[NOTIFY] Removing', waitlistIdsToDelete.length, 'customers from waitlist');
      
      const { error: deleteError } = await supabase
        .from('product_waitlist')
        .delete()
        .in('id', waitlistIdsToDelete);

      if (deleteError) {
        console.error('[NOTIFY] Error deleting from waitlist:', deleteError);
      } else {
        console.log('[NOTIFY] ✅ Removed customers from waitlist');
      }
    }

    console.log('[NOTIFY] Complete. Notified:', notificationCount);
    return Response.json({ notified: notificationCount });
  } catch (error) {
    console.error('[NOTIFY] Error:', error);
    return Response.json({ error: error.message, notified: 0 }, { status: 500 });
  }
}