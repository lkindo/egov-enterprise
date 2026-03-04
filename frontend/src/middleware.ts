import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has('accessToken');
  const userRole = request.cookies.get('userRole')?.value;

  // 1. 로그인 여부 확인
  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 관리자 권한 확인 (/admin 경로 보호)
  const normalizedRole = userRole?.startsWith('ROLE_') ? userRole : `ROLE_${userRole}`;
  if (pathname.startsWith('/admin') && normalizedRole !== 'ROLE_ADMIN') {
    // 권한이 없으면 메인 대시보드로 리다이렉트
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
