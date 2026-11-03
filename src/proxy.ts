import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const origin = process.env.EDITOR_ORIGIN;
    let host: string | null = null;
    try { host = origin ? new URL(origin).host : null; } catch { /* fail closed */ }
    if (!host || request.headers.get('host') !== host) {
      return new NextResponse('投稿画面は本番の指定ドメインから利用してください。', {
        status: 403, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
      });
    }
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
