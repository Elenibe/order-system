// app/api/telegram-image/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('file_id');
  
  if (!fileId) {
    return NextResponse.json({ error: 'No file_id provided' }, { status: 400 });
  }

  const botToken = process.env.BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    // Step 1: Get file path from Telegram
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return NextResponse.json({ error: 'Could not get file from Telegram' }, { status: 404 });
    }

    // Step 2: Fetch the actual image
    const imageUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Could not fetch image' }, { status: 404 });
    }

    // Step 3: Return the image with proper headers
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching Telegram image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}