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
// [2026-07-28] 이 진단에는 **조건을 걸지 않는다.**
//   같은 함정을 두 번 밟았다. 처음엔 `if (!IS_DEV) return` 이라 프로덕션에서 침묵했고,
//   그것을 `E2E_DIAG` 환경변수 게이트로 바꿨더니 이번엔 **CI 의 Edge 샌드박스가 그 변수를
//   보지 못해** 또 침묵했다(2026-07-28 실측: 미들웨어가 307 을 내는데도 next-start.log 에
//   이 줄이 없었다 — `!valid` 경로를 탔으므로 함수는 호출됐고 게이트만 false 였다).
//   두 번 다 **정작 문제가 나는 환경에서만 진단이 꺼지는** 구조였다.
//   조건을 없애면 "진단이 켜졌는가"라는 변수 자체가 방정식에서 사라진다.
//   비용은 프로세스당 1회이고, 남기는 것은 SHA-256 앞 8자와 env **존재 여부**(값 아님)뿐이라
//   로그로 시크릿이 새지 않는다.
let fingerprintLogged = false;

async function sha256Prefix(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8ToArrayBuffer(input));
  return Array.from(new Uint8Array(digest))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 미들웨어가 실제로 쥔 시크릿의 지문을 최초 1회만 남긴다.
 *
 * ⚠ 성공·실패와 **무관하게** 남긴다. 그린일 때의 정상값을 모르면 red 를 해석할 수 없고,
 *   실패 시에만 찍으면 "로그가 없다"가 정상인지 진단 미발동인지 구분되지 않는다.
 */
async function logSecretFingerprintOnce(outcome: string): Promise<void> {
  if (fingerprintLogged) return;
  fingerprintLogged = true;
  const fingerprint = await sha256Prefix(JWT_SECRET);
  const source = process.env.JWT_SECRET ? '환경변수 JWT_SECRET' : '내장 dev 기본값(DEV_JWT_SECRET)';
  // Edge 샌드박스가 **어떤 env 를 보는가** 자체가 미관측 변수였다(E2E_DIAG 가 전달됐는데도 안 보였다).
  // 값이 아니라 존재 여부만 남겨 다음 회차에 그 변수를 확정한다.
  const envSeen =
    `NODE_ENV=${process.env.NODE_ENV ?? '(없음)'} · ` +
    `JWT_SECRET=${process.env.JWT_SECRET ? '있음' : '없음'} · ` +
    `E2E_DIAG=${process.env.E2E_DIAG ?? '(없음)'}`;
  console.warn(
    `[Middleware] JWT 검증 ${outcome}. 미들웨어가 쓰는 시크릿 출처=${source}, 지문=${fingerprint}.\n` +
      `  Edge env 가시성: ${envSeen}\n` +
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
    // 서명 불일치는 위조일 수도, 좌우 시크릿 비대칭일 수도 있다. 어느 쪽인지는 지문 대조로만 갈린다.
    await logSecretFingerprintOnce(valid ? '성공' : '실패(서명 불일치)');
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    if (payload.exp && Date.now() >= payload.exp * 1000) return null; // 만료(정상 흐름이므로 경고하지 않는다)
    return payload.role || null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// [보안] /admin 접근 통제 — 기본값 = ADMIN 전용 (deny-by-default)
//
// 과거에는 5개 접두사(system/user/security/stats/workflow)만 ADMIN 을 요구하는 화이트리스트였다.
// 그 결과 /admin 아래 세그먼트 17개 중 12개(collaboration·community·help·notifications·
// observability·operation·sanctn·survey·uss·work-hub·workspace·components)가 게이트 밖이었고,
// 무엇보다 **관리 화면을 새로 추가할 때마다 "로그인만 하면 누구나 진입"이 기본값**이었다.
// 기본값을 뒤집어, 아래 목록에 명시된 경로만 일반 사용자에게 연다.
//
// ⚠ 이 미들웨어는 1차 방어(관리자 UI 셸 진입 차단)일 뿐이며 진짜 방어선이 아니다. 권한의 authoritative
//   집행자는 백엔드다 — ApiSecurityConfig 가 /api/v1/admin/** 를 ROLE_ADMIN·ROLE_SYSTEM 으로 강제하고,
//   컨트롤러/서비스의 @PreAuthorize 가 함수 단위로 재검증한다(백엔드 헌법 제8조).
//   여기서 통과했다는 사실이 데이터 접근 권한을 뜻하지 않으며, 반대로 이 게이트가 뚫려도 데이터는 백엔드가 막는다.
// ────────────────────────────────────────────────────────────────────────────

/**
 * 일반 사용자(비-ADMIN)에게 열어 두는 /admin 하위 경로.
 *
 * 🚨 여기에 경로를 추가하면 로그인한 모든 사용자에게 그 화면이 열린다. 추가 전 반드시 확인할 것:
 *   ① 그 화면이 AdminService(= `/api/v1/admin/**`, 백엔드가 ROLE_ADMIN 강제)를 호출하지 않는가?
 *      호출한다면 열어 봐야 화면만 뜨고 데이터는 403 이다 — 열지 마라.
 *   ② 전사 데이터 CRUD·일괄 발송·정책 변경 같은 '관리 콘솔'이 아닌가?
 * 판단이 애매하면 추가하지 마라. 빠뜨리면 관리자만 쓰지만, 잘못 넣으면 전원에게 열린다.
 */
const USER_ACCESSIBLE_ADMIN_PATHS = [
  '/admin/work-hub',                  // 개인·부서 업무/보고/일정 (dept-jobs·work-reports). 로그인 기본 착지점
  '/admin/collaboration',             // 쪽지·주소록·스크랩·메일 (notes·address-books·scraps·mails)
  '/admin/help',                      // 지식/FAQ/Q&A 열람 (WIKI·FAQ 는 화면 내부에서 별도 admin 제한 중)
  '/admin/community',                 // 커뮤니티 게시판 열람·작성 (관리 콘솔은 아래에서 도려낸다)
  '/admin/survey/polls/participate',  // 온라인 여론조사 '참여'(투표). 설문 '관리'는 열지 않는다
] as const;

/**
 * 위 허용 경로 안쪽이지만 관리자 전용으로 되돌리는 예외 — 허용 목록보다 우선한다.
 * (허용한 세그먼트가 하위에 관리 콘솔을 품고 있는 경우에만 사용)
 */
const ADMIN_ONLY_SUBPATHS = [
  '/admin/community/boards/master',   // 게시판 마스터 콘솔 (boardAdminService)
  '/admin/community/boards/maker',    // 게시판 생성 마법사 (boardAdminService)
  '/admin/community/templates',       // 템플릿 관리 (templateAdminService)
] as const;

/** 세그먼트 경계까지 맞춰 비교한다 — '/admin/help' 가 '/admin/helpdesk' 를 잡지 않도록. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // [Zero-Trust] Origin/Referer 검증: POST, PUT, DELETE, PATCH 요청 시 Origin 헤더가 존재하면 허용된 Host인지 확인
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    if (origin) {
      const host = request.headers.get('host') || '';
      const hostDomain = host.split(':')[0];
      // 부분문자열(includes) 비교는 `https://localhost.attacker.com` 같은 접미사 도메인을
      // 통과시키므로, Origin 을 파싱해 hostname 을 정확히 비교한다.
      let originHostname: string | null = null;
      try {
        originHostname = new URL(origin).hostname;
      } catch {
        originHostname = null;
      }
      const isAllowed =
        originHostname !== null &&
        ['localhost', '127.0.0.1', hostDomain].some(
          (allowed) => allowed && allowed.toLowerCase() === originHostname.toLowerCase()
        );
      if (!isAllowed) {
        return new NextResponse(
          JSON.stringify({ success: false, code: 'INVALID_ORIGIN', message: 'Access denied: untrusted Origin header' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  }

  // 1. 백엔드 API 요청 Proxy Header Injection
  // 브라우저 클라이언트에서 withCredentials 로 동봉한 accessToken HttpOnly 쿠키를 읽어 백엔드 시큐리티가
  // 읽을 수 있도록 Authorization: Bearer <token> 헤더를 주입한다. (서명 재검증은 백엔드가 authoritative
  // 하게 수행하므로 여기서는 주입만 — 미들웨어 검증은 페이지 접근 게이트의 심층방어 계층이다. 헌법 제8조.)
  // [2026-07-26] `/ws` 추가 — SockJS/STOMP 프록시 경로다(next.config.ts 가 :8080/ws 로 rewrite,
  //   백엔드 WebSocketConfig 가 `/ws` 엔드포인트를 withSockJS 로 노출). 종전에는 제외 목록에 없어
  //   미들웨어가 `/ws/**` 를 페이지로 보고 `/login?redirect=%2Fws%2Fiframe.html` 로 리다이렉트했다.
  //   그러면 SockJS 는 iframe 폴백에 HTML 로그인 페이지를 받고, CSP `frame-ancestors 'none'` 이
  //   그 iframe 을 차단해 net::ERR_BLOCKED_BY_RESPONSE 가 난다(2026-07-26 CI 실측).
  //   인증 집행은 /api/v1·/actuator 와 동일하게 **백엔드가 authoritative** 하므로 여기서는 토큰만 주입한다.
  if (pathname.startsWith('/api/v1') || pathname.startsWith('/actuator') || pathname.startsWith('/ws')) {
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

  // 4. /admin 접근 통제 — 기본 ADMIN 전용, USER_ACCESSIBLE_ADMIN_PATHS 에 명시된 경로만 일반 사용자 개방.
  //    라우트 대소문자를 흉내낸 우회(/Admin/system)와 접두사 오매칭(/administrators)을 모두 막기 위해
  //    소문자로 정규화한 뒤 세그먼트 경계로 비교한다.
  const normalizedPath = pathname.toLowerCase();
  if (matchesPrefix(normalizedPath, '/admin')) {
    const normalizedRole = userRole.toUpperCase();
    // 백엔드(ApiSecurityConfig)가 ROLE_ADMIN 과 동급으로 취급하는 ROLE_SYSTEM 을 함께 인정한다.
    // deny-by-default 로 뒤집힌 이상, 여기서 빠뜨리면 API 는 통과하는데 화면만 막히는 비대칭이 생긴다.
    const isAdmin =
      normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN' ||
      normalizedRole === 'SYSTEM' || normalizedRole === 'ROLE_SYSTEM';

    if (!isAdmin) {
      const isUserAccessible =
        USER_ACCESSIBLE_ADMIN_PATHS.some((p) => matchesPrefix(normalizedPath, p)) &&
        !ADMIN_ONLY_SUBPATHS.some((p) => matchesPrefix(normalizedPath, p));

      if (!isUserAccessible) {
        const fallbackUrl = new URL('/', request.url);
        fallbackUrl.searchParams.set('auth_error', 'unauthorized');
        return NextResponse.redirect(fallbackUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
