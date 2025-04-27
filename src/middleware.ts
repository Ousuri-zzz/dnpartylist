import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that don't require authentication
const publicPaths = ['/login', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths and static files
  if (publicPaths.some(path => pathname.startsWith(path)) || 
      pathname.includes('_next') || 
      pathname.includes('static') ||
      pathname.includes('api')) {
    return NextResponse.next();
  }

  // Get the Firebase Auth session token from cookies
  const session = request.cookies.get('session');
  
  // Redirect to login if no session exists
  if (!session && pathname !== '/login') {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Allow access to protected routes if session exists
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/mypage', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 