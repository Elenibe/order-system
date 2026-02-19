// lib/bot.js
const { Telegraf, Markup } = require('telegraf');
const {
  supabase,
  getCustomer,
  createCustomer,
  updateCustomer,
  createOrder,
  getCustomerOrders,
  getOrder,
  updateOrder,
  addOrderFile,
  getPaymentAccounts,
  getOrderQuotes,
  acceptQuote,
  createMessage,
  getOrderMessages,
  markMessagesAsRead,
  getUnreadMessageCount
} = require('./supabase');
const { getMessage } = require('./messages');
const customerAnsweringOrder = {};

const customerMessagingVendor = {};

// ADD THESE TWO FUNCTIONS TO YOUR bot.js

// Function to get vendor by deep link
async function getVendorByDeepLink(deepLink) {
  try {
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
  } catch (error) {
    console.error('Error in getVendorByDeepLink:', error);
    return null;
  }
}

// Function to create order for specific vendor
async function createOrderForVendor(orderData, vendorId) {
  let orderNumber;
  let retries = 0;
  const maxRetries = 5;
  
  while (retries < maxRetries) {
    try {
      // Generate unique order number with timestamp + random
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      orderNumber = `ORD-${dateStr}-${randomNum}`;
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{ 
          ...orderData, 
          vendor_id: vendorId,
          order_number: orderNumber,
          status: 'pending_submission'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
      
    } catch (error) {
      // If duplicate key error, retry with different random number
      if (error.code === '23505' && retries < maxRetries - 1) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
        continue;
      }
      console.error('Error creating order for vendor:', error);
      throw error;
    }
  }
}
const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    agent: null,
    webhookReply: false,
  },
  handlerTimeout: 90000 // 90 seconds timeout
});

// Store current order IDs per user
const userCurrentOrders = {};



function getCategoryQuestions(category) {
  const templates = {
    retail: {
      steps: ['product_name', 'size', 'color', 'quantity', 'photo_optional'],
      questions: {
        product_name: {
          english: 'What product are you looking for?\n(e.g., Nike Air Max shoes, Samsung phone, Levi\'s jeans)',
          amharic: 'ምን ምርት ይፈልጋሉ?\n(ለምሳሌ፡ Nike Air Max ጫማ፣ Samsung ስልክ፣ Levi\'s ሱሪ)'
        },
        size: {
          english: 'What size do you need?\n(e.g., 42, Large, XL)',
          amharic: 'ምን መጠን ይፈልጋሉ?\n(ለምሳሌ፡ 42, ትልቅ, XL)'
        },
        color: {
          english: 'What color would you like?\n(e.g., Black, Red, Blue)',
          amharic: 'ምን ቀለም ይፈልጋሉ?\n(ለምሳሌ፡ ጥቁር፣ ቀይ፣ ሰማያዊ)'
        },
        quantity: {
          english: 'How many do you need?',
          amharic: 'ስንት ይፈልጋሉ?'
        },
        photo_optional: {
          english: '📸 Do you have a photo of what you want?\n\nSend a photo or type "skip" to continue.',
          amharic: '📸 የሚፈልጉትን ምስል አላቸው?\n\nምስል ይላኩ ወይም "skip" ብለው ይቀጥሉ።'
        }
      }
    },
    food: {
      steps: ['items', 'quantity', 'special_requests', 'delivery_time'],
      questions: {
        items: {
          english: 'What would you like to order?\n(e.g., 2 pizzas, 1 burger)',
          amharic: 'ምን ማዘዝ ይፈልጋሉ?\n(ለምሳሌ፡ 2 ፒዛ፣ 1 በርገር)'
        },
        quantity: {
          english: 'How many people is this for?',
          amharic: 'ለስንት ሰው ነው?'
        },
        special_requests: {
          english: 'Any special requests? (allergies, extra toppings, etc.)\nType "none" if no special requests.',
          amharic: 'ልዩ ጥያቄ አለዎት? (አለርጂ፣ ተጨማሪ ቅመም፣ ወዘተ)\n"none" ብለው ይፃፉ ከሌለ።'
        },
        delivery_time: {
          english: 'When do you need it delivered?\n(e.g., ASAP, 6:00 PM, Tomorrow)',
          amharic: 'መቼ መድረስ አለበት?\n(ለምሳሌ፡ አሁን፣ ከሰዓት 6፣ ነገ)'
        }
      }
    },
    construction: {
      steps: ['material_type', 'quantity', 'dimensions', 'delivery_location'],
      questions: {
        material_type: {
          english: 'What material do you need?\n(e.g., Cement, Bricks, Steel rods)',
          amharic: 'ምን ቁሳቁስ ይፈልጋሉ?\n(ለምሳሌ፡ ሲሚንቶ፣ ጡብ፣ ብረት)'
        },
        quantity: {
          english: 'How much do you need?\n(e.g., 10 bags, 1000 pieces, 5 tons)',
          amharic: 'ስንት ይፈልጋሉ?\n(ለምሳሌ፡ 10 ከረጢት፣ 1000 ቁርጥራጭ፣ 5 ቶን)'
        },
        dimensions: {
          english: 'Any specific dimensions or specifications?\nType "standard" if standard size is fine.',
          amharic: 'ልዩ መጠን ወይም መግለጫ አለ?\n"standard" ብለው ይፃፉ መደበኛ መጠን ከሆነ።'
        },
        delivery_location: {
          english: 'Where should we deliver?\n(Provide specific location/site address)',
          amharic: 'የት ማድረስ አለብን?\n(ልዩ ቦታ/የስራ ቦታ አድራሻ ይስጡ)'
        }
      }
    },
    general: {
      steps: ['description', 'photo_optional'],
      questions: {
        description: {
          english: '📝 Please describe what you need:\n\nYou can send:\n• Text description\n• Photos\n• Voice messages\n• Documents\n\nWhen done, send /submit',
          amharic: '📝 እባክዎ የሚፈልጉትን ይግለጹ:\n\nመላክ ይችላሉ:\n• ፅሁፍ መግለጫ\n• ምስሎች\n• የድምጽ መልዕክቶች\n• ሰነዶች\n\nሲጨርሱ /submit ይላኩ'
        }
      }
    },
manufacturing: {
  steps: ['description', 'materials', 'specifications', 'quantity', 'drawings_optional'],
  questions: {
    description: {
      english: '📝 What do you need manufactured?\n\nDescribe the product or parts you need.\n\n(e.g., "Hydraulic fittings for construction equipment")',
      amharic: '📝 ምን መስራት ይፈልጋሉ?\n\nየሚፈልጉትን ምርት ወይም ክፍል ይግለጹ።\n\n(ለምሳሌ: "ለግንባታ መሳሪያዎች የሃይድሮሊክ ማያያዣዎች")'
    },
    materials: {
      english: '🔩 What materials should be used?\n\n(e.g., "Stainless steel", "Aluminum", "Plastic", "As per drawing")',
      amharic: '🔩 ምን ዓይነት ቁሳቁስ ጥቅም ላይ መዋል አለበት?\n\n(ለምሳሌ: "የማይዝግ ብረት", "አሉሚኒየም", "ፕላስቲክ")'
    },
    specifications: {
      english: '📐 Any specific dimensions or technical specifications?\n\n(e.g., "Diameter: 25mm, Thread: M20x1.5, Pressure rating: 350 bar")\n\nOr type "see drawing" if you\'ll send technical drawings.',
      amharic: '📐 ልዩ መጠኖች ወይም ቴክኒካል መግለጫዎች?\n\n(ለምሳሌ: "ዲያሜትር: 25ሚሜ, ክር: M20x1.5")\n\nወይም "ንድፍ ይመልከቱ" ብለው ይፃፉ።'
    },
    quantity: {
      english: '🔢 How many units do you need?\n\n(Enter number only, e.g., 1000)',
      amharic: '🔢 ስንት ቁጥር ይፈልጋሉ?\n\n(ቁጥር ብቻ ያስገቡ፣ ለምሳሌ: 1000)'
    },
    drawings_optional: {
      english: '📎 Do you have technical drawings, blueprints, or reference photos?\n\n📸 Send files now, or type "skip" to continue.\n\n(You can send multiple files)',
      amharic: '📎 ቴክኒካል ንድፎች፣ ብሉፕሪንቶች ወይም የማጣቀሻ ፎቶዎች አሉዎት?\n\n📸 አሁን ፋይሎች ይላኩ፣ ወይም "skip" ብለው ይቀጥሉ።'
    }
  }
}
  };

  return templates[category] || templates.general;
}

// Get customer's orders with assigned vendor
async function getCustomerOrdersWithVendor(telegramId, vendorId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at')
      .eq('telegram_id', telegramId)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error in getCustomerOrdersWithVendor:', error);
    return [];
  }
}

// Notify vendor of new customer message
async function notifyVendorOfCustomerMessage(vendorId, orderId) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, unread_vendor_messages')
      .eq('id', orderId)
      .single();

    const currentUnread = order?.unread_vendor_messages || 0;
    await supabase
      .from('orders')
      .update({ unread_vendor_messages: currentUnread + 1 })
      .eq('id', orderId);

    console.log(`✅ Vendor notified of message for order #${order?.order_number}`);
  } catch (error) {
    console.error('Error notifying vendor:', error);
  }
}
// Function to get product by code
// Function to get product by code
async function getProductByCode(vendorId, productCode) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('product_code', productCode.toUpperCase())
      .eq('is_active', true)
      .single();
    
    if (error) return null;
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Add to waitlist function
async function addToWaitlist(customerId, productId, productCode) {
  try {
    const { error } = await supabase
      .from('product_waitlist')
      .insert([{
        customer_id: customerId,
        product_id: productId,
        product_code: productCode,
        notified: false
      }]);
    
    if (error) {
      // Check if it's a duplicate key error (customer already in waitlist)
      if (error.code === '23505' || error.message.includes('duplicate')) {
        return { success: false, reason: 'already_in_waitlist' };
      }
      throw error;
    }
    return { success: true, reason: 'added' };
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return { success: false, reason: 'error', error };
  }
}



// Check if vendor uses product catalog
async function vendorUsesProductCatalog(vendorId) {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('use_product_catalog')
      .eq('id', vendorId)
      .single();
    
    if (error) return false;
    return data?.use_product_catalog || false;
  } catch (error) {
    return false;
  }
}


// REPLACE the notifyWaitlistCustomers function in lib/bot.js with this:

async function notifyWaitlistCustomers(productId, productName, vendorId) {
  try {
    console.log('[WAITLIST] Notifying customers for product:', productId);

    // Get all customers waiting for this product
    const { data: waitlistCustomers, error: fetchError } = await supabase
      .from('product_waitlist')
      .select('id, customer_id, product_code')
      .eq('product_id', productId)
      .eq('notified', false);

    if (fetchError) {
      console.error('[WAITLIST] Error fetching waitlist:', fetchError);
      return { success: false, notified: 0, error: fetchError };
    }

    console.log('[WAITLIST] Found', waitlistCustomers?.length || 0, 'customers waiting');

    if (!waitlistCustomers || waitlistCustomers.length === 0) {
      return { success: true, notified: 0 };
    }

    let notificationCount = 0;
    const waitlistIdsToDelete = [];

    for (const waitlist of waitlistCustomers) {
      try {
        // customer_id is the Telegram ID
        const telegramId = waitlist.customer_id;
        
        console.log('[WAITLIST] Processing telegram_id:', telegramId);

        // Get customer language preference (optional)
        const { data: customer } = await supabase
          .from('customers')
          .select('language')
          .eq('telegram_id', telegramId)
          .single();

        // Prepare message
        const message = customer?.language === 'amharic'
          ? `🎉 ጥሩ ዜና!\n\n"${productName}" (ኮድ: ${waitlist.product_code}) ዳግም ወደ ክምችት ገብቷል!\n\n/order በመጻፍ አሁን ይዘዙ።`
          : `🎉 Good news!\n\n"${productName}" (Code: ${waitlist.product_code}) is back in stock!\n\nType /order to place an order now.`;

        console.log('[WAITLIST] Sending to telegram_id:', telegramId);

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

        const result = await telegramResponse.json();

        if (telegramResponse.ok && result.ok) {
          // Add to delete list
          waitlistIdsToDelete.push(waitlist.id);
          notificationCount++;
          console.log('[WAITLIST] ✅ Notified:', telegramId);
        } else {
          console.error('[WAITLIST] ❌ Telegram error:', result);
        }
      } catch (err) {
        console.error('[WAITLIST] Error processing customer:', err);
      }
    }

    // DELETE all successfully notified customers from waitlist
    if (waitlistIdsToDelete.length > 0) {
      console.log('[WAITLIST] Removing', waitlistIdsToDelete.length, 'from waitlist');
      
      const { error: deleteError } = await supabase
        .from('product_waitlist')
        .delete()
        .in('id', waitlistIdsToDelete);

      if (deleteError) {
        console.error('[WAITLIST] Delete error:', deleteError);
      } else {
        console.log('[WAITLIST] ✅ Removed from waitlist');
      }
    }

    return { success: true, notified: notificationCount };
  } catch (error) {
    console.error('[WAITLIST] Error:', error);
    return { success: false, notified: 0, error };
  }
}



// Validation functions
function validatePhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const patterns = [
    /^\+251[97]\d{8}$/,
    /^251[97]\d{8}$/,
    /^0[97]\d{8}$/
  ];
  return patterns.some(pattern => pattern.test(cleaned));
}

function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    return '+251' + cleaned.substring(1);
  } else if (cleaned.startsWith('251')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+251')) {
    return cleaned;
  }
  return phone;
}

function validateTIN(tin) {
  const cleaned = tin.replace(/[\s\-]/g, '');
  return /^\d{10}$/.test(cleaned);
}

// Get main menu keyboard
function getMainMenuKeyboard(language) {
  const buttons = language === 'amharic' 
    ? [
        ['📦 አዲስ ትዕዛዝ', '📋 የትዕዛዝ ሁኔታ'],
        ['💬 መልዕክቶችን ይመለከቱ', '📨 የሻጩን ያነጋግሩ'],
        ['✏️ ምዝገባ ያስተካክሉ', '🌐 ቋንቋ'],
        ['❓ እገዛ']
      ]
    : [
        ['📦 New Order', '📋 Check Order Status'],
        ['💬 View Messages', '📨 Contact Vendor'],
        ['✏️ Edit Registration', '🌐 Language'],
        ['❓ Help']
      ];
  
  return Markup.keyboard(buttons).resize();
}
// Format customer details

function formatCustomerDetails(customer, language) {
  if (customer.registration_type === 'company') {
    return language === 'amharic'
      ? `የድርጅት ስም: ${customer.company_name || 'N/A'}\nቲን: ${customer.tin_number || 'N/A'}\nሙሉ ስም: ${customer.full_name || 'N/A'}\nስልክ: ${customer.phone_number || 'N/A'}\nአድራሻ: ${customer.address || 'N/A'}`
      : `Company: ${customer.company_name || 'N/A'}\nTIN: ${customer.tin_number || 'N/A'}\nFull Name: ${customer.full_name || 'N/A'}\nPhone: ${customer.phone_number || 'N/A'}\nAddress: ${customer.address || 'N/A'}`;
  } else {
    return language === 'amharic'
      ? `ሙሉ ስም: ${customer.full_name || 'N/A'}\nስልክ: ${customer.phone_number || 'N/A'}\nአድራሻ: ${customer.address || 'N/A'}`
      : `Full Name: ${customer.full_name || 'N/A'}\nPhone: ${customer.phone_number || 'N/A'}\nAddress: ${customer.address || 'N/A'}`;
  }
}

// START COMMAND
// START COMMAND - WITH DEEP LINK SUPPORT

bot.command('start', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const customer = await getCustomer(telegramId);
    
    // Extract deep link
    const deepLink = ctx.message.text.split(' ')[1];
    let assignedVendor = null;
    
    if (deepLink) {
      assignedVendor = await getVendorByDeepLink(deepLink);
      
      if (!assignedVendor) {
        await ctx.reply(
          '❌ Invalid vendor link. Please contact the shop for the correct link.',
          Markup.removeKeyboard()
        );
        return;
      }
    }
    
    // Check if customer is FULLY registered (has all required fields)
    const isFullyRegistered = customer && 
                              customer.full_name && 
                              customer.phone_number && 
                              customer.address;
    
    if (isFullyRegistered) {
      // RETURNING CUSTOMER - Show welcome and main menu
      if (assignedVendor) {
        const welcomeMsg = assignedVendor.welcome_message || 
          `Welcome back to ${assignedVendor.company_name}! 🛍️`;
        await ctx.reply(welcomeMsg);
        
        // Update vendor assignment
        await updateCustomer(telegramId, { 
          assigned_vendor_id: assignedVendor.id,
          state: 'idle'
        });
      }
      
      const details = formatCustomerDetails(customer, customer.language);
      await ctx.reply(
        getMessage(customer.language, 'registrationComplete', { details }),
        getMainMenuKeyboard(customer.language)
      );
      await ctx.reply(getMessage(customer.language, 'mainMenu'));
    } else {
      // NEW CUSTOMER or INCOMPLETE REGISTRATION - Start fresh
      if (assignedVendor) {
        const welcomeMsg = assignedVendor.welcome_message || 
          `Welcome to ${assignedVendor.company_name}! 🛍️\n\nLet's get you registered to start ordering.`;
        await ctx.reply(welcomeMsg);
      } else {
        await ctx.reply(getMessage('english', 'welcome'));
      }
      
      // Ask registration type
      await ctx.reply(
        getMessage('english', 'askRegistrationType'),
        Markup.keyboard([
          ['🏢 Company', '👤 Individual']
        ]).resize()
      );
      
      // Create or reset customer record
      if (customer) {
        // Customer exists but incomplete - reset to start fresh
        await updateCustomer(telegramId, {
          state: 'awaiting_registration_type',
          assigned_vendor_id: assignedVendor ? assignedVendor.id : null,
          full_name: '',
          phone_number: '',
          address: ''
        });
      } else {
        // Brand new customer
        await createCustomer({
          telegram_id: telegramId,
          state: 'awaiting_registration_type',
          language: 'english',
          registration_type: 'individual',
          full_name: '',
          phone_number: '',
          address: '',
          assigned_vendor_id: assignedVendor ? assignedVendor.id : null
        });
      }
    }
  } catch (error) {
    console.error('Error in /start:', error);
    await ctx.reply('Sorry, something went wrong. Please try /reset and then /start again');
  }
});

// RESET COMMAND - Add this new command
bot.command('reset', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    // Delete user from database
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('telegram_id', telegramId);
    
    if (error) {
      console.error('Error deleting customer:', error);
    }
    
    // Clear any active orders
    delete userCurrentOrders[ctx.from.id];
    
    await ctx.reply(
      '✅ Your data has been reset!\n\nSend /start to register again.',
      Markup.removeKeyboard()
    );
  } catch (error) {
    console.error('Error in /reset:', error);
    await ctx.reply('Error resetting. Please try again.');
  }
});


// HELP COMMAND
bot.command('help', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    const language = customer ? customer.language : 'english';
    
    await ctx.reply(
      getMessage(language, 'help') + 
      '\n\n🔄 /reset - Clear all data and start fresh'
    );
  } catch (error) {
    console.error('Error in /help:', error);
  }
});

// SUBMIT COMMAND
bot.command('submit', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    if (customer.state !== 'creating_order') {
      await ctx.reply(getMessage(customer.language, 'noActiveOrder'));
      return;
    }
    
    const orderId = userCurrentOrders[ctx.from.id];
    if (!orderId) {
      await ctx.reply(getMessage(customer.language, 'noActiveOrder'));
      return;
    }
    
    const order = await getOrder(orderId);
    if (!order) {
      await ctx.reply(getMessage(customer.language, 'noActiveOrder'));
      return;
    }
    
    // Update order status
    await updateOrder(orderId, {
      status: 'pending_quote',
      delivery_address: customer.address,
      delivery_phone: customer.phone_number
    });
    
    // Update customer state
    await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
    delete userCurrentOrders[ctx.from.id];
    
    await ctx.reply(
      getMessage(customer.language, 'orderSubmitted', { orderNumber: order.order_number }),
      getMainMenuKeyboard(customer.language)
    );
    
    // Notify admin (if configured)
    if (process.env.ADMIN_TELEGRAM_ID) {
      await bot.telegram.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        `📢 New Order Request!\n\nOrder: ${order.order_number}\nFrom: ${customer.full_name || customer.company_name}\nPhone: ${customer.phone_number}\n\nDescription: ${order.product_description || 'See attached files'}`
      );
    }
  } catch (error) {
    console.error('Error in /submit:', error);
  }
});



// REPLACE the /order command (around line 673) with this:
bot.command('order', async (ctx) => {
  try {
    const customerId = ctx.from.id.toString();
    const customer = await getCustomer(customerId);
    
    if (!customer) {
      return ctx.reply('Please start with /start first');
    }

    // Check if customer has assigned vendor
    if (!customer.assigned_vendor_id) {
      return ctx.reply(
        customer.language === 'amharic'
          ? 'አሁን ለማዘዝ ከሳጪው ሊንክ ይምረጡ።'
          : 'Please click a shop link first to start ordering.'
      );
    }

    // Set state to wait for product code
    await updateCustomer(customerId, { state: 'awaiting_product_code' });

    // Send message with emoji and skip option
    await ctx.reply(
      customer.language === 'amharic'
        ? '📦 ምርት ኮድ ይላኩ (ለምሳሌ SH8)\nወይም ይሞክሩ "skip" በእጅ ለማዘዝ።'
        : '📦 Send product code (e.g., SH8)\nOr type "skip" to order manually.'
    );
  } catch (error) {
    console.error('Error in /order:', error);
    await ctx.reply('Error processing request. Please try again.');
  }
});

// Vendor updates product stock status and notifies customers
// REPLACE your bot.command('notify_waitlist') in bot.js with this:

// REPLACE bot.command('notify_waitlist') in lib/bot.js with this:

bot.command('notify_waitlist', async (ctx) => {
  try {
    const text = ctx.message.text;
    const productCode = text.split(' ')[1];
    
    if (!productCode) {
      return ctx.reply('Usage: /notify_waitlist PRODUCT_CODE\n\nExample: /notify_waitlist SH1');
    }

    console.log('[BOT] notify_waitlist for:', productCode);

    // Get product by code
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('product_code', productCode.toUpperCase())
      .single();
    
    if (productError || !product) {
      console.error('[BOT] Product not found:', productCode);
      return ctx.reply(`❌ Product "${productCode}" not found.`);
    }

    console.log('[BOT] Found product:', product.id, product.name);

    // Call the notification function
    const result = await notifyWaitlistCustomers(product.id, product.name, product.vendor_id);
    
    console.log('[BOT] Notification result:', result);

    // User-friendly messages (no technical details)
    if (result.notified > 0) {
      ctx.reply(
        `✅ Successfully notified ${result.notified} customer(s) about "${product.name}" being back in stock!`
      );
    } else {
      ctx.reply(
        `ℹ️ No customers waiting for "${product.name}"`
      );
    }
  } catch (error) {
    console.error('[BOT] Error in notify_waitlist:', error);
    ctx.reply(`❌ Error notifying customers. Please try again.`);
  }
});


bot.command(/confirm_delivery_(.+)/, async (ctx) => {
  try {
    const orderId = ctx.match[1];
    const customerId = ctx.from.id.toString();

    console.log('[DELIVERY] Customer confirming delivery:', orderId);

    // Update order to completed
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('telegram_id', customerId);

    if (error) throw error;

    const customer = await getCustomer(customerId);
    
    await ctx.reply(
      customer?.language === 'amharic'
        ? '✅ አመሰግናለሁ! ትዕዛዝ ተጠናቋል።\n\nድጋሚ እንድናገልግልዎ ተስፋ እናደርጋለን!'
        : '✅ Thank you! Order marked as completed.\n\nWe hope to serve you again soon!',
      getMainMenuKeyboard(customer?.language || 'english')
    );
  } catch (error) {
    console.error('[DELIVERY] Error confirming:', error);
    ctx.reply('Error confirming delivery. Please try again.');
  }
});

async function sendVendorQuestionToCustomer(orderId, vendorId, questionText) {
  try {
    // Get order details
    const order = await getOrder(orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return { success: false, error: 'Order not found' };
    }

    // Get customer
    const customer = await getCustomer(order.telegram_id);
    if (!customer) {
      console.error('Customer not found');
      return { success: false, error: 'Customer not found' };
    }

    // Save message to database
    await createMessage({
      order_id: orderId,
      sender_type: 'vendor',
      sender_id: vendorId,
      telegram_id: order.telegram_id,
      message_text: questionText,
      message_type: 'question',
      is_read: false
    });

    // Update customer state
    await updateCustomer(order.telegram_id, { state: 'answering_vendor_question' });
    customerAnsweringOrder[order.telegram_id] = orderId;

    // Send question to customer via Telegram
    const questionMessage = customer.language === 'amharic'
      ? `❓ á‹¨áˆ»áŒ­ áŒ¥á‹«á‰„ - á‰µá‹•á‹›á‹ #${order.order_number}\n\ná‹¨áˆ»áŒ­ áŒ¥á‹«á‰„: ${questionText}\n\nâž¡ï¸ áŠ¥á‰£áŠ­á‹Ž áˆ˜áˆáˆµá‹ŽáŠ• á‹­áˆ‹áŠ©:`
      : `❓ Vendor Question - Order #${order.order_number}\n\nVendor asks: ${questionText}\n\nâž¡ï¸ Please send your answer:`;

    await bot.telegram.sendMessage(order.telegram_id, questionMessage);

    return { success: true };
  } catch (error) {
    console.error('Error sending vendor question:', error);
    return { success: false, error: error.message };
  }
}



async function checkForDeliveryAddressRequest(ctx, customer) {
  try {
    // Check if there's an order waiting for delivery info
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('telegram_id', ctx.from.id.toString())
      .eq('status', 'shipped')
      .is('delivery_address', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      const order = pendingOrders[0];
      
      console.log('[DELIVERY] Saving delivery info for order:', order.order_number);
      
      // Save the delivery address
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_address: ctx.message.text,
          delivery_phone: customer.phone_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      await ctx.reply(
        customer.language === 'amharic'
          ? `✅ የማድረሻ መረጃ ተቀብሏል!\n\nትዕዛዝ: #${order.order_number}\n📍 ${ctx.message.text}\n\nትዕዛዝዎ በቅርቡ ይደርሰዎታል።`
          : `✅ Delivery details received!\n\nOrder: #${order.order_number}\n📍 ${ctx.message.text}\n\nYour order will be delivered soon.`,
        getMainMenuKeyboard(customer.language)
      );
      
      return true; // Indicates we handled the message
    }
    
    return false; // No pending delivery request
  } catch (error) {
    console.error('[DELIVERY] Error checking for delivery request:', error);
    return false;
  }
}


// HANDLE REGISTRATION TYPE - IMPROVED
bot.hears(/🏢 Company|👤 Individual/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    
    // IMPORTANT: Only respond if waiting for this input
    if (!customer || customer.state !== 'awaiting_registration_type') {
      return; // Ignore if not in correct state
    }
    
    const isCompany = ctx.message.text.includes('Company') || ctx.message.text.includes('🏢');
    
    await updateCustomer(ctx.from.id.toString(), {
      registration_type: isCompany ? 'company' : 'individual',
      state: isCompany ? 'awaiting_company_name' : 'awaiting_full_name'
    });
    
    if (isCompany) {
      await ctx.reply(getMessage(customer.language, 'askCompanyName'), Markup.removeKeyboard());
    } else {
      await ctx.reply(getMessage(customer.language, 'askFullName'), Markup.removeKeyboard());
    }
  } catch (error) {
    console.error('Error handling registration type:', error);
  }
});

// HANDLE LANGUAGE SELECTION
bot.hears(/🌐 Language|🌐 ቋንቋ/, async (ctx) => {
  await ctx.reply(
    'Choose language / ቋንቋ ይምረጡ',
    Markup.keyboard([['English 🇬🇧', 'አማርኛ 🇪🇹']]).resize()
  );
});

bot.hears(/English 🇬🇧|አማርኛ 🇪🇹/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    const newLang = ctx.message.text.includes('English') ? 'english' : 'amharic';
    await updateCustomer(ctx.from.id.toString(), { language: newLang });
    
    await ctx.reply(
      newLang === 'english' ? '✅ Language changed to English' : '✅ ቋንቋ ወደ አማርኛ ተቀይሯል',
      getMainMenuKeyboard(newLang)
    );
  } catch (error) {
    console.error('Error changing language:', error);
  }
});

bot.hears(/❓ Help|❓ እገዛ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    const language = customer ? customer.language : 'english';
    
    const helpText = getMessage(language, 'help') + '\n\n🔄 /reset - Clear all data and start fresh';
    
    await ctx.reply(helpText);
  } catch (error) {
    console.error('Error in help:', error);
    await ctx.reply('Available commands:\n/start - Start\n/reset - Reset\n/submit - Submit order\n/help - Help');
  }
});

bot.hears(/✏️ Edit Registration|✏️ ምዝገባ ያስተካክሉ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    const message = customer.language === 'amharic'
      ? '📋 የትኛውን መረጃ መቀየር ይፈልጋሉ?'
      : '📋 Which information would you like to edit?';
    
    const keyboard = customer.language === 'amharic'
      ? Markup.keyboard([
          ['📝 ስም ይቀይሩ', '📱 ስልክ ቁጥር ይቀይሩ'],
          ['📍 አድራሻ ይቀይሩ'],
          customer.registration_type === 'company' ? ['🏢 የድርጅት ስም ይቀይሩ', '🔢 የቲን ቁጥር ይቀይሩ'] : null,
          ['❌ ይቅር']
        ].filter(Boolean)).resize()
      : Markup.keyboard([
          ['📝 Edit Name', '📱 Edit Phone'],
          ['📍 Edit Address'],
          customer.registration_type === 'company' ? ['🏢 Edit Company', '🔢 Edit TIN'] : null,
          ['❌ Cancel']
        ].filter(Boolean)).resize();
    
    await ctx.reply(message, keyboard);
  } catch (error) {
    console.error('Error in edit registration:', error);
  }
});

// Handle edit name button
bot.hears(/📝 Edit Name|📝 ስም ይቀይሩ/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  await updateCustomer(ctx.from.id.toString(), { state: 'editing_name' });
  
  const message = customer.language === 'amharic'
    ? `📝 አሁን ያለ ስምዎ: ${customer.full_name}\n\nአዲስ ስም ያስገቡ:`
    : `📝 Current name: ${customer.full_name}\n\nEnter new name:`;
  
  await ctx.reply(message, Markup.removeKeyboard());
});

// Handle edit phone button
bot.hears(/📱 Edit Phone|📱 ስልክ ቁጥር ይቀይሩ/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  await updateCustomer(ctx.from.id.toString(), { state: 'editing_phone' });
  
  const message = customer.language === 'amharic'
    ? `📱 አሁን ያለ ስልክ ቁጥር: ${customer.phone_number}\n\nአዲስ ስልክ ቁጥር ያስገቡ:`
    : `📱 Current phone: ${customer.phone_number}\n\nEnter new phone number:`;
  
  await ctx.reply(message, Markup.removeKeyboard());
});

// Handle edit address button
bot.hears(/📍 Edit Address|📍 አድራሻ ይቀይሩ/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  await updateCustomer(ctx.from.id.toString(), { state: 'editing_address' });
  
  const message = customer.language === 'amharic'
    ? `📍 አሁን ያለ አድራሻ: ${customer.address || 'አልተሞላም'}\n\nአዲስ አድራሻ ያስገቡ:`
    : `📍 Current address: ${customer.address || 'Not provided'}\n\nEnter new address:`;
  
  await ctx.reply(message, Markup.removeKeyboard());
});

// Handle edit company button
bot.hears(/🏢 Edit Company|🏢 የድርጅት ስም ይቀይሩ/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  if (customer.registration_type !== 'company') {
    return ctx.reply('Not available for individual registration');
  }
  
  await updateCustomer(ctx.from.id.toString(), { state: 'editing_company' });
  
  const message = customer.language === 'amharic'
    ? `🏢 አሁን ያለ የድርጅት ስም: ${customer.company_name}\n\nአዲስ የድርጅት ስም ያስገቡ:`
    : `🏢 Current company: ${customer.company_name}\n\nEnter new company name:`;
  
  await ctx.reply(message, Markup.removeKeyboard());
});

// Handle edit TIN button
bot.hears(/🔢 Edit TIN|🔢 የቲን ቁጥር ይቀይሩ/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  if (customer.registration_type !== 'company') {
    return ctx.reply('Not available for individual registration');
  }
  
  await updateCustomer(ctx.from.id.toString(), { state: 'editing_tin' });
  
  const message = customer.language === 'amharic'
    ? `🔢 አሁን ያለ የቲን ቁጥር: ${customer.tin_number || 'አልተሞላም'}\n\nአዲስ የቲን ቁጥር ያስገቡ:`
    : `🔢 Current TIN: ${customer.tin_number || 'Not provided'}\n\nEnter new TIN number:`;
  
  await ctx.reply(message, Markup.removeKeyboard());
});

// Handle cancel
bot.hears(/❌ Cancel|❌ ይቅር/, async (ctx) => {
  const customer = await getCustomer(ctx.from.id.toString());
  if (!customer) return;
  
  await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
  
  await ctx.reply(
    customer.language === 'amharic' ? '❌ ተሰርዟል።' : '❌ Cancelled.',
    getMainMenuKeyboard(customer.language)
  );
});

// HANDLE NEW ORDER
bot.hears(/📦 New Order|📦 አዲስ ትዕዛዝ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    // Get vendor info
    let vendorCategory = 'general';
    let usesProductCatalog = false;
    
    if (customer.assigned_vendor_id) {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('business_category, use_product_catalog')
        .eq('id', customer.assigned_vendor_id)
        .single();
      
      if (vendor) {
        vendorCategory = vendor.business_category || 'general';
        usesProductCatalog = vendor.use_product_catalog || false;
      }
    }
    
    // Create order
    let order;
    if (customer.assigned_vendor_id) {
      order = await createOrderForVendor({
        customer_id: customer.id,
        telegram_id: customer.telegram_id,
      }, customer.assigned_vendor_id);
    } else {
      order = await createOrder({
        customer_id: customer.id,
        telegram_id: customer.telegram_id,
        status: 'pending_submission'
      });
    }
    
    userCurrentOrders[ctx.from.id] = order.id;
    
    // Check if vendor uses product catalog
    if (usesProductCatalog) {
      await updateCustomer(ctx.from.id.toString(), { state: 'awaiting_product_code' });
      await ctx.reply(
        customer.language === 'amharic'
          ? '📦 የምርት ኮድ ይላኩ (ለምሳሌ: SH8)\n\nወይም "skip" ብለው በእጅ ለማዘዝ ይፃፉ።'
          : '📦 Send product code (e.g., SH8)\n\nOr type "skip" to order manually.'
      );
      return;
    }
    
    // No product catalog - use template
    const template = getCategoryQuestions(vendorCategory);
    
    // ✅ FIX: Check if it's general OR manufacturing with general-style questions
    if (vendorCategory === 'general') {
      // General category - single description, then /submit
      await updateCustomer(ctx.from.id.toString(), { state: 'creating_order' });
      const question = template.questions.description[customer.language];
      await ctx.reply(question);
    } 
    else if (vendorCategory === 'manufacturing') {
      // ✅ Manufacturing - use template with multiple steps
      await updateOrder(order.id, {
        template_data: {
          category: vendorCategory,
          current_step: 0,
          steps: template.steps,
          answers: {}
        }
      });
      
      await updateCustomer(ctx.from.id.toString(), { state: 'creating_order_template' });
      
      const firstStep = template.steps[0];
      const firstQuestion = template.questions[firstStep][customer.language];
      await ctx.reply(firstQuestion);
    }
    else {
      // ✅ Other categories (retail, food, construction) - use template
      await updateOrder(order.id, {
        template_data: {
          category: vendorCategory,
          current_step: 0,
          steps: template.steps,
          answers: {}
        }
      });
      
      await updateCustomer(ctx.from.id.toString(), { state: 'creating_order_template' });
      
      const firstStep = template.steps[0];
      const firstQuestion = template.questions[firstStep][customer.language];
      await ctx.reply(firstQuestion);
    }
    
  } catch (error) {
    console.error('Error starting new order:', error);
    await ctx.reply('Sorry, there was an error. Please try again.');
  }
});



// HANDLE CHECK ORDER STATUS
bot.hears(/📋 Check Order Status|📋 የትዕዛዝ ምንታ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    const orders = await getCustomerOrders(customer.telegram_id);
    
    if (orders.length === 0) {
      await ctx.reply(getMessage(customer.language, 'noOrders'));
      return;
    }
    
    // Show ALL orders, not just the latest one
    let ordersList = customer.language === 'amharic'
      ? '📋 የእርስዎ ትዕዛዞች:\n\n'
      : '📋 Your Orders:\n\n';
    
    orders.forEach((order, index) => {
      const statusEmoji = 
          order.status === 'pending_quote' || order.status === 'pending_submission' ? '⏳' :
          order.status === 'quoted' ? '💰' :
          order.status === 'customer_accepted' ? '✅' :
          order.status === 'payment_pending' ? '⏳' :     
          order.status === 'payment_received' ? '💳' :
          order.status === 'processing' ? '⚙️' :          
          order.status === 'shipped' ? '📦' :            
          order.status === 'delivered' ? '✅' :          
          order.status === 'completed' ? '✅' :
          order.status === 'cancelled' ? '❌' : '📦';
      
      const vendorName = order.vendors?.company_name || 
        (customer.language === 'amharic' ? 'ገና አልተመደበም' : 'Not assigned');
      
      ordersList += `${index + 1}. ${statusEmoji} Order #${order.order_number}\n`;
      ordersList += `   ${customer.language === 'amharic' ? 'ሻጭ' : 'Vendor'}: ${vendorName}\n`;
      ordersList += `   ${customer.language === 'amharic' ? 'ሁኔታ' : 'Status'}: ${order.status.replace(/_/g, ' ')}\n`;
      if (order.total_amount) {
        ordersList += `   ${customer.language === 'amharic' ? 'መጠን' : 'Amount'}: ${order.total_amount} ${customer.language === 'amharic' ? 'ብር' : 'Birr'}\n`;
      }
      ordersList += `   ${customer.language === 'amharic' ? 'ቀን' : 'Date'}: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
    });
    
    await ctx.reply(ordersList);
    
    // Check if any order has quotes waiting
    const ordersWithQuotes = [];
    for (const order of orders) {
      if (order.status === 'quoted') {
        const quotes = await getOrderQuotes(order.id);
        if (quotes.length > 0) {
          ordersWithQuotes.push({ order, quotes });
        }
      }
    }
    
    // If there are orders with quotes, let user select which one to view
    if (ordersWithQuotes.length > 0) {
      let quotesMsg = customer.language === 'amharic'
        ? '\n💰 የቅናሽ ዋጋዎች አሉዎት!\n\nየትኛውን ትዕዛዝ ማየት ይፈልጋሉ? ቁጥሩን ይላኩ:\n\n'
        : '\n💰 You have quotes available!\n\nWhich order do you want to see quotes for? Send the number:\n\n';
      
      ordersWithQuotes.forEach((item, index) => {
        quotesMsg += `${index + 1}. Order #${item.order.order_number} - ${item.quotes.length} quote(s)\n`;
      });
      
      await ctx.reply(quotesMsg);
      
      // Store orders with quotes for selection
      userCurrentOrders[ctx.from.id] = ordersWithQuotes;
      await updateCustomer(ctx.from.id.toString(), { state: 'selecting_order_for_quotes' });
    }
    
  } catch (error) {
    console.error('Error checking order status:', error);
    await ctx.reply('Error checking status. Please try again.');
  }
});

// VIEW MESSAGES HANDLER - SEPARATE, NOT NESTED!
bot.hears(/💬 View Messages|💬 መልዕክቶችን ይመለከቱ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;

    // Get customer's latest order
    const orders = await getCustomerOrders(customer.telegram_id);
    if (orders.length === 0) {
      await ctx.reply(getMessage(customer.language, 'noOrders'));
      return;
    }

    const latestOrder = orders[0];
    
    // Get messages for this order
    const messages = await getOrderMessages(latestOrder.id);
    
    if (messages.length === 0) {
      await ctx.reply(
        customer.language === 'amharic'
          ? 'ገና ምንም መልዕክት የለም።'
          : 'No messages yet for this order.'
      );
      return;
    }

    // Format conversation
    let conversation = customer.language === 'amharic'
      ? `💬 የትዕዛዝ #${latestOrder.order_number} መልዕክቶች\n\n`
      : `💬 Conversation for Order #${latestOrder.order_number}\n\n`;

    messages.forEach(msg => {
      const sender = msg.sender_type === 'vendor' ? 
        (customer.language === 'amharic' ? 'የሻጭ' : 'Vendor') :
        (customer.language === 'amharic' ? 'እኔ' : 'You');
      
      const time = new Date(msg.created_at).toLocaleString();
      conversation += `${sender} (${time}):\n${msg.message_text}\n\n`;
    });

    await ctx.reply(conversation);

    // Mark messages as read
    await markMessagesAsRead(latestOrder.id, 'vendor');

  } catch (error) {
    console.error('Error viewing messages:', error);
  }
});



// CONTACT VENDOR - Customer sends message to vendor
bot.hears(/📨 Contact Vendor|📨 የሻጩን ያነጋግሩ/, async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;

    // Check if customer has assigned vendor
    if (!customer.assigned_vendor_id) {
      await ctx.reply(
        customer.language === 'amharic'
          ? 'እባክዎ መጀመሪያ የሻጭ ሊንክን ይጠቀሙ'
          : 'Please use a vendor link first to get assigned to a vendor.'
      );
      return;
    }

    // Get customer's orders with this vendor
    const orders = await getCustomerOrdersWithVendor(
      customer.telegram_id, 
      customer.assigned_vendor_id
    );
    
    if (orders.length === 0) {
      await ctx.reply(
        customer.language === 'amharic'
          ? 'ከዚህ ሻጭ ጋር ምንም ትዕዛዝ የለዎትም። እባክዎ መጀመሪያ ትዕዛዝ ይፍጠሩ።'
          : 'You have no orders with this vendor yet. Please create an order first.'
      );
      return;
    }

    // Create buttons for each order
    const buttons = orders.map(order => {
      const statusEmoji = order.status === 'delivered' ? '✅' : 
                         order.status === 'in_transit' ? '🚚' :
                         order.status === 'confirmed' ? '📦' : 
                         order.status === 'pending_quote' ? '⏳' : '📄';
      return [Markup.button.callback(
        `${statusEmoji} #${order.order_number}`,
        `contact_order_${order.id}`
      )];
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? '💬 የትኛውን ትዕዛዝ በተመለከተ መልዕክት መላክ ይፈልጋሉ?\n\nትዕዛዝ ይምረጡ:'
        : '💬 Which order would you like to message about?\n\nSelect an order:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error('Error in contact vendor:', error);
    await ctx.reply('Error. Please try again.');
  }
});

// Handle order selection for customer messaging
bot.action(/^contact_order_(.+)$/, async (ctx) => {
  try {
    const orderId = ctx.match[1];
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    // Store order ID for this messaging session
    customerMessagingVendor[ctx.from.id] = orderId;
    
    // Update customer state
    await updateCustomer(ctx.from.id.toString(), { 
      state: 'messaging_vendor' 
    });
    
    await ctx.answerCbQuery();
    await ctx.reply(
      customer.language === 'amharic'
        ? '✍️ መልዕክትዎን ይፃፉ:\n\nበርካታ መልዕክቶችን መላክ ይችላሉ።\nሲጨርሱ "done" ብለው ይፃፉ።'
        : '✍️ Type your message to the vendor:\n\nYou can send multiple messages.\nType "done" when finished.',
      Markup.removeKeyboard()
    );
  } catch (error) {
    console.error('Error selecting order:', error);
    await ctx.answerCbQuery('Error. Try again.');
  }
});

// HANDLE CONTACT SHARING
bot.on('contact', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    const phoneNumber = ctx.message.contact.phone_number;
    
    if (customer.state === 'awaiting_phone_number') {
      if (validatePhoneNumber(phoneNumber)) {
        const formatted = formatPhoneNumber(phoneNumber);
        
        await updateCustomer(ctx.from.id.toString(), {
          phone_number: formatted,
          state: 'awaiting_address'
        });
        
        await ctx.reply(getMessage(customer.language, 'askAddress'), Markup.removeKeyboard());
      } else {
        await ctx.reply(getMessage(customer.language, 'invalidPhone'));
      }
    }
  } catch (error) {
    console.error('Error handling contact:', error);
  }
});

// HANDLE PHOTOS
bot.on('photo', async (ctx) => {
  try {
    console.log(' Photo received from user:', ctx.from.id);
    
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) {
      console.log(' Customer not found');
      return;
    }

    console.log(' Customer state:', customer.state);
    const orderId = userCurrentOrders[ctx.from.id];
    console.log(' OrderId from userCurrentOrders:', orderId);

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;

    // CASE 1: CREATING ORDER - SAVE TO ORDER FILES
    if (customer.state === 'creating_order') {
      console.log(' Handling as order file');
      
      if (!orderId) {
        console.log(' No orderId found - cannot save photo');
        await ctx.reply(
          customer.language === 'amharic' 
            ? 'ስህተት - ትእዛዝ ላይ ይገምቱ' 
            : 'Error - order not found'
        );
        return;
      }

      const result = await addOrderFile({
        order_id: orderId,
        file_type: 'image',
        file_url: fileId,
        telegram_file_id: fileId,
        uploaded_by: 'customer'
      });

      console.log('[v0] Photo saved to order files:', result);
      await ctx.reply(
        customer.language === 'amharic' 
          ? '✅ ምስል ተቀብሏል' 
          : '✅ Image received'
      );
    }
   
    // CASE 2: CREATING ORDER TEMPLATE - ✅ FIXED!
    else if (customer.state === 'creating_order_template') {
      console.log('[Template] Photo received during template order');
      
      const orderId4 = userCurrentOrders[ctx.from.id];
      if (!orderId4) {
        console.log('[Template] No order ID found');
        return;
      }
      
      const order4 = await getOrder(orderId4);
      if (!order4 || !order4.template_data) {
        console.log('[Template] No order or template data found');
        return;
      }
      
      const templateData4 = order4.template_data;
      const currentStep4 = templateData4.steps[templateData4.current_step];
      
      console.log('[Template] Current step:', currentStep4);
      
      // ✅ FIX 1: Accept BOTH photo_optional AND drawings_optional
      if (currentStep4 === 'photo_optional' || currentStep4 === 'drawings_optional') {
        await addOrderFile({
          order_id: orderId4,
          file_type: 'image',
          file_url: fileId,
          telegram_file_id: fileId,
          uploaded_by: 'customer'
        });
        
        // ✅ FIX 2: Just confirm, don't auto-submit!
        await ctx.reply(
          customer.language === 'amharic' 
            ? '✅ ምስል ተቀብሏል! ተጨማሪ ፋይሎች ካሉ ይላኩ ወይም "skip" ብለው ይቀጥሉ።' 
            : '✅ Image received! Send more files or type "skip" to continue.'
        );
        
        // ✅ DO NOT auto-submit - let user control when to finish with "skip"
      } else {
        await ctx.reply(
          customer.language === 'amharic'
            ? 'እባክዎ መጀመሪያ ጥያቄውን ይመልሱ'
            : 'Please answer the current question first'
        );
      }
    }

    // CASE 3: AWAITING PAYMENT - SAVE PAYMENT RECEIPT
    else if (customer.state === 'awaiting_payment') {
      console.log('[v0] Handling as payment receipt');
      
      if (!orderId) {
        console.log('[v0] No orderId found - cannot save receipt');
        await ctx.reply(
          customer.language === 'amharic' 
            ? 'ስህተት - ትእዛዝ ላይ ይገምቱ' 
            : 'Error - order not found'
        );
        return;
      }

      const updateResult = await updateOrder(orderId, {
        payment_receipt_url: fileId,
        payment_status: 'submitted',
        status: 'payment_pending'
      });

      console.log('[v0] Payment receipt saved:', updateResult);
      delete userCurrentOrders[ctx.from.id];
      await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
      console.log('[v0] Customer state updated to idle');

      const confirmationMsg = customer.language === 'amharic'
        ? '✅ ደረሰኙ ተልኳል!\n\nሻጩ ደረሰኙን አረጋግጦ ትዕዛዝዎን ይጀምራል።'
        : '✅ Payment receipt received!\n\nVendor will verify the receipt and your order will be processed.';

      await ctx.reply(confirmationMsg);

      const mainMenuMsg = customer.language === 'amharic'
        ? 'ቀጥሎ ምን ማድረግ ይፈልጋሉ?'
        : 'What would you like to do next?';

      const keyboard = getMainMenuKeyboard(customer.language);
      await ctx.reply(mainMenuMsg, keyboard);

      console.log('[v0] Payment receipt flow completed successfully');
    }
    else {
      console.log('[v0] Customer not in valid state for photo:', customer.state);
      await ctx.reply(
        customer.language === 'amharic'
          ? 'እባክዎ ከመሳሪያው የራስ ንግግር ደረሰኝ ይላኩ'
          : 'Please send a photo in the correct context'
      );
    }
  } catch (error) {
    console.error('[v0] Error handling photo:', error);
    console.error('[v0] Full error:', error.message, error.stack);
  }
});


// HANDLE VOICE
bot.on('voice', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    // ✅ Accept voice in BOTH creating_order AND creating_order_template
    if (customer.state !== 'creating_order' && customer.state !== 'creating_order_template') {
      return;
    }
    
    const orderId = userCurrentOrders[ctx.from.id];
    if (!orderId) return;
    
    await addOrderFile({
      order_id: orderId,
      file_type: 'voice',
      file_url: ctx.message.voice.file_id,
      telegram_file_id: ctx.message.voice.file_id,
      uploaded_by: 'customer'
    });
    
    await ctx.reply(
      customer.language === 'amharic' 
        ? '✅ የድምጽ መልእክት ተቀብሏል! ተጨማሪ ፋይሎች ካሉ ይላኩ ወይም "skip" ብለው ይቀጥሉ።'
        : '✅ Voice message received! Send more files or type "skip" to continue.'
    );
  } catch (error) {
    console.error('Error handling voice:', error);
  }
});

// HANDLE DOCUMENTS
bot.on('document', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;
    
    // ✅ Accept documents in BOTH creating_order AND creating_order_template
    if (customer.state !== 'creating_order' && customer.state !== 'creating_order_template') {
      return;
    }
    
    const orderId = userCurrentOrders[ctx.from.id];
    if (!orderId) return;
    
    await addOrderFile({
      order_id: orderId,
      file_type: 'document',
      file_url: ctx.message.document.file_id,
      file_name: ctx.message.document.file_name,
      telegram_file_id: ctx.message.document.file_id,
      uploaded_by: 'customer'
    });
    
    await ctx.reply(
      customer.language === 'amharic' 
        ? '✅ ሰነድ ተቀብሏል! ተጨማሪ ፋይሎች ካሉ ይላኩ ወይም "skip" ብለው ይቀጥሉ።'
        : '✅ Document received! Send more files or type "skip" to continue.'
    );
  } catch (error) {
    console.error('Error handling document:', error);
  }
});


// HANDLE TEXT MESSAGES
// REPLACE YOUR ENTIRE bot.on('text', ...) WITH THIS:

bot.on('text', async (ctx) => {
  try {
    const customer = await getCustomer(ctx.from.id.toString());
    if (!customer) return;

    const text = ctx.message.text;

    const isDeliveryAddress = await checkForDeliveryAddressRequest(ctx, customer);
    if (isDeliveryAddress) return;

    // REGISTRATION FLOW - Handle these states FIRST
    switch (customer.state) {
      case 'awaiting_company_name':
        await updateCustomer(ctx.from.id.toString(), {
          company_name: text,
          state: 'awaiting_tin'
        });
        await ctx.reply('Please enter your TIN number (10 digits):');
        return;

      case 'awaiting_tin':
        if (!validateTIN(text)) {
          await ctx.reply('❌ Invalid TIN. Please enter a 10-digit TIN number:');
          return;
        }
        await updateCustomer(ctx.from.id.toString(), {
          tin_number: text,
          state: 'awaiting_full_name'
        });
        await ctx.reply('Please enter the contact person\'s full name:');
        return;

      case 'awaiting_full_name':
        await updateCustomer(ctx.from.id.toString(), {
          full_name: text,
          state: 'awaiting_phone_number'
        });
        await ctx.reply(
          'Please share your phone number:',
          Markup.keyboard([
            [Markup.button.contactRequest('📱 Share Phone Number')]
          ]).resize()
        );
        return;

      case 'awaiting_phone_number':
        if (!validatePhoneNumber(text)) {
          await ctx.reply('❌ Invalid phone number. Please enter a valid Ethiopian phone number (e.g., 0911234567):');
          return;
        }
        const formatted = formatPhoneNumber(text);
        await updateCustomer(ctx.from.id.toString(), {
          phone_number: formatted,
          state: 'awaiting_address'
        });
        await ctx.reply('Please enter your address:', Markup.removeKeyboard());
        return;

      case 'awaiting_address':
        await updateCustomer(ctx.from.id.toString(), {
          address: text,
          state: 'idle'
        });
        
        const updatedCustomer = await getCustomer(ctx.from.id.toString());
        const details = formatCustomerDetails(updatedCustomer, updatedCustomer.language);
        
        await ctx.reply(
          `✅ Registration completed successfully!\n\nYour details:\n${details}\n\nWhat would you like to do?`,
          getMainMenuKeyboard(updatedCustomer.language)
        );
        return;

      // 🆕 NEW: PRODUCT CODE FLOW
      case 'awaiting_product_code':
        const orderId5 = userCurrentOrders[ctx.from.id];
        if (!orderId5) return;
        
       
        
        // Check if user wants to skip FIRST
        if (text.toLowerCase() === 'skip') {
          const order5 = await getOrder(orderId5);
          const { data: vendor5 } = await supabase
            .from('vendors')
            .select('business_category')
            .eq('id', order5.vendor_id)
            .single();
          
          const vendorCat = vendor5?.business_category || 'general';
          const template5 = getCategoryQuestions(vendorCat);
          
          if (vendorCat === 'general') {
            await updateCustomer(ctx.from.id.toString(), { state: 'creating_order' });
            await ctx.reply(template5.questions.description[customer.language]);
          } else if (vendorCat === 'manufacturing') {
            await updateOrder(orderId5, {
              template_data: {
                category: vendorCat,
                current_step: 0,
                steps: template5.steps,
                answers: {}
              }
            });
            await updateCustomer(ctx.from.id.toString(), { state: 'creating_order_template' });
            const firstStep = template5.steps[0];
            await ctx.reply(template5.questions[firstStep][customer.language]);
          } else {
            await updateOrder(orderId5, {
              template_data: {
                category: vendorCat,
                current_step: 0,
                steps: template5.steps,
                answers: {}
              }
            });
            await updateCustomer(ctx.from.id.toString(), { state: 'creating_order_template' });
            const firstStep = template5.steps[0];
            await ctx.reply(template5.questions[firstStep][customer.language]);
          }
          return;
        }
        
        // Now get the product by code
        const order5Final = await getOrder(orderId5);
        if (!order5Final) return;
        
        const product = await getProductByCode(order5Final.vendor_id, text);
        
        if (!product) {
          await ctx.reply(
            customer.language === 'amharic'
              ? '❌ ምርት አልተገኘም። ሌላ ኮድ ይሞክሩ ወይም "skip" ብለው በእጅ ለማዘዝ ይፃፉ።'
              : '❌ Product not found. Try another code or type "skip" to order manually.'
          );
          return;
        }
        
        // CHECK IF OUT OF STOCK
        if (product.stock_status === 'out_of_stock') {
          
              await ctx.reply(
      customer.language === 'amharic'
        ? `⚠️ ይቅርታ - "${product.name}" በአሁኑ ሰዐት አልቋል።\n\nወደ ተጠባባቂ ዝርዝር ውስጥ መግባት ይፈልጋሉ?`
        : `⚠️ Sorry, "${product.name}" is currently out of stock.\n\nWould you like to join the waitlist?`,
      Markup.inlineKeyboard([
        [Markup.button.callback(customer.language === 'amharic' ? '✅ ወደ ተጠባባቂ ዝርዝር ውስጥ አስግባ' : '✅ Add to Waitlist', `waitlist_${product.id}_${product.product_code}`)],
        [Markup.button.callback(customer.language === 'amharic' ? '❌ አይ, ሌላ ይዝዙ' : '❌ Order Something Else', 'skip_product')]
      ])
    );
          return;
        }
        
        // Product in stock - show it
        let productInfo = `📦 ${product.name}\n💰 ${product.unit_price} Birr\n`;
        if (product.brand) productInfo += `🏷️ Brand: ${product.brand}\n`;
        if (product.specifications?.size) productInfo += `📏 Size: ${product.specifications.size}\n`;
        if (product.specifications?.color) productInfo += `🎨 Color: ${product.specifications.color}\n`;
        if (product.description) productInfo += `\n${product.description}`;
        
        if (product.images && product.images[0]) {
          await ctx.replyWithPhoto(product.images[0], { caption: productInfo });
        } else {
          await ctx.reply(productInfo);
        }
        
        await updateOrder(orderId5, {
          template_data: {
            product_code: product.product_code,
            product_id: product.id,
            product_name: product.name,
            unit_price: product.unit_price
          }
        });
        
        await updateCustomer(ctx.from.id.toString(), { state: 'awaiting_product_quantity' });
        await ctx.reply(
          customer.language === 'amharic'
            ? '✅ ይህ ነው? ስንት ይፈልጋሉ?'
            : '✅ Is this correct? How many do you need?'
        );
        return;


      case 'awaiting_product_quantity':
  const orderId6 = userCurrentOrders[ctx.from.id];
  if (!orderId6) return;
  
  // ✅ CHECK IF USER IS REJECTING THE PRODUCT
  const negativeResponses = ['no', 'nope', 'wrong', 'incorrect', 'not correct', 'different', 'cancel', 'አይደለም', 'የለም', 'ስህተት'];
  if (negativeResponses.some(word => text.toLowerCase().includes(word))) {
    // User says product is wrong - let them try again
    await updateCustomer(ctx.from.id.toString(), { state: 'awaiting_product_code' });
    
    await ctx.reply(
      customer.language === 'amharic'
        ? '👌 ችግር የለም። እንደገና እንሞክር።\n\n📦 የምርት ኮድ ይላኩ (ለምሳሌ: SH8)\n\nወይም "skip" ብለው በእጅ ለማዘዝ ይፃፉ።'
        : '👌 No problem. Let\'s try again.\n\n📦 Send product code (e.g., SH8)\n\nOr type "skip" to order manually.'
    );
    return;
  }
  
  // ✅ VALIDATE QUANTITY
  const quantity = parseInt(text);
  if (isNaN(quantity) || quantity < 1) {
    await ctx.reply(
      customer.language === 'amharic' 
        ? '❌ እባክዎ ትክክለኛ ቁጥር ያስገቡ (ለምሳሌ: 5)\n\nወይም ምርቱ ትክክል ካልሆነ "no" ብለው ይፃፉ።' 
        : '❌ Please enter a valid number (e.g., 5)\n\nOr type "no" if this is not the correct product.'
    );
    return;
  }
  
  const order6 = await getOrder(orderId6);
  const productData = order6.template_data;
  
  // Generate order description
  let description = `Product Code: ${productData.product_code}\n`;
  description += `Product: ${productData.product_name}\n`;
  description += `Quantity: ${quantity}\n`;
  description += `Unit Price: ${productData.unit_price} Birr\n`;
  description += `Total: ${productData.unit_price * quantity} Birr\n`;
  if (productData.specifications?.size) description += `Size: ${productData.specifications.size}\n`;
  if (productData.specifications?.color) description += `Color: ${productData.specifications.color}`;
  
  // Update order
  await updateOrder(orderId6, {
    product_description: description,
    template_data: { ...productData, quantity },
    status: 'pending_quote',
    total_amount: productData.unit_price * quantity
  });
  
  await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
  delete userCurrentOrders[ctx.from.id];
  
  await ctx.reply(
    customer.language === 'amharic'
      ? '✅ ትዕዛዝዎ ተልኳል! የሻጭ የዋጋ ግምት በቅርቡ ይደርስዎታል।'
      : '✅ Order submitted! You will receive a quote from the vendor soon.',
    getMainMenuKeyboard(customer.language)
  );
  return;
    }


  if (customer.state === 'editing_name') {
    await updateCustomer(ctx.from.id.toString(), {
      full_name: text.trim(),
      state: 'idle'
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? `✅ ስምዎ ወደ "${text.trim()}" ተቀይሯል!`
        : `✅ Your name has been updated to "${text.trim()}"!`,
      getMainMenuKeyboard(customer.language)
    );
    return;
  }

  // Edit Phone
  if (customer.state === 'editing_phone') {
    // Validate phone number
    if (text.length < 9) {
      return ctx.reply(
        customer.language === 'amharic'
          ? '❌ ልክ ያልሆነ ስልክ ቁጥር። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Invalid phone number. Please try again.'
      );
    }

    await updateCustomer(ctx.from.id.toString(), {
      phone_number: text.trim(),
      state: 'idle'
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? `✅ ስልክ ቁጥርዎ ወደ "${text.trim()}" ተቀይሯል!`
        : `✅ Your phone number has been updated to "${text.trim()}"!`,
      getMainMenuKeyboard(customer.language)
    );
    return;
  }

  // Edit Address
  if (customer.state === 'editing_address') {
    await updateCustomer(ctx.from.id.toString(), {
      address: text.trim(),
      state: 'idle'
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? `✅ አድራሻዎ ተቀይሯል!`
        : `✅ Your address has been updated!`,
      getMainMenuKeyboard(customer.language)
    );
    return;
  }

  // Edit Company Name
  if (customer.state === 'editing_company') {
    await updateCustomer(ctx.from.id.toString(), {
      company_name: text.trim(),
      state: 'idle'
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? `✅ የድርጅት ስምዎ ወደ "${text.trim()}" ተቀይሯል!`
        : `✅ Your company name has been updated to "${text.trim()}"!`,
      getMainMenuKeyboard(customer.language)
    );
    return;
  }

  // Edit TIN
  if (customer.state === 'editing_tin') {
    await updateCustomer(ctx.from.id.toString(), {
      tin_number: text.trim(),
      state: 'idle'
    });

    await ctx.reply(
      customer.language === 'amharic'
        ? `✅ የቲን ቁጥርዎ ተቀይሯል!`
        : `✅ Your TIN number has been updated!`,
      getMainMenuKeyboard(customer.language)
    );
    return;
  }




  const lowerText = text.toLowerCase();
    if (customer.state === 'messaging_vendor') {
      if (lowerText === 'done' || lowerText === 'ጨርሷል') {
        const orderId = customerMessagingVendor[ctx.from.id];
        delete customerMessagingVendor[ctx.from.id];
        
        await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
        
        await ctx.reply(
          customer.language === 'amharic'
            ? '✅ መልዕክትዎ ለሻጩ ተልኳል!\n\nሻጩ በቅርቡ ምላሽ ይሰጥዎታል።'
            : '✅ Your messages have been sent to the vendor!\n\nThe vendor will respond soon.',
          getMainMenuKeyboard(customer.language)
        );
        return;
      }
      
      // Save customer message to database
      const orderId = customerMessagingVendor[ctx.from.id];
      if (orderId) {
        await createMessage({
          order_id: orderId,
          sender_type: 'customer',
          message_text: text,
          is_read: false
        });
        
        // Notify vendor
        const order = await getOrder(orderId);
        if (order) {
          await notifyVendorOfCustomerMessage(order.vendor_id, orderId);
        }
        
        await ctx.reply(
          customer.language === 'amharic'
            ? '✉️ መልዕክት ተልኳል።\n\nተጨማሪ መልዕክቶችን ይላኩ ወይም "done" ብለው ይጨርሱ።'
            : '✉️ Message sent.\n\nSend more messages or type "done" to finish.'
        );
      }
      return;
    }

    // ANSWERING VENDOR QUESTIONS
    if (customer.state === 'answering_vendor_question') {
      const orderId = customerAnsweringOrder[ctx.from.id.toString()];
      
      if (text.toLowerCase() === 'done' || text.toLowerCase() === 'ጨርሷል') {
        delete customerAnsweringOrder[ctx.from.id.toString()];
        await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
        
        await ctx.reply(
          customer.language === 'amharic'
            ? '✅ አመሰግናለን! የሻጭ መልስዎን እየመተሸ ነው።'
            : '✅ Thank you! The vendor is reviewing your answers.',
          getMainMenuKeyboard(customer.language)
        );
        return;
      }
      
      if (orderId) {
        await createMessage({
          order_id: orderId,
          sender_type: 'customer',
          sender_id: null,
          telegram_id: ctx.from.id.toString(),
          message_text: text,
          message_type: 'answer',
          is_read: false
        });

        await markMessagesAsRead(orderId, 'vendor');

        await ctx.reply(
          customer.language === 'amharic'
            ? '✅ መልስ ደረሰ! የሻጭ ይመለከታል።\n\nተከታታይ ጥያቄዎች ካሉ እምልስዎን ይላኩ። ጥያቄዎች ከሰበቱ መልስ ለማስገባት "ለውጡ" ይተይቡ።'
            : '✅ Answer received! The vendor will review it.\n\nIf you have more information to add, just send it. Type "done" when finished.'
        );

        const order = await getOrder(orderId);
        if (process.env.ADMIN_TELEGRAM_ID) {
          await bot.telegram.sendMessage(
            process.env.ADMIN_TELEGRAM_ID,
            `💬 Customer Response - Order #${order.order_number}\n\nCustomer answered: ${text}`
          );
        }
        return;
      }
    }

    // OTHER STATES
    switch (customer.state) {

     case 'selecting_order_for_quotes':
  const orderSelection = parseInt(text);
  const ordersWithQuotes = userCurrentOrders[ctx.from.id];
  
  if (!ordersWithQuotes || isNaN(orderSelection) || orderSelection < 1 || orderSelection > ordersWithQuotes.length) {
    await ctx.reply(customer.language === 'amharic' ? 'እባክዎ ትክክለኛ ቁጥር ያስገቡ' : 'Please enter a valid number');
    return;
  }
  
  const selectedOrderData = ordersWithQuotes[orderSelection - 1];
  const latestOrder = selectedOrderData.order;
  const quotes = selectedOrderData.quotes;
  
  // Format quotes with vendor details
  let quotesText = '';
  quotes.forEach((quote, index) => {
    const vendorName = quote.vendors?.company_name || 'Unknown Vendor';
    const price = quote.quoted_price || 'N/A';
    const delivery = quote.delivery_days ? `${quote.delivery_days} days` : 'Not specified';
    const notes = quote.notes || 'None';
    
    if (customer.language === 'amharic') {
      quotesText += `\n━━━━━━━━━━━━━━━\n`;
      quotesText += `${index + 1}. ${vendorName}\n`;
      quotesText += `   💰 ዋጋ: ${price} ብር\n`;
      quotesText += `   📅 የማድረስ ጊዜ: ${delivery}\n`;
      quotesText += `   📝 ማስታወሻ: ${notes}\n`;
    } else {
      quotesText += `\n━━━━━━━━━━━━━━━\n`;
      quotesText += `${index + 1}. ${vendorName}\n`;
      quotesText += `   💰 Price: ${price} Birr\n`;
      quotesText += `   📅 Delivery: ${delivery}\n`;
      quotesText += `   📝 Notes: ${notes}\n`;
    }
  });
  
  const message = customer.language === 'amharic'
    ? `💰 ለትዕዛዝ #${latestOrder.order_number} ዋጋዎች ተዘጋጅተዋል\n\nከሻጮች ${quotes.length} ዋጋ(ዎች) ደርሰዎታል:\n${quotesText}\n\n━━━━━━━━━━━━━━━\n\nዋጋቸውን ለመቀበል የሻጩን ቁጥር ይምረጡ (ለምሳሌ "1" ለሻጭ 1)`
    : `💰 Quotes Available for Order #${latestOrder.order_number}\n\nYou have received ${quotes.length} quote(s) from vendors:\n${quotesText}\n\n━━━━━━━━━━━━━━━\n\nReply 1 to confirm and proceed to Payment options`;
  
  await ctx.reply(message);
  
  // Store order ID and set state for quote selection
  userCurrentOrders[ctx.from.id] = latestOrder.id;
  await updateCustomer(ctx.from.id.toString(), { state: 'selecting_quote' });  
  break;

      case 'selecting_quote':
        const quoteNumber = parseInt(text);
        if (isNaN(quoteNumber)) {
          await ctx.reply(customer.language === 'amharic' ? 'እባክዎ ቁጥር ያስገቡ' : 'Please enter a number');
          return;
        }

        const orderId2 = userCurrentOrders[ctx.from.id];
        if (!orderId2) return;

        const availableQuotes = await getOrderQuotes(orderId2);
        if (quoteNumber < 1 || quoteNumber > availableQuotes.length) {
          await ctx.reply(customer.language === 'amharic' ? 'ምክ ያልሆነ ምርጫ' : 'Invalid selection');
          return;
        }

        const selectedQuote = availableQuotes[quoteNumber - 1];
        await acceptQuote(selectedQuote.id, orderId2);
        await updateCustomer(ctx.from.id.toString(), { state: 'awaiting_payment' });

        await ctx.reply(
          getMessage(customer.language, 'quoteAccepted', {
            vendorName: selectedQuote.vendors.company_name,
            amount: selectedQuote.quoted_price
          })
        );

        const paymentAccounts = await getPaymentAccounts(selectedQuote.vendor_id);
if (paymentAccounts.length === 0) {
  await ctx.reply(
    customer.language === 'amharic' 
      ? 'የክፍያ መረጃ በቅርቡ ይላካል።' 
      : 'Payment information will be sent shortly.'
  );
} else {
  let accountsText = '';
  paymentAccounts.forEach((acc, i) => {
    if (customer.language === 'amharic') {
      accountsText += `\n${i + 1}. ${acc.account_holder_name || acc.account_name}\n`;
      accountsText += `   ባንክ: ${acc.bank_name}\n`;
      accountsText += `   ሂሳብ ቁጥር: ${acc.account_number}\n`;
    } else {
      accountsText += `\n${i + 1}. ${acc.account_holder_name || acc.account_name}\n`;
      accountsText += `   Bank: ${acc.bank_name}\n`;
      accountsText += `   Account: ${acc.account_number}\n`;
    }
  });

  const paymentMessage = getMessage(customer.language, 'paymentAccountsInfo', {
    price: selectedQuote.quoted_price,
    accounts: accountsText
  });

  await ctx.reply(paymentMessage);
}
        break;

      case 'creating_order':
        const orderId = userCurrentOrders[ctx.from.id];
        if (orderId) {
          const order = await getOrder(orderId);
          if (order) {
            const currentDesc = order.product_description || '';
            const newDesc = currentDesc + (currentDesc ? '\n\n' : '') + text;
            await updateOrder(orderId, { product_description: newDesc });
            await ctx.reply('✅ ' + (customer.language === 'amharic' ? 'መግለጫ ታክላል' : 'Description added'));
          }
        }
        break;

      case 'creating_order_template':
  const orderId3 = userCurrentOrders[ctx.from.id];
  if (!orderId3) return;
  
  const order3 = await getOrder(orderId3);
  if (!order3 || !order3.template_data) return;
  
  const templateData = order3.template_data;
  const template = getCategoryQuestions(templateData.category);
  const currentStep = templateData.steps[templateData.current_step];
  
  // Handle "skip" for optional steps
  if ((currentStep === 'photo_optional' || currentStep === 'drawings_optional') && text.toLowerCase() === 'skip') {
    templateData.answers[currentStep] = 'Skipped';
    templateData.current_step += 1;
    
    if (templateData.current_step >= templateData.steps.length) {
      // Generate final description based on category
      let description = '';
      
      if (templateData.category === 'manufacturing') {
        // Structured manufacturing order
        description = `━━━ MANUFACTURING ORDER ━━━\n\n`;
        description += `📦 Product: ${templateData.answers.description || 'N/A'}\n`;
        description += `🔩 Materials: ${templateData.answers.materials || 'N/A'}\n`;
        description += `📐 Specifications: ${templateData.answers.specifications || 'N/A'}\n`;
        description += `🔢 Quantity: ${templateData.answers.quantity || 'N/A'} units\n`;
        if (templateData.answers.deadline) {
          description += `📅 Required Delivery: ${templateData.answers.deadline}\n`;
        }
        if (templateData.answers.drawings_optional && templateData.answers.drawings_optional !== 'Skipped') {
          description += `📎 Drawings: ${templateData.answers.drawings_optional}\n`;
        }
        description += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      } else {
        // Regular template format
        description = `Order Details:\n`;
        Object.keys(templateData.answers).forEach(key => {
          if (templateData.answers[key] !== 'Skipped') {
            description += `${key.replace(/_/g, ' ')}: ${templateData.answers[key]}\n`;
          }
        });
      }
      
      await updateOrder(orderId3, {
        product_description: description,
        template_data: templateData,
        status: 'pending_quote'
      });
      
      await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
      delete userCurrentOrders[ctx.from.id];
      
      await ctx.reply(
        customer.language === 'amharic'
          ? '✅ ትዕዛዝዎ ተልኳል! የአምራች የዋጋ ግምት በቅርቡ ይደርስዎታል።'
          : '✅ Order submitted! You will receive a quote from the manufacturer soon.',
        getMainMenuKeyboard(customer.language)
      );
    } else {
      // Ask next question
      await updateOrder(orderId3, { template_data: templateData });
      const nextStep = templateData.steps[templateData.current_step];
      const nextQuestion = template.questions[nextStep][customer.language];
      await ctx.reply(nextQuestion);
    }
    return;
  }
  
  // Validate quantity field
  if (currentStep === 'quantity') {
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 1) {
      await ctx.reply(
        customer.language === 'amharic'
          ? '❌ እባክዎ ትክክለኛ ቁጥር ያስገቡ (ለምሳሌ: 1000)'
          : '❌ Please enter a valid number (e.g., 1000)'
      );
      return;
    }
  }
  
  // Save answer
  templateData.answers[currentStep] = text;
  templateData.current_step += 1;
  
  // Check if done
  if (templateData.current_step >= templateData.steps.length) {
    // Generate final description (same code as above)
    let description = '';
    
    if (templateData.category === 'manufacturing') {
      description = `━━━ MANUFACTURING ORDER ━━━\n\n`;
      description += `📦 Product: ${templateData.answers.description || 'N/A'}\n`;
      description += `🔩 Materials: ${templateData.answers.materials || 'N/A'}\n`;
      description += `📐 Specifications: ${templateData.answers.specifications || 'N/A'}\n`;
      description += `🔢 Quantity: ${templateData.answers.quantity || 'N/A'} units\n`;
      if (templateData.answers.deadline) {
        description += `📅 Required Delivery: ${templateData.answers.deadline}\n`;
      }
      if (templateData.answers.drawings_optional && templateData.answers.drawings_optional !== 'Skipped') {
        description += `📎 Drawings: ${templateData.answers.drawings_optional}\n`;
      }
      description += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    } else {
      description = `Order Details:\n`;
      Object.keys(templateData.answers).forEach(key => {
        if (templateData.answers[key] !== 'Skipped') {
          description += `${key.replace(/_/g, ' ')}: ${templateData.answers[key]}\n`;
        }
      });
    }
    
    await updateOrder(orderId3, {
      product_description: description,
      template_data: templateData,
      status: 'pending_quote'
    });
    
    await updateCustomer(ctx.from.id.toString(), { state: 'idle' });
    delete userCurrentOrders[ctx.from.id];
    
    await ctx.reply(
      customer.language === 'amharic'
        ? '✅ ትዕዛዝዎ ተልኳል! የአምራች የዋጋ ግምት በቅርቡ ይደርስዎታል።'
        : '✅ Order submitted! You will receive a quote from the manufacturer soon.',
      getMainMenuKeyboard(customer.language)
    );
  } else {
    // Ask next question
    await updateOrder(orderId3, { template_data: templateData });
    const nextStep = templateData.steps[templateData.current_step];
    const nextQuestion = template.questions[nextStep][customer.language];
    await ctx.reply(nextQuestion);
  }
  break;

      case 'awaiting_payment':
        await ctx.reply(
          customer.language === 'amharic' 
            ? 'እባክዎ የክፍያ ደረሰኝ ምስል ይላኩ' 
            : 'Please send a payment receipt photo'
        );
        break;
    }
  } catch (error) {
    console.error('Error handling text:', error);
  }
});
// Handle payment receipt (photo uploaded when awaiting payment)



// Poll for new vendor messages every 10 seconds
setInterval(async () => {
  try {
    // Get all unread vendor messages - FIX THE JOIN!
    const { data: messages, error } = await supabase
      .from('order_messages')
      .select(`
        *,
        orders(telegram_id, order_number)
      `)
      .eq('sender_type', 'vendor')
      .eq('is_read', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching vendor messages:', error);
      return;
    }

    // Send each message to customer
    for (const msg of messages || []) {
      const telegramId = msg.orders?.telegram_id;
      const orderNumber = msg.orders?.order_number;
      const language = msg.orders?.customers?.language || 'english';

      if (!telegramId) continue;

      const questionMessage = language === 'amharic'
        ? `❓ የሻጭ ጥያቄ - ትዕዛዝ #${orderNumber}\n\nየሻጭ ጥያቄ: ${msg.message_text}\n\n➡️ እባክዎ መልስዎን ይላኩ:\n(ለማመቻቸት "ለውጡ" ይተይቡ)`
        : `❓ Vendor Question - Order #${orderNumber}\n\nVendor asks: ${msg.message_text}\n\n➡️ Please send your answer:\n(Type "done" when finished)`;

      try {
        await bot.telegram.sendMessage(telegramId, questionMessage);
        
        // Mark as read
        await supabase
          .from('order_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', msg.id);

        // Update customer state
        await updateCustomer(telegramId, { state: 'answering_vendor_question' });
        customerAnsweringOrder[telegramId] = msg.order_id;

        console.log(`✅ Sent vendor question to customer ${telegramId}`);
      } catch (sendError) {
        console.error('Error sending message to Telegram:', sendError);
      }
    }
  } catch (error) {
    console.error('Error in message polling:', error);
  }
}, 10000); // Check every 10 seconds

/// WAITLIST BUTTON HANDLERS - ADD BEFORE module.exports
bot.action(/waitlist_(.+)_(.+)/, async (ctx) => {
  try {
    const customerId = ctx.from.id.toString();
    const customer = await getCustomer(customerId);
    if (!customer) return;
    
    const [, productId, productCode] = ctx.match;
    const result = await addToWaitlist(customerId, productId, productCode);
    
    // NEW ERROR HANDLING - Check if successfully added or already in waitlist
    if (!result.success) {
      if (result.reason === 'already_in_waitlist') {
        // Customer already on waitlist - friendly message
        await ctx.answerCbQuery('Already in waitlist!');
        await ctx.reply(
          customer.language === 'amharic'
            ? '⚠️ አስቀድመው በዚህ ምርት ላይ በዝግታ ዝርዝር ላይ ይገኛሉ።'
            : '⚠️ You\'re already on the waitlist for this product!'
        );
        return;
      } else {
        // Some other error
        await ctx.answerCbQuery('Error adding to waitlist');
        await ctx.reply(
          customer.language === 'amharic'
            ? '❌ ጊዜ ዝርዝር ላይ ለመደመር ቢሞክሩ ስህተት ተከስቷል።'
            : '❌ Sorry, couldn\'t add you to the waitlist. Please try again.'
        );
        return;
      }
    }
    
    // SUCCESS - Product added to waitlist
    await ctx.answerCbQuery('Added to waitlist!');
    await ctx.reply(
      customer.language === 'amharic'
        ? '✅ ወደ ተጠባባቂ ዝርዝር ተጨምረዋል!\n\nአሁን በእጅ ለማዘዝ ይቀጥሉ።'
        : '✅ You have been added to the waitlist!\n\nNow continue with manual ordering.'
    );
    
    // Get vendor and continue with manual ordering
    const orderId = userCurrentOrders[ctx.from.id];
    const order = await getOrder(orderId);
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_category')
      .eq('id', order.vendor_id)
      .single();
    
    const vendorCat = vendor?.business_category || 'general';
    const template = getCategoryQuestions(vendorCat);
    
    if (vendorCat === 'general') {
      await updateCustomer(customerId, { state: 'creating_order' });
      await ctx.reply(template.questions.description[customer.language]);
    } else {
      await updateOrder(orderId, {
        template_data: {
          category: vendorCat,
          current_step: 0,
          steps: template.steps,
          answers: {}
        }
      });
      await updateCustomer(customerId, { state: 'creating_order_template' });
      const firstStep = template.steps[0];
      await ctx.reply(template.questions[firstStep][customer.language]);
    }
  } catch (error) {
    console.error('Error in waitlist handler:', error);
    await ctx.answerCbQuery('Error processing request');
  }
});

bot.action('skip_product', async (ctx) => {
  try {
    const customerId = ctx.from.id.toString();
    const customer = await getCustomer(customerId);
    if (!customer) return;
    
    const orderId = userCurrentOrders[ctx.from.id];
    const order = await getOrder(orderId);
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_category')
      .eq('id', order.vendor_id)
      .single();
    
    const vendorCat = vendor?.business_category || 'general';
    const template = getCategoryQuestions(vendorCat);
    
    if (vendorCat === 'general') {
      await updateCustomer(customerId, { state: 'creating_order' });
      await ctx.reply(template.questions.description[customer.language]);
    } else {
      await updateOrder(orderId, {
        template_data: {
          category: vendorCat,
          current_step: 0,
          steps: template.steps,
          answers: {}
        }
      });
      await updateCustomer(customerId, { state: 'creating_order_template' });
      const firstStep = template.steps[0];
      await ctx.reply(template.questions[firstStep][customer.language]);
    }
    
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in skip_product handler:', error);
    await ctx.answerCbQuery('Error processing');
  }
});

module.exports = bot;
module.exports.sendVendorQuestionToCustomer = sendVendorQuestionToCustomer;