import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ────────────────────────────────────────────────────────────────────────────
// [보안] JWT 서명 검증 (Edge 런타임 네이티브 Web Crypto, 외부 의존 없음)
//  - 백엔드(JwtTokenProvider)와 동일 시크릿·동일 바이트 인코딩이어야 한다. 백엔드는 secretKey.getBytes()
//    (base64 디코드 없이 raw bytes)를 HMAC 키로 쓰므로 여기서도 base64 디코드 금지 — TextEncoder().encode(raw).
//  - alg 는 시크릿 길이로 자동 추론되어 dev 기본값(88바이트)은 HS512 다. HS256/384/512 를 모두 허용하되
//    header.alg 를 신뢰하지 않고 화이트리스트로만 매핑한다(alg=none·비대칭 혼동 공격 차단).
//  - prod 에서 JWT_SECRET 미설정이면 모듈 로드 시 즉시 throw(fail-fast) — 공개된 dev 기본값으로 조용히
//    서명 검증하는 최악 상태를 방지한다.
// ────────────────────────────────────────────────────────────────────────────
const DEV_JWT_SECRET = 'dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci1lZ292LWVudGVycHJpc2UtbW9kZXJuaXphdGlvbg==';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('[Middleware] prod 환경에 JWT_SECRET 이 설정되지 않았습니다 (fail-fast: 공개 dev 시크릿 사용 금지).');
}
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET;
const HMAC_HASH: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

// ────────────────────────────────────────────────────────────────────────────
// [진단] 시크릿 지문 — 값이 아니라 SHA-256 앞 8자만 남긴다.
//
// 백엔드와 시크릿이 어긋나면 서명 검증이 전량 실패하는데, 그 실패는 지금까지 완전히 무음이었다:
// 로그인 API 는 200 을 주고(미들웨어를 우회하는 경로다), 그 다음 페이지 진입에서 307 로 /login 에
// 되돌아가므로 사용자에겐 "인증 완료 후 다시 로그인창" 으로만 보인다. 원인을 알려주는 신호가
// 코드 어디에도 없어 2026-07-19 에 실제로 오래 헤맸다.
//
// JwtTokenProvider 도 기동 시 같은 규칙의 지문을 찍는다. 두 지문이 다르면 그것이 곧 원인이다.
// ────────────────────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== 'production';
let secretFingerprint = '(계산 전)';
let fingerprintLogged = false;

async function sha256Prefix(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8ToArrayBuffer(input));
  return Array.from(new Uint8Array(digest))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** dev 에서 서명 검증이 실패했을 때 단 한 번만, 원인 후보와 지문을 함께 알린다. */
async function warnSignatureMismatchOnce(): Promise<void> {
  if (!IS_DEV || fingerprintLogged) return;
  fingerprintLogged = true;
  secretFingerprint = await sha256Prefix(JWT_SECRET);
  const source = process.env.JWT_SECRET ? '환경변수 JWT_SECRET' : '내장 dev 기본값(DEV_JWT_SECRET)';
  console.warn(
    `[Middleware] JWT 서명 검증 실패. 미들웨어가 쓰는 시크릿 출처=${source}, 지문=${secretFingerprint}.\n` +
      `  백엔드 기동 로그의 "JWT secret fingerprint" 와 이 값이 다르면 좌우 시크릿 비대칭이 원인입니다.\n` +
      `  (한쪽만 루트 .env 를 받은 경우 발생. 'npm run dev' 로 함께 띄우면 대칭이 보장됩니다.)`
  );
}

function base64UrlDecodeToString(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(
    atob(b64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

function base64UrlToArrayBuffer(input: string): ArrayBuffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function utf8ToArrayBuffer(input: string): ArrayBuffer {
  const u = new TextEncoder().encode(input);
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

/**
 * accessToken 의 HMAC 서명과 만료(exp)를 모두 검증하고 payload.role 을 반환한다.
 * 서명 위조·만료·구조 이상·알 수 없는 alg 는 전부 null(=미인증)로 처리한다.
 */
async function verifyAndExtractRole(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(base64UrlDecodeToString(headerB64));
    const hash = HMAC_HASH[header.alg];
    if (!hash) return null; // alg=none·RS*(비대칭) 등 화이트리스트 밖은 거부

    const key = await crypto.subtle.importKey(
      'raw',
      utf8ToArrayBuffer(JWT_SECRET),
      { name: 'HMAC', hash: { name: hash } },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToArrayBuffer(sigB64),
      utf8ToArrayBuffer(`${headerB64}.${payloadB64}`)
    );
    if (!valid) {
      // 서명 불일치. 위조일 수도, 좌우 시크릿 비대칭일 수도 있다 — dev 에서만 후자를 짚어준다.
      await warnSignatureMismatchOnce();
      return null;
    }

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    if (payload.exp && Date.now() >= payload.exp * 1000) return null; // 만료(정상 흐름이므로 경고하지 않는다)
    return payload.role || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 백엔드 API 요청 Proxy Header Injection
  // 브라우저 클라이언트에서 withCredentials 로 동봉한 accessToken HttpOnly 쿠키를 읽어 백엔드 시큐리티가
  // 읽을 수 있도록 Authorization: Bearer <token> 헤더를 주입한다. (서명 재검증은 백엔드가 authoritative
  // 하게 수행하므로 여기서는 주입만 — 미들웨어 검증은 페이지 접근 게이트의 심층방어 계층이다. 헌법 제8조.)
  if (pathname.startsWith('/api/v1') || pathname.startsWith('/actuator')) {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // 2. 로그인 페이지, Next.js 자체 API Route(/api/auth/* 등), 정적 리소스 등은 라우트 보호 생략
  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname === '/governance_harness_atlas.html') {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  // [보안] 서명 + 만료를 실제로 검증한다. 위조 토큰의 role=ADMIN 통과(관리자 UI 셸 열람)를 차단.
  const userRole = accessToken ? await verifyAndExtractRole(accessToken) : null;

  // 3. 유효(서명·만료 검증 통과) 토큰이 없으면 로그인으로.
  //    ⚠ 쿠키를 삭제하지 않는다 — 여기서 삭제하면 프리페치/RSC/전환적 요청 한 번의 검증 실패가
  //    유효 세션을 영구 로그아웃시키는 함정이 된다(원본 동작 보존). 실제 무효 토큰은 백엔드 401 로도 처리된다.
  if (!userRole) {
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
