import { NextRequest, NextResponse } from 'next/server';
import { fetchExternal } from '@/lib/external-fetch';
import { detectImageType } from '@/lib/image-type';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  try {
    const { body } = await fetchExternal(url, 'image');
    const type = detectImageType(body);
    if (!type) throw new Error('Not a raster image');
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': type === 'jpg' ? 'image/jpeg' : `image/${type}`,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: 'Image URL unavailable or not allowed' }, { status: 400 });
  }
}
