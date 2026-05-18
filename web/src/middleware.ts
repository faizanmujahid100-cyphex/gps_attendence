import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === '/login' || pathname === '/';

  // Middleware runs on edge — we use a client-side cookie to detect auth state
  // Full role-based protection is done in each layout component
  if (pathname.startsWith('/admin') || pathname.startsWith('/teacher')) {
    const authCookie = request.cookies.get('gigccl-auth');
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*'],
};
