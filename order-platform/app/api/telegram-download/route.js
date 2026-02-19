import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('file_id');
  const fileType = searchParams.get('file_type');

  if (!fileId) {
    return NextResponse.json({ error: 'No file_id provided' }, { status: 400 });
  }

  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  try {
    // Get file path from Telegram
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return NextResponse.json({ error: 'Could not get file from Telegram' }, { status: 404 });
    }

    // Fetch the actual file
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Could not fetch file' }, { status: 404 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    let contentType = 'application/octet-stream';
    let extension = 'bin';
    let filename = 'file';

    // Set correct content type and extension based on file type
    if (fileType === 'image') {
      contentType = 'image/jpeg';
      extension = 'jpg';
      filename = 'image';
    } else if (fileType === 'document') {
      contentType = 'application/pdf';
      extension = 'pdf';
      filename = 'document';
    } else if (fileType === 'voice') {
      contentType = 'audio/mpeg';
      extension = 'mp3';
      filename = 'voice';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${extension}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}