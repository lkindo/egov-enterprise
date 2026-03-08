import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has('accessToken');
  const userRole = request.cookies.get('userRole')?.value;

  console.log(`[Middleware] Path: ${pathname}, HasToken: ${hasToken}, RawRole: ${userRole}`);

  // 1. 로그인 여부 확인
  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 관리자 권한 확인 (/admin 경로 보호)
  if (pathname.startsWith('/admin')) {
    const normalizedRole = userRole?.toUpperCase() || '';
    const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';

    if (!isAdmin) {
      console.warn(`[Middleware] Unauthorized Admin Access Attempt by ${userRole}`);
      // 권한이 없으면 메인 페이지로 리다이렉트 (강제 새로고침 유도를 위해 URL에 쿼리 추가)
      const fallbackUrl = new URL('/', request.url);
      fallbackUrl.searchParams.set('auth_error', 'unauthorized');
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
