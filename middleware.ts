import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Prevent redirects for webhook endpoints
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    console.log('[Middleware] Webhook request detected:', {
      path: request.nextUrl.pathname,
      method: request.method,
      host: request.headers.get('host'),
    });

    // Return early to prevent any redirects
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/webhooks/:path*',
};
