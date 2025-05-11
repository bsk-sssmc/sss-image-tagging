import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/tag'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token') || request.cookies.get('payload-token');
  const { pathname } = request.nextUrl;

  // Skip middleware only for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  console.log('Middleware - Checking path:', pathname);
  console.log('Middleware - Token exists:', token ? 'Yes' : 'No');

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isApiPath = pathname.startsWith('/api/');

  // For API routes and protected paths, require authentication
  if ((isProtectedPath || isApiPath) && !token) {
    console.log('Middleware - Protected/API path without token, redirecting to login');
    if (isApiPath) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Redirect to login page if accessing protected route without token
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If we have a token and we're on the login page, redirect to home
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}; 