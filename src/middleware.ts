import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that don't require authentication
const publicPaths = ['/login', '/api/auth'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths and static files
  if (publicPaths.some(path => pathname.startsWith(path)) || 
      pathname.includes('_next') || 
      pathname.includes('static') ||
      pathname.includes('api')) {
    return NextResponse.next();
  }

  // ตรวจสอบว่าอยู่ในหน้า Trade หรือไม่
  const isTradePage = pathname.startsWith('/trade');

  // ถ้าไม่มี token และพยายามเข้าถึงหน้าที่ต้องการการยืนยันตัวตน
  if (!token) {
    // เก็บ URL ปัจจุบันไว้สำหรับ redirect กลับมาหลังจาก login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('redirect-url', pathname, {
      path: '/',
      maxAge: 60 * 60, // 1 hour
      httpOnly: true,
      sameSite: 'lax'
    });
    return response;
  }

  // ถ้ามี token และพยายามเข้าหน้า login ให้ redirect ไปที่ mypage
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/mypage', request.url));
  }

  // ถ้าอยู่ในหน้า Trade และมี token ให้ปล่อยผ่านไปได้เลย
  if (isTradePage && token) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/mypage/:path*',
    '/guild-donate/:path*',
    '/trade/:path*',
    '/login'
  ],
}; 