import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canEnterRegisteredPage, loadPageAuthorization } from '@/lib/auth/page-authorization';

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
// [진단] 인증 검증 메타 — 결과·설정 출처·환경변수 존재 여부만 최초 1회 남긴다.
//
// 백엔드와 시크릿이 어긋나면 서명 검증이 전량 실패하는데, 그 실패는 지금까지 완전히 무음이었다:
// 로그인 API 는 200 을 주고(미들웨어를 우회하는 경로다), 그 다음 페이지 진입에서 307 로 /login 에
// 되돌아가므로 사용자에겐 "인증 완료 후 다시 로그인창" 으로만 보인다. 원인을 알려주는 신호가
// 코드 어디에도 없어 2026-07-19 에 실제로 오래 헤맸다.
//
// 시크릿 원문뿐 아니라 해시·접두사 같은 안정적인 파생값도 로그에 남기지 않는다. 요청별 결과는
// 비밀값이 없는 `x-mw-auth` 응답 헤더가 주 관측 채널이며, 이 1회 로그는 Edge 환경의 설정 존재와
// 검증 코드 도달 여부만 보조한다.
//
// [2026-07-28] 이 진단에는 **조건을 걸지 않는다.**
//   같은 함정을 두 번 밟았다. 처음엔 `if (!IS_DEV) return` 이라 프로덕션에서 침묵했고,
//   그것을 `E2E_DIAG` 환경변수 게이트로 바꿨더니 이번엔 **CI 의 Edge 샌드박스가 그 변수를
//   보지 못해** 또 침묵했다(2026-07-28 실측: 미들웨어가 307 을 내는데도 next-start.log 에
//   이 줄이 없었다 — `!valid` 경로를 탔으므로 함수는 호출됐고 게이트만 false 였다).
//   두 번 다 **정작 문제가 나는 환경에서만 진단이 꺼지는** 구조였다.
//   조건을 없애면 "진단이 켜졌는가"라는 변수 자체가 방정식에서 사라진다.
let authDiagnosticLogged = false;

/**
 * 토큰 검증 결과 — 신원과 **검증이 끝난 지점**을 함께 돌려준다.
 *
 * ⚠ 왜 응답 헤더로 내보내는가: console 진단이 세 번 침묵했다(dev 게이트 → env 게이트 → 무조건화
 *   후에도 CI 로그에 미출현). Edge 런타임 console 은 `next start` stdout 에 도달하지 않으므로
 *   **삼켜질 수 없는 채널**이 필요하다.
 *
 * ⚠ [2026-07-29] 종전에는 이 값을 **모듈 스코프 전역**(`let lastVerifyOutcome`)에 담았는데
 *   두 가지 결함이 있었다. 진단이 또 거짓 신호를 주면 조사가 다시 막히므로 구조를 바꾼다:
 *   ① **경쟁 조건** — 한 프로세스가 요청을 동시 처리하면(프리페치·RSC·병렬 탭) 다른 요청의
 *      결과가 섞여, 헤더에 실린 값이 그 응답의 것이라는 보장이 없었다.
 *   ② 서명·만료와 별개인 subject/type 검증 실패도 구분한다. 오래된 role claim은
 *      권한 판정에 사용하지 않고, 보호 화면의 권한은 서버에서 다시 조회한다.
 *   시크릿·토큰 조각은 절대 싣지 않는다. 실리는 것은 "쿠키 유무 + 검증이 끝난 지점" 뿐이다.
 */
type VerifyVerdict = { subject: string | null; outcome: string };

/**
 * 인증 검증 결과와 secret-free 설정 메타를 최초 1회만 남긴다.
 *
 * ⚠ 성공·실패와 **무관하게** 남긴다. 그린일 때의 정상값을 모르면 red 를 해석할 수 없고,
 *   실패 시에만 찍으면 "로그가 없다"가 정상인지 진단 미발동인지 구분되지 않는다.
 */
function logAuthDiagnosticOnce(outcome: string): void {
  if (authDiagnosticLogged) return;
  authDiagnosticLogged = true;
  const source = process.env.JWT_SECRET ? '환경변수 JWT_SECRET' : '내장 dev 기본값(DEV_JWT_SECRET)';
  // Edge 샌드박스가 **어떤 env 를 보는가** 자체가 미관측 변수였다(E2E_DIAG 가 전달됐는데도 안 보였다).
  // 값이 아니라 존재 여부만 남겨 다음 회차에 그 변수를 확정한다.
  const envSeen =
    `NODE_ENV=${process.env.NODE_ENV ? '있음' : '없음'} · ` +
    `JWT_SECRET=${process.env.JWT_SECRET ? '있음' : '없음'} · ` +
    `E2E_DIAG=${process.env.E2E_DIAG ? '있음' : '없음'}`;
  console.warn(
    `[Middleware] JWT 검증 ${outcome}. 미들웨어가 쓰는 시크릿 출처=${source}.\n` +
      `  Edge env 가시성(존재 여부만): ${envSeen}\n` +
      `  요청별 검증 결과는 x-mw-auth 응답 헤더에서 확인하십시오.`
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

// 🚨 [2026-07-29] Web Crypto 에는 **Uint8Array 를 그대로** 넘긴다. `.buffer` 를 꺼내지 마라.
//
//   종전에는 두 함수가 `bytes.buffer` / `u.buffer.slice(...)` 로 ArrayBuffer 를 꺼내 넘겼는데,
//   그것이 CI 인증 전량 실패의 원인이었다. Next.js Edge 런타임은 별도 VM realm 에서 돌아가
//   샌드박스가 만든 ArrayBuffer 가 호스트의 `crypto.subtle` 이 아는 ArrayBuffer 와 **다른 realm**
//   이 된다. Node 20 의 Web Crypto 는 이 cross-realm ArrayBuffer 를 거부해 TypeError 를 던졌고,
//   `catch { return null }` 이 그것을 삼켜 **미인증**으로 처리 → 307 /login 리다이렉트가 됐다.
//
//   실측(2026-07-29, CI 와 동일 조합을 로컬 컨테이너로 재현):
//     · 순수 Node 20 / 22        → verify OK        (Node 자체는 무관)
//     · Node 22 + Edge (로컬)    → v=ok             (그래서 로컬에서만 통과했다)
//     · Node 20 + Edge (= CI)    → v=throw-TypeError@verify
//   즉 "로컬은 되는데 CI 만 깨진다"의 정체는 **Node 메이저 × Edge realm** 조합이었다.
//
//   Web Crypto 는 BufferSource(ArrayBuffer | ArrayBufferView)를 받으므로 TypedArray 를 그대로
//   넘기는 것이 표준이고, 불필요한 복사(.slice)도 사라진다. `.buffer` 로 되돌리지 말 것.
function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 반환 타입을 `Uint8Array<ArrayBuffer>` 로 좁힌다. TS 5.7 부터 Uint8Array 가 제네릭이 되어
// `TextEncoder().encode()` 는 `Uint8Array<ArrayBufferLike>` 로 추론되는데, Web Crypto 의 BufferSource
// 는 SharedArrayBuffer 기반을 허용하지 않아 그대로는 타입이 맞지 않는다(빌드 실패).
// TextEncoder 는 언제나 일반 ArrayBuffer 를 쓰므로 런타임 의미는 바뀌지 않는다.
function utf8ToBytes(input: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(input) as Uint8Array<ArrayBuffer>;
}

/**
 * accessToken 의 HMAC 서명·만료·토큰 종류를 검증하고 서명된 subject만 반환한다.
 * 서명 위조·만료·구조 이상·알 수 없는 alg 는 전부 null(=미인증)로 처리한다.
 */
async function verifyAndExtractSubject(token: string): Promise<VerifyVerdict> {
  // 예외가 났을 때 **어느 호출에서** 났는지까지 남긴다. 종전에는 예외 종류만 남겨
  // `throw-TypeError` 로만 보였는데, 그것만으로는 디코딩·키생성·검증 중 어디인지 알 수 없어
  // 원인 특정이 한 단계 더 필요했다(2026-07-29 CI 실측).
  let stage = 'split';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { subject: null, outcome: `parts-${parts.length}` };
    }
    const [headerB64, payloadB64, sigB64] = parts;

    stage = 'decode-header';
    const header = JSON.parse(base64UrlDecodeToString(headerB64));
    const hash = HMAC_HASH[header.alg];
    if (!hash) {
      // alg=none·RS*(비대칭) 등 화이트리스트 밖은 거부
      return { subject: null, outcome: 'alg-unsupported' };
    }

    stage = 'import-key';
    const key = await crypto.subtle.importKey(
      'raw',
      utf8ToBytes(JWT_SECRET),
      { name: 'HMAC', hash: { name: hash } },
      false,
      ['verify']
    );
    stage = 'decode-sig';
    const sigBytes = base64UrlToBytes(sigB64);
    stage = 'encode-data';
    const dataBytes = utf8ToBytes(`${headerB64}.${payloadB64}`);
    stage = 'verify';
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    // 서명 불일치는 위조 또는 설정 비대칭일 수 있으므로 secret-free 진단 메타와 요청 결과를 남긴다.
    stage = 'diagnostic';
    logAuthDiagnosticOnce(valid ? '성공' : '실패(서명 불일치)');
    if (!valid) {
      return { subject: null, outcome: 'sig-mismatch' };
    }

    stage = 'decode-payload';
    const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || Date.now() >= payload.exp * 1000) {
      return { subject: null, outcome: 'expired' };
    }
    if (payload.typ !== 'access') {
      return { subject: null, outcome: 'token-type' };
    }
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub !== payload.sub.trim()) {
      return { subject: null, outcome: 'ok-no-subject' };
    }
    return { subject: payload.sub, outcome: 'ok' };
  } catch (e) {
    // ⚠ 이 catch 가 지금까지 모든 신호를 삼켰다. 예외 종류 + 발생 단계를 남긴다
    //   (메시지는 남기지 않는다 — 토큰 조각이 섞여 나올 수 있다).
    return { subject: null, outcome: `throw-${(e as { name?: string })?.name ?? 'unknown'}@${stage}` };
  }
}

// /admin 화면은 생성된 PAGE_PERMISSIONS의 정확한 등록과 현재 기능 권한으로 판단한다.
// 메뉴 표시나 상위 화면의 인증 전용 선언은 하위 화면 접근을 부여하지 않는다.
// 자료 조회·변경의 최종 인가는 백엔드의 기능 권한과 소유권·공개 범위 검사가 수행한다.

/** '/admin' 경계를 비교하여 '/administrators'와 혼동하지 않는다. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// ────────────────────────────────────────────────────────────────────────────
// [csp Phase 4 · 2026-08-20] nonce 기반 CSP — 'unsafe-inline' 제거 (제품 결정: PPR 포기)
//
//  왜 여기(미들웨어)인가: nonce 는 요청마다 달라야 하므로 next.config 의 정적 headers() 로는
//  만들 수 없다. Next 는 미들웨어가 **요청 헤더**에 실은 Content-Security-Policy 에서 nonce 를
//  읽어 자기가 생성하는 모든 <script> 태그에 자동으로 붙이고, 해당 페이지를 동적 렌더로 전환한다.
//  이 전환(= PPR 포기)이 바로 이 Phase 를 막고 있던 제품 결정이며 2026-08-20 승인됐다.
//
//  정책 구성:
//   - script-src 'self' 'nonce-…': nonce 없는 주입 inline 스크립트는 실행되지 않고, 외부
//     호스트 스크립트는 'self' 가 차단한다. ('strict-dynamic' 미채택 사유는 buildAppCsp 참조.)
//     Next 가 만들지 않는 inline <script>(next-themes 테마 초기화)에는 x-nonce 요청 헤더로
//     nonce 를 전파해 layout 이 prop 으로 넘긴다 — nextWithCsp 의 주석 참조.
//   - script-src-attr 'none': Phase 2 유지 — inline 이벤트 핸들러 차단.
//   - style-src 'unsafe-inline' 잔존: React style prop(= style 속성)이 전면 사용 중이라
//     여기서 빼면 앱 전체 스타일이 죽는다.
//     [2026-08-30 측정 완료] Phase 3(elem/attr 세분화)은 **지금 이득이 없다**. 설치본 실측:
//       · framer-motion 12.43.0 — createElement("style") 직후 `if (nonce) style.nonce = nonce`
//         가 있어 nonce 를 지원한다(주입은 AnimatePresence popLayout 경로 한정).
//       · sonner 2.0.7 — 모듈 최상위에서 __insertCSS 를 2회 호출해 전체 스타일시트를 <style>
//         로 삽입하는데 패키지 전체에 'nonce' 가 0건이다. 끌 수도 nonce 를 붙일 수도 없다.
//     따라서 style-src-elem 에서 unsafe-inline 을 빼면 토스트가 전부 무스타일이 되고,
//     style-src-attr 은 React style prop 때문에 어차피 unsafe-inline 이 필요하다 — 쪼개면
//     지시문만 둘로 늘고 보안 이득은 0 이다. 재검토 조건은 sonner 의 nonce 지원(또는 교체)이며
//     csp-policy 계약이 그때 red 로 알린다.
//   - dev 는 'unsafe-eval' 추가(HMR)·connect-src ws: 만 다르고 nonce 구조는 동일하다 —
//     dev/prod 정책 구조가 갈라지면 위반을 dev 에서 못 보고 CI 에서 처음 만나게 된다.
//
//  ⚠ public/governance_harness_atlas.html 은 예외다. 정적 파일이라 Next 가 nonce 를 심어 줄
//  수 없고, 자체 inline <script> 블록으로 동작한다. 그 문서에만 Phase 2 정책(elem inline 허용 +
//  attr 차단)을 유지한다. 예외의 재확산은 csp-policy 계약이 차단한다(정확히 이 한 경로만 허용).
// ────────────────────────────────────────────────────────────────────────────

/** Edge 런타임 Web Crypto 로 요청당 128bit nonce 를 만든다. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildAppCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  // ⚠ 'strict-dynamic' 을 쓰지 않는다 — CI run 32310837353 실측: strict-dynamic 은 host 허용
  //   ('self')을 꺼버리는데, Next 가 스트리밍 중 문서에 삽입(parser-inserted)하는 lazy chunk
  //   <script src="/_next/static/chunks/…"> 태그 일부에 nonce 가 붙지 않아 앱이 전면 차단됐다
  //   (e2e 3샤드 전체 red — "Loading the script … violates … Note that 'strict-dynamic' is
  //   present, so host-based allowlisting is disabled"). 로컬 /login 검증은 초기 청크만 건드려
  //   이 경로를 지나치지 않았다.
  //   'self'+nonce 조합의 실효 방어는 이 앱에서 동등하다: 주입 inline <script> 는 nonce 가 없어
  //   차단되고, 외부 호스트 스크립트는 'self' 가 차단하며, 같은 출처 업로드 파일을 script 로
  //   로드하는 우회는 전역 X-Content-Type-Options: nosniff(비-JS MIME 실행 거부)가 차단한다.
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}'`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`;
  const connectSrc = isProd ? `connect-src 'self'` : `connect-src 'self' ws: wss:`;
  return (
    `default-src 'self'; ${scriptSrc}; script-src-attr 'none'; ` +
    // [2026-08-29] img-src 에서 외부 호스트(images.unsplash.com)를 걷는다. 이 허용의 유일한
    //   소비자였던 BoardPreview 의 목 데이터 사진이 사라져 지금은 아무도 쓰지 않는다.
    //   쓰지 않는 외부 출처를 열어 두면 정책이 실제보다 넓다고 말하는 셈이다.
    //   ⚠ 이 주석에 스킴(h t t p s ://)을 적지 말 것 — csp-policy 계약의 본문 추출은 주석의
    //   URL 을 남기므로 외부 호스트 부재 단언이 자기 주석에 걸려 red 가 된다.
    `style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; ` +
    `font-src 'self'; ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; ` +
    `frame-ancestors 'none'; report-uri /api/security/csp; report-to csp-endpoint;`
  );
}

/** Atlas 전용 — Phase 2 정책(inline <script> 요소 허용 + inline 핸들러 차단). */
const ATLAS_CSP =
  `default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; ` +
  `style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; ` +
  `connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; ` +
  `frame-ancestors 'none'; report-uri /api/security/csp; report-to csp-endpoint;`;

export async function proxy(request: NextRequest) {
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

  // 2-a. Atlas 정적 문서 — nonce 를 심을 수 없는 자체 inline <script> 문서라 Phase 2 정책을 유지한다.
  if (pathname === '/governance_harness_atlas.html') {
    const atlasResponse = NextResponse.next();
    atlasResponse.headers.set('Content-Security-Policy', ATLAS_CSP);
    return atlasResponse;
  }

  // 2-b. Next.js 자체 API Route(/api/auth/* 등)·정적 리소스 — 문서가 아니므로 CSP 불요.
  if (pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // 여기부터는 HTML 문서 응답 경로다. 요청당 nonce 를 만들고 **요청 헤더**에 CSP 를 실어
  // Next 가 자기 <script> 태그 전부에 nonce 를 붙이게 한 뒤, 응답 헤더에도 같은 정책을 단다.
  const nonce = generateNonce();
  const csp = buildAppCsp(nonce);
  const withNonce = (response: NextResponse): NextResponse => {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };
  const nextWithCsp = (): NextResponse => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('content-security-policy', csp);
    // Next 의 자동 nonce 부착은 **Next 가 생성하는** <script> 에만 미친다. 앱/라이브러리가 직접
    // 렌더하는 inline <script>(현재 next-themes 테마 초기화 1건)는 layout 이 headers() 로 이
    // 값을 읽어 nonce prop 으로 넘겨야 한다 — 빠뜨리면 그 스크립트만 조용히 차단된다
    // (2026-08-20 CI e2e 실측: sha256-J9cZ… 단일 해시 전 페이지 차단. "앱 소스에 inline
    // <script> 0건" 전수 grep 은 라이브러리가 렌더하는 것을 보지 못했다).
    // ⚠ set() 은 외부에서 실어 보낸 x-nonce 를 덮어쓴다 — 외부 주입값이 문서에 닿을 일은 없다.
    requestHeaders.set('x-nonce', nonce);
    return withNonce(NextResponse.next({ request: { headers: requestHeaders } }));
  };

  // 2-c. 로그인 페이지 — 라우트 보호는 생략하되 문서이므로 nonce CSP 는 적용한다.
  if (pathname.startsWith('/login')) {
    return nextWithCsp();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  // [보안] 서명·만료·access token 종류를 검증한다. role claim은 권한으로 사용하지 않는다.
  const verdict: VerifyVerdict = accessToken
    ? await verifyAndExtractSubject(accessToken)
    : { subject: null, outcome: 'no-cookie' };
  const userSubject = verdict.subject;

  // [진단] 검증이 끝난 지점을 응답 헤더로 남긴다. 비밀값 없음 — 쿠키 유무와 종료 지점뿐.
  //   ⚠ 성공 응답에도 붙인다: 그린일 때의 정상값(`v=ok`)을 모르면 red 를 해석할 수 없고,
  //     "헤더가 없다"가 정상인지 미들웨어 미실행인지 구분되지 않는다(진단이 세 번 침묵한 전례).
  const authDiag = `cookie=${accessToken ? 1 : 0};v=${verdict.outcome}`;

  // 3. 유효(서명·만료 검증 통과) 토큰이 없으면 로그인으로.
  //    ⚠ 쿠키를 삭제하지 않는다 — 여기서 삭제하면 프리페치/RSC/전환적 요청 한 번의 검증 실패가
  //    유효 세션을 영구 로그아웃시키는 함정이 된다(원본 동작 보존). 실제 무효 토큰은 백엔드 401 로도 처리된다.
  if (!userSubject) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // 리다이렉트는 문서를 렌더하지 않지만, 헤더 일관성을 위해 CSP 를 함께 싣는다.
    const redirect = withNonce(NextResponse.redirect(loginUrl));
    redirect.headers.set('x-mw-auth', authDiag);
    return redirect;
  }

  // 4. /admin 접근 통제 — 모든 화면을 등록된 개별 정책과 서버의 현재 기능 권한으로 판단한다.
  //    라우트 대소문자를 흉내낸 우회(/Admin/system)와 접두사 오매칭(/administrators)을 모두 막기 위해
  //    소문자로 정규화한 뒤 세그먼트 경계로 비교한다.
  const normalizedPath = pathname.toLowerCase();
  if (matchesPrefix(normalizedPath, '/admin')) {
    const authorization = accessToken ? await loadPageAuthorization(accessToken, userSubject) : null;
    // Next 라우트의 대소문자는 보존한다. insertScrap 같은 등록된 경로를 소문자로 바꾸지 않는다.
    if (!authorization || !canEnterRegisteredPage(pathname, authorization)) {
        const fallbackUrl = new URL('/', request.url);
        fallbackUrl.searchParams.set('auth_error', 'unauthorized');
        const denied = withNonce(NextResponse.redirect(fallbackUrl));
        // 인증은 됐고 **권한**이 부족한 경우다. /login 리다이렉트와 구분돼야 진단이 성립한다.
        denied.headers.set('x-mw-auth', `${authDiag};deny=permission`);
        return denied;
    }
  }

  const pass = nextWithCsp();
  pass.headers.set('x-mw-auth', authDiag);
  return pass;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
