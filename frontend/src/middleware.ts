import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
// Next.js Edge Runtime에 적합한 안전한 JWT 페이로드 파서 및 만료 검증 함수
function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
 
    // Base64Url을 표준 Base64로 전환
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
 
    const payload = JSON.parse(jsonPayload);
 
    // 토큰 만료 시간 선제 검증 (exp는 초 단위 타임스탬프)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.warn('[Middleware Check] Access token has expired');
      return null;
    }
 
    return payload.role || null;
  } catch (e) {
    console.error('[Middleware Check] Failed to parse JWT payload', e);
    return null;
  }
}
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
 
  // 1. 백엔드 API 요청 Proxy Header Injection
  // 브라우저 클라이언트에서 withCredentials 로 동봉한 accessToken HttpOnly 쿠키를 읽어 
  // 백엔드 시큐리티가 읽을 수 있도록 Authorization: Bearer <token> 헤더를 강제 주입하여 리라이팅 우회 처리합니다.
  if (pathname.startsWith('/api/v1')) {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    return NextResponse.next();
  }

  // 2. 로그인 페이지, Next.js 자체 API Route(/api/auth/* 등), 정적 리소스 등은 라우트 보호 생략
  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname === '/governance_harness_atlas.html') {
    return NextResponse.next();
  }
 
  const accessToken = request.cookies.get('accessToken')?.value;
  const hasToken = !!accessToken;
  const userRole = accessToken ? getRoleFromToken(accessToken) : null;
 
  // Always log in E2E environment for debugging
  console.log(`[Middleware Check] Path: ${pathname} | hasToken: ${hasToken} | userRole: ${userRole}`);
 
  // 3. 로그인여부 확인 (유효 토큰이 없거나 만료된 경우 포함)
  if (!hasToken || !userRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
 
  // 4. 관리자/사용자경로 관리(/admin 경로 보호)
  if (pathname.startsWith('/admin')) {
    const normalizedRole = userRole.toUpperCase();
    const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
 
    // 시스템 사용자 보안 민감관리경로
    const isSensitivePath = pathname.startsWith('/admin/system') ||
      pathname.startsWith('/admin/user') ||
      pathname.startsWith('/admin/security') ||
      pathname.startsWith('/admin/stats') ||
      pathname.startsWith('/admin/workflow');
 
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
