import { NextRequest } from 'next/server';
import { generateSignedUrl, getKeyFromUrl } from '@/lib/s3';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return Response.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const key = getKeyFromUrl(url);
    const signedUrl = await generateSignedUrl(key);

    return Response.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 