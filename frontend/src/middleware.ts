import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has('accessToken');
  const userRole = request.cookies.get('userRole')?.value;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware Check] Path: ${pathname} | hasToken: ${hasToken} | userRole: ${userRole}`);
  }

  // 0. ?덇굅님寃쎈줈 由щ떎?대젆님(?섏쐞 ?명솚님諛?E2E ?덉젙님
  const legacyMap: Record<string, string> = {
    '/cop/adb': '/admin/collaboration/address-book',
    '/cop/bbs': '/admin/community/boards',
    '/cop/cmy': '/admin/community/clubs',
    '/cop/scp': '/admin/collaboration/scraps',
    '/cop/djm': '/admin/work-hub',
    '/approvals': '/admin/sanctn/forms',
    '/cop/smt/sim': '/admin/work-hub',
  };

  const legacyTarget = Object.keys(legacyMap).find(key => pathname.startsWith(key));
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyMap[legacyTarget], request.url));
  }

  // 1. 濡쒓렇님?щ? ?뺤씤
  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 愿由ъ옄/?ъ슜님寃쎈줈 愿由?(/admin 寃쎈줈 蹂댄샇)
  if (pathname.startsWith('/admin')) {
    const normalizedRole = userRole?.toUpperCase() || '';
    const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';

    // ?쒖뒪님?ъ슜님보안 님誘쇨컧님愿由?寃쎈줈
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
