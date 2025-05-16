import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/tag', '/gallery'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token') || request.cookies.get('payload-token');
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Skip middleware for static files, login page, and PayloadCMS API routes
  if (
    pathname.startsWith('/_next/') || 
    pathname.includes('.') || 
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_payload/')
  ) {
    return NextResponse.next();
  }

  console.log('Middleware - Checking path:', pathname);
  console.log('Middleware - Token exists:', token ? 'Yes' : 'No');

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isRootPath = pathname === '/';

  // For protected paths, require authentication
  if (isProtectedPath && !token) {
    console.log('Middleware - Protected path without token, redirecting to login');
    // Redirect to login page if accessing protected route without token
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If we have a token and we're on the login page, redirect to home
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For root path, if we have a token, allow access
  if (isRootPath && token) {
    return NextResponse.next();
  }

  // For root path without token, redirect to login
  if (isRootPath && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - _payload (PayloadCMS routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|_payload).*)',
  ],
}; 