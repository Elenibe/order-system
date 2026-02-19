// app/api/product-stock-updated/route.js
export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, productCode, productName, stockStatus } = body;

    if (stockStatus !== 'in_stock') {
      return Response.json({ notified: 0 });
    }

    // Call notify-customers endpoint
    const notifyResponse = await fetch(`http://localhost:3000/api/notify-customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        productCode,
        productName
      })
    });

    const notifyResult = await notifyResponse.json();
    
    return Response.json({ notified: notifyResult.notified || 0 });
  } catch (error) {
    console.error('[v0] Error in product-stock-updated:', error);
    return Response.json({ error: error.message, notified: 0 }, { status: 500 });
  }
}