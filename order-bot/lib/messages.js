// lib/messages.js

const messages = {
  english: {
    welcome: `Welcome to Our Order Service! 🛍️

I'll help you place and manage your orders easily.

First, let's get you registered.`,

    askRegistrationType: "Are you registering as:",

    askCompanyName: "Please enter your company name:",

    askTIN: "Please enter your company TIN (Tax Identification Number):",

    askFullName: "Please enter your full name:",

    askPhoneNumber:
      "Please provide your phone number:\n\nYou can type it or click the button below to share your contact.",

    askAddress: "Please enter your delivery address:",

    registrationComplete: `✅ Registration completed successfully!

Your details:
{details}

What would you like to do?`,

    mainMenu: `What would you like to do?

Choose an option below:`,

    orderStart: `📦 New Order

Please send me details about the product you want to order.

You can send:
• Text description with details (quantity, size, thickness, brand, etc.)
• Images of the product
• Voice messages describing what you need
• PDF files or documents

After sending all details, type /submit to complete your order.`,

    orderReceived: `✅ Order received!

Order Number: {orderNumber}
Status: Submitted

Our team will review your order and get back to you with pricing soon.

You can check your order status anytime with the "Check Order Status" button.`,

vendorQuestion: "❓ Vendor Question - Order #{orderNumber}\n\nVendor asks: {question}\n\nPlease send your answer:",
  answerReceived: "✅ Answer received! The vendor will review it.\n\nType 'done' when you finish answering.",
  conversationFinished: "✅ Thank you! The vendor is reviewing your answers.",
  noMessages: "No messages yet for this order.",
  viewMessages: "💬 View Messages",

    quoteAccepted: `✅ Quote Accepted!

You have selected {vendorName}
Total Amount: {amount} Birr

Please proceed to payment instructions below.`,

    askPaymentMethod: `💰 Payment Information

Your order total: {price} Birr

Please choose your payment method:`,

    paymentAccountsInfo: `💳 Payment Accounts

Please transfer {price} Birr to one of these accounts:

{accounts}

After payment, please send the payment receipt and we'll confirm your order.`,

    paymentReceived: `✅ Payment received successfully!

Thank you for your payment. We have confirmed your order.

You can check your order status anytime with the "Check Order Status" button.`,

    orderStatusInfo: `📋 Order Status

Order Number: {orderNumber}
Status: {status}
{priceInfo}
Created: {date}

{statusDescription}`,

    noOrders: 'You don\'t have any orders yet. Click "New Order" to place your first order.',

    editRegistration: "Which information would you like to edit?",

    registrationUpdated: "✅ Registration information updated successfully!",

    invalidPhone:
      "❌ Invalid phone number. Please provide a valid Ethiopian phone number (e.g., 0912345678 or +251912345678)",

    invalidTIN: "❌ Invalid TIN number. TIN should be 10 digits.",

    invalidCompanyName: "❌ Company name is too short. Please enter a valid company name.",

    invalidName: "❌ Name is too short. Please enter your full name.",

    orderSubmitted: "✅ Order submitted successfully! We'll review it and get back to you soon.",

    noActiveOrder: 'You don\'t have an active order to submit. Click "New Order" to start a new order.',

    help: `📋 Help

Available actions:
• New Order - Place a new product order
• Check Order Status - View your order status
• Edit Registration - Update your information

Need assistance? Contact our support team.`,

    statusDescriptions: {
      pending_submission: "You are currently creating this order. Send product details and type /submit when ready.",
      submitted: "Your order has been submitted and is waiting for review.",
      price_checking: "Our team is checking prices and availability for your order.",
      awaiting_payment: "Price has been set. Please proceed with payment.",
      payment_received: "Payment received! We are processing your order.",
      processing: "Your order is being processed and prepared.",
      ready_for_delivery: "Your order is ready for delivery!",
      delivered: "Order delivered successfully. Thank you!",
      cancelled: "This order has been cancelled.",
    },
  },

  amharic: {
    welcome: `እንኳን ወደ የእኛ የማዘዣ አገልግሎት በደህና መጡ! 🛍️

ትዕዛዝዎን በቀላሉ እንዲያስገቡና እንዲያስተዳድሩ እርዳዎታለሁ።

መጀመሪያ እንመዘገብ።`,

    askRegistrationType: "እንደ ምን ይመዘገባሉ:",

    askCompanyName: "እባክዎ የድርጅትዎን ስም ያስገቡ:",

    askTIN: "እባክዎ የድርጅትዎን ቲን ቁጥር ያስገቡ:",

    askFullName: "እባክዎ ሙሉ ስምዎን ያስገቡ:",

    askPhoneNumber: "እባክዎ የስልክ ቁጥርዎን ያቅርቡ:\n\nመተይብ ይችላሉ ወይም ከታች ያለውን ቁልፍ በመጫን መላክ ይችላሉ።",

    askAddress: "እባክዎ መጠበቂያ አድራሻዎን ያስገቡ:",

    registrationComplete: `✅ ምዝገባ በተሳካ ሁኔታ ተጠናቅቋል!

የእርስዎ ዝርዝሮች:
{details}

ምን ማድረግ ይፈልጋሉ?`,

    mainMenu: `ምን ማድረግ ይፈልጋሉ?

ከታች አንዱን ይምረጡ:`,

    orderStart: `📦 አዲስ ትዕዛዝ

እባክዎ ማዘዝ የሚፈልጉትን ምርት ዝርዝር ይላኩልኝ።

መላክ ይችላሉ:
• የጽሁፍ መግለጫ ከዝርዝሮች ጋር (ብዛት፣ መጠን፣ ውፍረት፣ ብራንድ፣ ወዘተ)
• የምርቱ ምስሎች
• የሚፈልጉትን የሚገልጽ የድምፅ መልእክት
• PDF ፋይሎች ወይም ሰነዶች

ሁሉንም ዝርዝሮች ካስገቡ በኋላ /submit በመተየብ ትዕዛዙን ያጠናቅቁ።`,

    orderReceived: `✅ ትዕዛዝ ደርሷል!

የትዕዛዝ ቁጥር: {orderNumber}
ሁኔታ: ገብቷል

ቡድናችን ትዕዛዝዎን እየገመገመ ነው እና በቅርቡ ስለ ዋጋው እናሳውቅዎታለን።

የትዕዛዝ ሁኔታን በማንኛውም ጊዜ "የትዕዛዝ ሁኔታ ያረጋግጡ" ቁልፍ በመጠቀም ማየት ይችላሉ።`,

  vendorQuestion: "❓ የሻጭ ጥያቄ - ትዕዛዝ #{orderNumber}\n\nየሻጭ ጥያቄ: {question}\n\nእባክዎ መልስዎን ይላኩ:",
  answerReceived: "✅ መልስ ደረሰ! የሻጭ ይመለከታል።\n\nለማመቻቸት 'ለውጡ' ይተይቡ።",
  conversationFinished: "✅ አመሰግናለን! የሻጭ መልስዎን እየመተሸ ነው።",
  noMessages: "ገና ምንም መልዕክት የለም።",
  viewMessages: "💬 መልዕክቶችን ይመለከቱ",

    quoteAccepted: `✅ ጥቅሱ ተቀበለ!

{vendorName}ን መርጠዋል
ጠቅላላ መጠን: {amount} ብር

እባክዎ ከታች በተዘረዘሩት የክፍያ መመሪያዎች ይቀጥሉ።`,

    askPaymentMethod: `💰 የክፍያ መረጃ

የትዕዛዝዎ ጠቅላላ: {price} ብር

እባክዎ የክፍያ መንገድዎን ይምረጡ:`,

    paymentAccountsInfo: `💳 የክፍያ መለያዎች

እባክዎ {price} ብር ወደ እነዚህ መለያዎች አንዱ ያስተላልፉ:

{accounts}

ከክፍያ በኋላ፣ እባክዎን የክፍያ ደረሰኝ ይላኩ እና ትዕዛዝዎን እናረጋግጣለን።`,

    paymentReceived: `✅ የክፍያ በተሳካ ሁኔታ ደርሷል!

ለክፍያዎ እናመሰግናለን። ትዕዛዝዎን ወስደናል።

የትዕዛዝ ሁኔታን በማንኛውም ጊዜ "የትዕዛዝ ሁኔታ ያረጋግጡ" ቁልፍ በመጠቀም ማየት ይችላሉ።`,

    orderStatusInfo: `📋 የትዕዛዝ ሁኔታ

የትዕዛዝ ቁጥር: {orderNumber}
ሁኔታ: {status}
{priceInfo}
የተፈጠረበት: {date}

{statusDescription}`,

    noOrders: 'ገና ምንም ትዕዛዝ የለዎትም። የመጀመሪያ ትዕዛዝዎን ለማስገባት "አዲስ ትዕዛዝ" ን ይጫኑ።',

    editRegistration: "የትኛውን መረጃ ማስተካከል ይፈልጋሉ?",

    registrationUpdated: "✅ የምዝገባ መረጃ በተሳካ ሁኔታ ተሻሽሏል!",

    invalidPhone: "❌ ልክ ያልሆነ የስልክ ቁጥር። እባክዎ ትክክለኛ የኢትዮጵያ የስልክ ቁጥር ያቅርቡ (ለምሳሌ 0912345678 ወይም +251912345678)",

    invalidTIN: "❌ ልክ ያልሆነ ቲን ቁጥር። ቲን 10 አሃዞች መሆን አለበት።",

    invalidCompanyName: "❌ የድርጅት ስም በጣም አጭር ነው። እባክዎ ትክክለኛ የድርጅት ስም ያስገቡ።",

    invalidName: "❌ ስም በጣም አጭር ነው። እባክዎ ሙሉ ስምዎን ያስገቡ።",

    orderSubmitted: "✅ ትዕዛዝ በተሳካ ሁኔታ ገብቷል! እንገመግመዋለን እና በቅርቡ እናገኝዎታለን።",

    noActiveOrder: 'ለማስገባት ንቁ ትዕዛዝ የለዎትም። አዲስ ትዕዛዝ ለመጀመር "አዲስ ትዕዛዝ" ን ይጫኑ።',

    help: `📋 እገዛ

የሚቻሉ ድርጊቶች:
• አዲስ ትዕዛዝ - አዲስ የምርት ትዕዛዝ ያስገቡ
• የትዕዛዝ ሁኔታ ያረጋግጡ - የትዕዛዝ ሁኔታዎን ይመልከቱ
• ምዝገባ ያስተካክሉ - መረጃዎን ያዘምኑ

እገዛ ይፈልጋሉ? የድጋፍ ቡድናችንን ያነጋግሩ።`,

    statusDescriptions: {
      pending_submission: "በአሁኑ ጊዜ ይህንን ትዕዛዝ እየፈጠሩ ነው። የምርት ዝርዝሮችን ይላኩ እና ዝግጁ ሲሆኑ /submit ይተይቡ።",
      submitted: "ትዕዛዝዎ ገብቷል እና ለግምገማ እየተጠበቀ ነው።",
      price_checking: "ቡድናችን ለትዕዛዝዎ ዋጋዎችን እና ተገኝነትን እየፈተሸ ነው።",
      awaiting_payment: "ዋጋ ተወስኗል። እባክዎ በክፍያ ይቀጥሉ።",
      payment_received: "ክፍያ ደርሷል! ትዕዛዝዎን እያካሄድን ነው።",
      processing: "ትዕዛዝዎ እየተሰራ እና እየተዘጋጀ ነው።",
      ready_for_delivery: "ትዕዛዝዎ ለማድረስ ዝግጁ ነው!",
      delivered: "ትዕዛዝ በተሳካ ሁኔታ ተላልፏል። እናመሰግናለን!",
      cancelled: "ይህ ትዕዛዝ ተሰርዟል።",
    },
  },
}

function getMessage(language, key, replacements = {}) {
  // Navigate nested keys (e.g., 'statusDescriptions.submitted')
  const keys = key.split(".")
  let msg = messages[language]

  for (const k of keys) {
    msg = msg[k]
    if (!msg) return key // Return key if not found
  }

  // Replace placeholders
  Object.keys(replacements).forEach((placeholder) => {
    msg = msg.replace(new RegExp(`{${placeholder}}`, "g"), replacements[placeholder])
  })

  return msg
}

module.exports = { messages, getMessage }
