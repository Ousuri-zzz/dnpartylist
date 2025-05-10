import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add paths that don't require authentication
const publicPaths = ['/login', '/api/auth'];

// Add paths that are allowed for unapproved users
const unapprovedPaths = ['/set-discord', '/waiting-approval'];

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

  // ตรวจสอบว่าเป็น path ที่อนุญาตสำหรับผู้ใช้ที่ยังไม่ได้รับการอนุมัติหรือไม่
  const isUnapprovedPath = unapprovedPaths.some(path => pathname.startsWith(path));
  
  // ถ้าไม่ใช่ path ที่อนุญาต และเป็นผู้ใช้ที่ยังไม่ได้รับการอนุมัติ ให้ redirect ไปหน้า waiting-approval
  if (!isUnapprovedPath) {
    // ตรวจสอบ approved status จาก cookie
    const approved = request.cookies.get('approved')?.value === 'true';
    if (!approved) {
      return NextResponse.redirect(new URL('/waiting-approval', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|static|api|favicon.ico).*)',
  ],
}; 