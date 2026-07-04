import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname === '/governance_harness_atlas.html') {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has('accessToken');
  const userRole = request.cookies.get('userRole')?.value;

  // 1. 로그인여부 확인
  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 관리자 경로 UX 리다이렉트(/admin)
  //    ⚠ 보안 경계 아님: userRole 쿠키는 클라이언트가 위조 가능하다.
  //    실제 인가는 백엔드가 강제한다 — ApiSecurityConfig: `/api/v1/admin/** → hasAnyRole('ADMIN','SYSTEM')`.
  //    (완전한 httpOnly 세션 전환은 FE·BE 동일 오리진(리버스 프록시) 선행 필요 — 별도 과제)
  if (pathname.startsWith('/admin')) {
    const normalizedRole = userRole?.toUpperCase() || '';
    // 백엔드 ApiSecurityConfig 가 hasAnyRole('ADMIN','SYSTEM') 로 인가하므로 SYSTEM 도 포함한다.
    const isAdmin = ['ADMIN', 'ROLE_ADMIN', 'SYSTEM', 'ROLE_SYSTEM'].includes(normalizedRole);

    // 시스템 사용자 보안 민감관리경로
    const isSensitivePath = pathname.startsWith('/admin/system') ||
      pathname.startsWith('/admin/user') ||
      pathname.startsWith('/admin/security') ||
      pathname.startsWith('/admin/stats') ||
      pathname.startsWith('/admin/workflow') ||
      // 인사/제재/협업(메일이력 등) 관리 화면 — 이전엔 목록에서 빠져 있어 비관리자도
      // 페이지 셸을 로드할 수 있었다(데이터 API는 백엔드가 별도로 차단하지만, 클라이언트
      // 게이트도 일관되게 걸어 UX상 오해를 없앤다).
      pathname.startsWith('/admin/sanctn') ||
      pathname.startsWith('/admin/operation') ||
      pathname.startsWith('/admin/collaboration');

    if (isSensitivePath && !isAdmin) {
      console.warn(`[Middleware] Sensitive Admin Access Attempt Refused for ${userRole} from ${pathname}`);
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
