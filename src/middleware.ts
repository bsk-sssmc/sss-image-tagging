import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/tag', '/gallery'];
// List of paths that require admin access
const adminPaths = ['/dashboard'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('payload-token')?.value;
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, login page, PayloadCMS admin interface, and API routes
  if (
    pathname.startsWith('/_next/') || 
    pathname.includes('.') || 
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_payload/') ||
    pathname.startsWith('/admin')
  ) {
    return NextResponse.next();
  }

  // Check if the path requires authentication or admin access
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
  const isRootPath = pathname === '/';

  // For admin paths, check if user is an admin
  if (isAdminPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if user is an admin by making a request to /api/auth/me
    return fetch(new URL('/api/auth/me', request.url), {
      headers: {
        Cookie: `token=${token}; payload-token=${token}`,
      },
    }).then(async (response) => {
      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const data = await response.json();
      if (!data?.user?.collection || data.user.collection !== 'admins') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return NextResponse.next();
    }).catch(() => {
      return NextResponse.redirect(new URL('/login', request.url));
    });
  }

  // For protected paths, require authentication
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If we have a token and we're on the login page, redirect to home
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For root path without token, redirect to login
  if (isRootPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
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