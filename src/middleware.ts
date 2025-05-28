import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/tag', '/gallery'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token') || request.cookies.get('payload-token');
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');

  console.log('Middleware - User Agent:', userAgent);
  console.log('Middleware - Is Safari:', isSafari);
  console.log('Middleware - Path:', pathname);
  console.log('Middleware - Token exists:', token ? 'Yes' : 'No');
  console.log('Middleware - Token name:', token?.name);
  console.log('Middleware - Environment:', process.env.NODE_ENV);

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

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isRootPath = pathname === '/';

  // For protected paths, require authentication
  if (isProtectedPath && !token) {
    console.log('Middleware - Protected path without token, redirecting to login');
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If we have a token and we're on the login page, redirect to home
  if (token && pathname === '/login') {
    console.log('Middleware - Token exists on login page, redirecting to home');
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set cookies with Safari-specific considerations
    const cookieOptions = {
      path: '/',
      sameSite: isSafari ? ('none' as const) : ('lax' as const),
      secure: isSafari || process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    response.cookies.set('token', token.value, cookieOptions);
    if (token.name === 'payload-token') {
      response.cookies.set('payload-token', token.value, cookieOptions);
    }

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // For root path, if we have a token, allow access
  if (isRootPath && token) {
    console.log('Middleware - Root path with token, allowing access');
    const response = NextResponse.next();
    
    // Set cookies with Safari-specific considerations
    const cookieOptions = {
      path: '/',
      sameSite: isSafari ? ('none' as const) : ('lax' as const),
      secure: isSafari || process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    response.cookies.set('token', token.value, cookieOptions);
    if (token.name === 'payload-token') {
      response.cookies.set('payload-token', token.value, cookieOptions);
    }

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  // For root path without token, redirect to login
  if (isRootPath && !token) {
    console.log('Middleware - Root path without token, redirecting to login');
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