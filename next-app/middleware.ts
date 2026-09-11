import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from './lib/rate-limiter';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req.headers);
  const start = Date.now();

  // ─── 1. Handle CORS Preflight for API Routes ──────────────────────────────
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin') || '*';
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ─── 2. Rate Limiting Policies for API Endpoints ──────────────────────────
  if (pathname.startsWith('/api/')) {
    let limit = 200;
    let windowSeconds = 60;
    let rateKey = `gen:${ip}`;

    // Auth endpoints: 10 req / min
    if (
      pathname.includes('/auth/login') ||
      pathname.includes('/client/login') ||
      pathname.includes('/auth/forgot-password') ||
      pathname.includes('/auth/reset-password')
    ) {
      limit = 10;
      windowSeconds = 60;
      rateKey = `auth:${ip}`;
    }
    // Public submission endpoints: 20 req / min
    else if (
      pathname === '/api/public/registration' ||
      pathname === '/api/public/content/contact' ||
      pathname === '/api/public/contact'
    ) {
      limit = 20;
      windowSeconds = 60;
      rateKey = `sub:${ip}`;
    }

    const rateResult = checkRateLimit(rateKey, limit, windowSeconds);

    if (!rateResult.allowed) {
      const retryAfter = Math.max(1, rateResult.reset - Math.ceil(Date.now() / 1000));
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
            retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateResult.reset),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(rateResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateResult.reset));
    response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (assets, css, js, svg, png)
     */
    '/((?!_next/static|_next/image|favicon.ico|css/|js/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
