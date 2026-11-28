import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canEnterRegisteredPage, loadPageAuthorization, requiresRegisteredPermission } from '@/lib/auth/page-authorization';
import { VERIFIED_USER_HEADER, consumeVerifiedPageUser, signVerifiedUserHeader } from '@/lib/auth/verified-user-forward';
import { loginReturnPath } from '@/lib/auth/login-return-path';
import { shouldUseSecureSessionCookie } from '@/lib/auth/session-cookie-policy';
import { isTrustedEdgeProxyEnabled } from '@/lib/api/forwarded-client-ip';
import { REQUEST_PATHNAME_HEADER } from '@/i18n/surfaces';

// ────────────────────────────────────────────────────────────────────────────
// [보안] JWT 서명 검증(ADR-0060). ES256 공개키(JWT_VERIFY_KEYS_JSON)만 받으므로 Next 가 침해돼도 토큰을 만들 수 없다.
//  alg 는 ES256 하나만 허용한다(alg=none·HS*·RS* 혼동 공격 차단). 엄격 운영 모드에서는 공개키 누락·커밋된 개발용
//  검증키를 모듈 로드 때 거부한다(fail-fast).
// ────────────────────────────────────────────────────────────────────────────
const DEV_JWT_VERIFY_KID = 'dev-es256-1';
const DEV_JWT_VERIFY_SPKI_B64 =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEFCkLmpfLgQUqDWWzzBAdV7oKO7Hvtltivk4PlGoMa+dn+6myuWj6EcyRdFFvm0CgWhIiqpujMY7lBU5LmpKGsw==';
const KID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_VERIFY_KEYS = 16;

const ALLOW_DEV_JWT_VERIFY_KEYS = process.env.ALLOW_DEV_JWT_VERIFY_KEYS === 'true';
const IS_STRICT_PROD = process.env.NODE_ENV === 'production' && !ALLOW_DEV_JWT_VERIFY_KEYS;

function standardBase64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function canonicalBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function parseVerifyKeyEntries(rawJson: string | undefined, strictProd: boolean): Record<string, string> {
  if (!rawJson || !rawJson.trim()) {
    if (strictProd) {
      throw new Error('[Middleware] prod 환경에 JWT_VERIFY_KEYS_JSON 이 설정되지 않았습니다 (fail-fast: 공개 dev 검증키 사용 금지).');
    }
    return Object.assign(Object.create(null), { [DEV_JWT_VERIFY_KID]: DEV_JWT_VERIFY_SPKI_B64 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('[Middleware] JWT_VERIFY_KEYS_JSON JSON 형식이 올바르지 않습니다.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('[Middleware] JWT_VERIFY_KEYS_JSON 은 JSON 객체여야 합니다.');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length < 1 || entries.length > MAX_VERIFY_KEYS) {
    throw new Error('[Middleware] JWT_VERIFY_KEYS_JSON 은 1~16개의 키를 담아야 합니다.');
  }
  const out: Record<string, string> = Object.create(null);
  for (const [kid, value] of entries) {
    if (!KID_PATTERN.test(kid) || typeof value !== 'string' || !value.trim()) {
      throw new Error('[Middleware] JWT_VERIFY_KEYS_JSON 키·값 형식이 올바르지 않습니다.');
    }
    let normalizedB64: string;
    try {
      normalizedB64 = canonicalBase64(standardBase64ToBytes(value));
    } catch {
      throw new Error('[Middleware] JWT_VERIFY_KEYS_JSON 의 SPKI Base64 를 해석할 수 없습니다.');
    }
    if (strictProd && normalizedB64 === DEV_JWT_VERIFY_SPKI_B64) {
      throw new Error('[Middleware] prod 환경에서 공개 개발용 JWT 검증키를 사용할 수 없습니다.');
    }
    out[kid] = normalizedB64;
  }
  return out;
}

const VERIFY_KEYS_B64 = parseVerifyKeyEntries(process.env.JWT_VERIFY_KEYS_JSON, IS_STRICT_PROD);
const importedEcKeyCache = new Map<string, Promise<CryptoKey>>();

function getEcVerifyKey(kid: string): Promise<CryptoKey> {
  const cached = importedEcKeyCache.get(kid);
  if (cached) return cached;
  const encoded = VERIFY_KEYS_B64[kid];
  // 부르는 쪽이 등록된 kid 인지 먼저 본다(Object.hasOwn). 없는 kid 는 키를 만들지 않고 거부한다.
  if (encoded === undefined) return Promise.reject(new Error('unknown verify key id'));
  const spkiBytes = standardBase64ToBytes(encoded);
  const promise = crypto.subtle.importKey(
    'spki',
    spkiBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  importedEcKeyCache.set(kid, promise);
  return promise;
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256HexPrefix8(data: Uint8Array): string {
  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  // 형식 배열의 색인은 모두 고정 길이 안이다(w·SHA256_K 는 64, h 는 8) — 아래 단언(!)은 그 경계를 적은 것이다.
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15]!;
      const w2 = w[i - 2]!;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!, e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i]! + w[i]!) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    const rounds = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i]! + rounds[i]!) | 0;
  }
  return ((h[0]! >>> 0).toString(16).padStart(8, '0')).slice(0, 8);
}

// ────────────────────────────────────────────────────────────────────────────
// [진단] 인증 검증 메타 — 결과·설정 출처·환경변수 존재 여부만 최초 1회 남긴다. 서명키와 검증키가 어긋나면 로그인 API 는
// 200 인데 다음 페이지 진입이 /login 으로 되돌아가 원인이 드러나지 않는다. 비밀값은 원문도 파생값(해시·접두사)도 남기지 않고,
// 요청별 결과는 `x-mw-auth` 응답 헤더가 주 관측 채널이다. 조건(dev·env 게이트)을 걸지 않는다 — 게이트는 문제가 나는 환경에서 진단을 끈다.
let authDiagnosticLogged = false;

/**
 * 토큰 검증 결과 — 신원과 검증이 끝난 지점을 함께 돌려준다. outcome 은 서버 로그가 보이지 않는 실행에서도 볼 수 있게 응답 헤더로
 * 내보낸다. 모듈 전역이 아니라 요청마다 값으로 돌려준다 — 동시 요청(프리페치·RSC·병렬 탭)의 결과가 섞이지 않는다.
 * 비밀값·토큰 조각은 싣지 않는다.
 */
type VerifyVerdict = { subject: string | null; outcome: string };

/**
 * 인증 검증 결과와 secret-free 설정 메타를 최초 1회만 남긴다. 성공·실패와 무관하게 남긴다 — 실패 때만 찍으면
 * 로그가 없는 것이 정상인지 진단 미발동인지 가를 수 없다.
 */
function logAuthDiagnosticOnce(outcome: string): void {
  if (authDiagnosticLogged) return;
  authDiagnosticLogged = true;
  const verifySource = process.env.JWT_VERIFY_KEYS_JSON
    ? '환경변수 JWT_VERIFY_KEYS_JSON'
    : '내장 dev 기본값(dev-es256-1)';
  const spkiHashes = Object.entries(VERIFY_KEYS_B64)
    .map(([kid, b64]) => `${kid}=${sha256HexPrefix8(standardBase64ToBytes(b64))}`)
    .join(',');
  // 프록시 런타임이 어떤 env 를 보는지 확인하려고 값이 아니라 존재 여부·공개키 요약 해시만 남긴다.
  const envSeen =
    `NODE_ENV=${process.env.NODE_ENV ? '있음' : '없음'} · ` +
    `JWT_VERIFY_KEYS_JSON=${process.env.JWT_VERIFY_KEYS_JSON ? '있음' : '없음'} · ` +
    `E2E_DIAG=${process.env.E2E_DIAG ? '있음' : '없음'}`;
  console.warn(
    `[Middleware] JWT 검증 ${outcome}. 검증키 출처=${verifySource}(spkiSha8=${spkiHashes}).\n` +
      `  Edge env 가시성(존재 여부만): ${envSeen}\n` +
      `  요청별 검증 결과는 x-mw-auth 응답 헤더에서 확인하세요.`
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

// Web Crypto 에는 Uint8Array 를 그대로 넘기고 `.buffer` 를 꺼내지 않는다. 별도 VM realm(Edge 런타임)에서 꺼낸 ArrayBuffer 는
// 호스트 `crypto.subtle` 이 다른 realm 값으로 보고 거부한다(Node 20 + Edge 에서 TypeError → 전량 미인증).
function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 반환 타입을 `Uint8Array<ArrayBuffer>` 로 둔다 — Web Crypto 의 BufferSource 는 SharedArrayBuffer 기반을 받지 않는다.
function utf8ToBytes(input: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(input) as Uint8Array<ArrayBuffer>;
}

/**
 * accessToken 의 ES256 서명·만료·토큰 종류를 검증하고 서명된 subject만 반환한다.
 * 서명 위조·만료·구조 이상·알 수 없는 alg 는 전부 null(=미인증)로 처리한다.
 */
async function verifyAndExtractSubject(token: string): Promise<VerifyVerdict> {
  // 예외가 난 단계(디코딩·키 생성·검증 등)를 outcome 에 남긴다 — 예외 종류만으로는 어디서 났는지 알 수 없다.
  let stage = 'split';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { subject: null, outcome: `parts-${parts.length}` };
    }
    // 바로 위에서 셋인지 확인했다 — 빈 값 대체는 쓰이지 않고, 쓰이더라도 디코딩·서명 검증에서 거부된다.
    const [headerB64 = '', payloadB64 = '', sigB64 = ''] = parts;

    stage = 'decode-header';
    const header = JSON.parse(base64UrlDecodeToString(headerB64)) as { alg?: unknown; kid?: unknown };
    let valid: boolean;
    if (header.alg === 'ES256') {
      if (typeof header.kid !== 'string' || !Object.hasOwn(VERIFY_KEYS_B64, header.kid)) {
        return { subject: null, outcome: 'kid-unknown' };
      }
      stage = 'import-key';
      const ecKey = await getEcVerifyKey(header.kid);
      stage = 'decode-sig';
      const sigBytes = base64UrlToBytes(sigB64);
      if (sigBytes.byteLength !== 64) {
        return { subject: null, outcome: 'sig-length' };
      }
      stage = 'encode-data';
      const dataBytes = utf8ToBytes(`${headerB64}.${payloadB64}`);
      stage = 'verify';
      valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, ecKey, sigBytes, dataBytes);
    } else {
      // alg=none·HS*·RS* 등 ES256 밖은 거부
      return { subject: null, outcome: 'alg-unsupported' };
    }
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
    // 예외 종류와 발생 단계만 남긴다 — 메시지에는 토큰 조각이 섞여 나올 수 있다.
    return { subject: null, outcome: `throw-${(e as { name?: string })?.name ?? 'unknown'}@${stage}` };
  }
}

/** '/admin' 경계를 비교하여 '/administrators'와 혼동하지 않는다. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// ────────────────────────────────────────────────────────────────────────────
// nonce 기반 CSP. nonce 는 요청마다 달라야 해 next.config 의 정적 headers() 가 아니라 여기서 만든다. Next 는 요청 헤더의 CSP 에서
// nonce 를 읽어 자기 <script> 에 붙이며, 그러려면 페이지가 동적 렌더여야 해 루트 레이아웃이 force-dynamic 이다(PPR 포기는 승인된
// 제품 결정이다).
//  - script-src 'self' 'nonce-…': 주입 inline 스크립트와 외부 호스트 스크립트를 막는다. Next 밖 inline <script>(next-themes)에는
//    x-nonce 요청 헤더로 nonce 를 넘긴다. script-src-attr 'none' 은 inline 이벤트 핸들러를 막는다.
//  - style-src 'unsafe-inline' 은 수용 위험이다(GAP-FE-001): React style prop 이 쓰고 sonner 2.0.7 이 nonce 없이 <style> 을 주입해
//    elem/attr 로 쪼개도 이득이 없다. 재검토 조건은 sonner 의 nonce 지원 또는 교체다(지시문을 쪼개면 csp-policy 계약이 이 근거를 다시 보게 한다).
//  - dev 는 'unsafe-eval'(HMR)·connect-src ws: 만 다르다 — 구조가 갈라지면 위반을 dev 에서 못 보고 CI 에서 처음 만난다.
// ────────────────────────────────────────────────────────────────────────────

/** Edge 런타임 Web Crypto 로 요청당 128bit nonce 를 만든다. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * 이중 제출 CSRF 토큰 쿠키(백엔드 CredentialCookieCsrfPolicy). axios 가 X-XSRF-TOKEN 헤더로 되돌려 보내고 백엔드가 둘을 대조한다.
 * 서버 렌더링만 거친 화면의 첫 쓰기가 토큰 없이 나가지 않게 문서 응답에서 없으면 만든다 — 쿠키와 헤더가 같기만 하면 되므로
 * 여기서 만든 값도 같은 효력이다.
 */
const CSRF_TOKEN_COOKIE = 'XSRF-TOKEN';

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ensureCsrfTokenCookie(request: NextRequest, response: NextResponse): void {
  if (request.cookies.get(CSRF_TOKEN_COOKIE)?.value) return;
  response.cookies.set(CSRF_TOKEN_COOKIE, generateCsrfToken(), {
    // 같은 출처 JavaScript 가 읽어 헤더로 보내야 하므로 HttpOnly 가 아니다. Secure 는 세션 쿠키와 같은 정책이다(ADR-0010).
    httpOnly: false,
    secure: shouldUseSecureSessionCookie(
      request,
      process.env.NODE_ENV,
      process.env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true',
    ),
    sameSite: 'strict',
    path: '/',
  });
}

function buildAppCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  // 'strict-dynamic' 을 쓰지 않는다 — host 허용('self')이 꺼져 Next 가 스트리밍 중 삽입하는 nonce 없는 lazy chunk 가 막히고
  //   앱이 전면 차단된다. 같은 출처 업로드 파일을 script 로 싣는 우회는 전역 X-Content-Type-Options: nosniff 가 막는다 — 첨부
  //   다운로드는 비-JavaScript MIME(application/octet-stream)이라 script 로 실행되지 않는다. 그 MIME 을 바꾸면 이 전제를 다시 본다.
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}'`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`;
  const connectSrc = isProd ? `connect-src 'self'` : `connect-src 'self' ws: wss:`;
  return (
    `default-src 'self'; ${scriptSrc}; script-src-attr 'none'; ` +
    // img-src 에 외부 호스트를 두지 않는다 — 쓰지 않는 출처를 열면 정책이 실제보다 넓어진다.
    `style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; ` +
    // 게시판 영상은 인증된 첨부 응답을 Blob URL로 재생한다. 외부 영상 출처는 열지 않는다.
    `media-src 'self' blob:; ` +
    `font-src 'self'; ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; ` +
    `frame-ancestors 'none'; report-uri /api/security/csp; report-to csp-endpoint;`
  );
}

/**
 * CSP 위반 리포트 수집 경로와 report-to 그룹(csp-endpoint) 정의. 경로는 위 CSP 의 report-uri 와 같아야 한다(csp-policy 계약이
 * 검사한다). CSP 가 있는 응답은 모두 이 파일을 지나므로 next.config.ts 에 같은 헤더를 두지 않고 여기를 단일 소스로 둔다.
 */
const CSP_REPORT_PATH = '/api/security/csp';
const REPORTING_ENDPOINTS = `csp-endpoint="${CSP_REPORT_PATH}"`;

/**
 * 문서 응답의 교차 출처 격리·리포팅 헤더. COOP same-origin 은 이 문서가 연 교차 출처 창을 다른 browsing context group 으로 떼어
 * 새 창 링크가 noopener 를 빠뜨려도 그 창이 opener 를 쥐지 못하게 한다. 같은 정책의 같은 출처 창은 그룹을 유지하므로 링크의
 * noopener 규율은 그대로 지킨다.
 */
function applyDocumentSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Reporting-Endpoints', REPORTING_ENDPOINTS);
  return response;
}

/** httpxy 가 WebSocket 프록시로 보는 요청과 같은 판정이다(`Upgrade` 헤더 또는 `Connection` 의 upgrade 토큰). */
function isUpgradeRequest(headers: Headers): boolean {
  return headers.has('upgrade') || /(?:^|,)\s*upgrade\s*(?:$|,)/i.test(headers.get('connection') ?? '');
}

function isEncodedAuthTokenPath(pathname: string): boolean {
  if (!pathname.includes('%') && !pathname.includes(';')) return false;
  try {
    // Static Next routes match the encoded path, while the upstream can decode a path segment.
    // Reject only aliases of these token endpoints; encoded business resource identifiers remain valid.
    // A `;` path parameter also misses the static route and reaches the rewrite, so strip it before matching.
    const canonical = decodeURIComponent(pathname).replace(/;[^/]*/g, '');
    return /^\/api\/v1\/auth\/(?:login|logout|reissue|mfa(?:\/.*)?)\/?$/.test(canonical);
  } catch {
    // Malformed paths are handled by normal routing/upstream validation, not guessed or recursively decoded.
    return false;
  }
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/** TLS 가 앞단에서 끝나면 여기서는 스킴을 알 수 없다. 기본 포트(80·443)는 같은 값으로 보고 나머지 포트는 정확히 비교한다. */
function effectivePort(port: string): string {
  return port === '80' || port === '443' ? '' : port;
}

/**
 * 쓰기 요청의 출처가 이 요청의 Host 와 같은가. 비교 대상은 Next 의 내부 URL 이 아니라 Edge 가 그대로 넘긴 Host 다.
 * 루프백끼리는 포트를 묻지 않고(개발 서버), 공개 주소로 온 요청의 루프백 Origin 은 받지 않는다(OriginValidationFilter 와 같다).
 */
function isSameRequestAuthority(source: string, host: string): boolean {
  try {
    const sourceUrl = new URL(source);
    const hostUrl = new URL(`http://${host}`);
    const sourceHostname = sourceUrl.hostname.toLowerCase();
    const hostHostname = hostUrl.hostname.toLowerCase();
    if (LOOPBACK_HOSTNAMES.has(hostHostname)) return LOOPBACK_HOSTNAMES.has(sourceHostname);
    return sourceHostname === hostHostname && effectivePort(sourceUrl.port) === effectivePort(hostUrl.port);
  } catch {
    return false;
  }
}

/** 브라우저가 스스로 불러오는 부속 자원. 본문에 심은 <img>·SVG·CSS url() 도 여기에 든다. */
const SUBRESOURCE_DESTINATIONS = new Set(['image', 'audio', 'video', 'track', 'style', 'script', 'font', 'object', 'embed']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 쓰기 요청의 출처(Origin, 없으면 Referer)가 이 Host 인지 본다. 둘 다 없는 요청은 브라우저의 교차 출처 쓰기가 아니다.
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && pathname.startsWith('/api')) {
    const source = request.headers.get('origin') ?? request.headers.get('referer');
    if (source && !isSameRequestAuthority(source, request.headers.get('host') ?? request.nextUrl.host)) {
      return new NextResponse(
        JSON.stringify({ success: false, code: 'INVALID_ORIGIN', message: 'Access denied: untrusted Origin header' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (isEncodedAuthTokenPath(pathname)) {
    return NextResponse.json({
      success: false, code: 'INVALID_AUTH_PATH', message: '요청 경로가 올바르지 않습니다.',
    }, { status: 400 });
  }

  // 1. 백엔드 API·/actuator·/ws(SockJS/STOMP) 프록시 — HttpOnly accessToken 쿠키를 Authorization: Bearer 헤더로 옮긴다.
  //    서명 재검증과 인증 집행은 백엔드가 한다(헌법 제8조). 미들웨어 검증은 페이지 접근 게이트의 심층방어 계층이다.
  //    /ws 를 페이지로 다루면 SockJS iframe 폴백이 로그인 페이지를 받아 frame-ancestors 'none' 에 막힌다.
  if (pathname.startsWith('/api/v1') || pathname.startsWith('/actuator') || pathname.startsWith('/ws')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(VERIFIED_USER_HEADER);
    const accessToken = request.cookies.get('accessToken')?.value;
    // 쿠키를 Bearer 로 바꿔 주는 대상은 화면 코드의 요청과 문서 이동이다. 부속 자원에 주입하면 게시글 본문에 심은
    // <img src="/api/v1/…"> 가 열람자 권한으로 API 를 부른다. 화면의 첨부 그림은 fetch 로 받으므로 영향이 없다.
    const subresource = SUBRESOURCE_DESTINATIONS.has(request.headers.get('sec-fetch-dest') ?? '');
    if (accessToken && !subresource) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    // 앞단 프록시가 덮어쓴 값이 아니면 클라이언트가 보낸 값이다. 지우면 백엔드는 Next 를 접속지로 본다 — 인증 BFF 와 같은
    // 경계다(forwarded-client-ip.ts, ADR-0019). Next 는 이 헤더가 없을 때만 채우므로 여기서 값을 가려낼 수 없다.
    if (!isTrustedEdgeProxyEnabled()) {
      for (const name of ['x-forwarded-for', 'x-real-ip', 'forwarded']) requestHeaders.delete(name);
    }
    // 백엔드 연결을 유휴 상태로 다시 쓰지 않는다(GAP-FE-002·DEC-OPS-333). Next 16 rewrite(httpxy)의 keep-alive Agent 는 유휴 소켓을
    //   Tomcat(20초)보다 오래 들고 있어 닫힌 소켓에 요청이 실리면 `socket hang up` → 500 이 된다. `Connection: close` 면 요청마다 새
    //   연결이다(edge 운영 형상은 이미 이 헤더를 싣는다). WebSocket 업그레이드는 `Connection: upgrade` 가 있어야 해 건드리지 않는다.
    if (!isUpgradeRequest(requestHeaders)) requestHeaders.set('Connection', 'close');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Next.js 자체 API Route(/api/auth/* 등)·정적 리소스 — 문서가 아니므로 CSP 불요.
  if (pathname.startsWith('/api') || pathname.startsWith('/images') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // 여기부터는 HTML 문서 경로다. 요청 헤더에 CSP 를 실어 Next 가 자기 <script> 에 nonce 를 붙이게 하고, 응답 헤더에도 같은 정책을 단다.
  const nonce = generateNonce();
  const csp = buildAppCsp(nonce);
  const withNonce = (response: NextResponse): NextResponse => {
    response.headers.set('Content-Security-Policy', csp);
    applyDocumentSecurityHeaders(response);
    ensureCsrfTokenCookie(request, response);
    return response;
  };
  const nextWithCsp = (verifiedUserHeader?: string): NextResponse => {
    const requestHeaders = new Headers(request.headers);
    // 외부 요청자가 위조해 실은 내부 전달 헤더는 빈 값으로 덮어써 x-middleware-override-headers 에 포함시키고, 검증 통과 시에만 새로 서명해 싣는다.
    requestHeaders.set(VERIFIED_USER_HEADER, verifiedUserHeader ?? '');
    requestHeaders.set('content-security-policy', csp);
    // Next 는 자기가 만드는 <script> 에만 nonce 를 붙인다. 앱·라이브러리가 렌더하는 inline <script>(next-themes 테마 초기화)는
    // layout 이 이 값을 읽어 nonce prop 으로 넘긴다 — 빠뜨리면 그 스크립트만 조용히 차단된다. set() 은 외부가 실은 x-nonce 를 덮어쓴다.
    requestHeaders.set('x-nonce', nonce);
    // 레이아웃은 경로를 받지 못해 문서 언어(html[lang])를 그 화면의 로케일로 그리도록 요청 경로를 싣는다(ADR-0063).
    //   외부가 실은 같은 이름의 값은 덮어쓴다(언어 선택에만 쓰고 인가·보안 판정에는 쓰지 않는다).
    requestHeaders.set(REQUEST_PATHNAME_HEADER, pathname);
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

  // [진단] 검증이 끝난 지점을 응답 헤더로 남긴다(비밀값 없이 쿠키 유무와 종료 지점뿐). 성공 응답에도 붙인다 —
  //   그래야 헤더가 없는 것이 미들웨어 미실행임을 가를 수 있다.
  const authDiag = `cookie=${accessToken ? 1 : 0};v=${verdict.outcome}`;

  // 3. 유효 토큰이 없으면 로그인으로. 쿠키는 지우지 않는다 — 프리페치·RSC 요청 한 번의 검증 실패가 유효 세션을 로그아웃시킨다.
  //    실제 무효 토큰은 백엔드 401 로도 처리된다.
  if (!userSubject) {
    const loginUrl = new URL('/login', request.url);
    // 경로와 자리를 가리키는 구조 키만 넘긴다 — 자유 입력은 /login URL 에 싣지 않는다(DEC-OPS-200).
    loginUrl.searchParams.set('redirect', loginReturnPath(pathname, request.nextUrl.search));
    // 리다이렉트는 문서를 렌더하지 않지만, 헤더 일관성을 위해 CSP 를 함께 싣는다.
    const redirect = withNonce(NextResponse.redirect(loginUrl));
    redirect.headers.set('x-mw-auth', authDiag);
    return redirect;
  }

  // 4. 페이지 접근 통제 — /admin 의 모든 화면과 기능권한이 등록된 /admin 밖 화면을 생성된 PAGE_PERMISSIONS 의 정확한 등록과
  //    서버의 현재 기능 권한으로 판단한다(권한이 빈 배열인 /admin 밖 화면은 인증만으로 열린다). 메뉴 표시나 상위 화면의 인증 전용
  //    선언은 하위 화면 접근을 주지 않고, 자료 조회·변경의 최종 인가는 백엔드의 기능 권한과 소유권·공개 범위 검사가 한다.
  //    대소문자 우회(/Admin/system)와 접두사 오매칭(/administrators)은 소문자 정규화 뒤 세그먼트 경계 비교로 막는다.
  let signedVerifiedUser: string | undefined;
  const normalizedPath = pathname.toLowerCase();
  if (matchesPrefix(normalizedPath, '/admin') || requiresRegisteredPermission(pathname)) {
    const authorization = accessToken ? await loadPageAuthorization(accessToken, userSubject) : null;
    // Next 라우트의 대소문자는 보존한다. insertScrap 같은 등록된 경로를 소문자로 바꾸지 않는다.
    if (!authorization || !canEnterRegisteredPage(pathname, authorization)) {
        const fallbackUrl = new URL('/', request.url);
        fallbackUrl.searchParams.set('auth_error', 'unauthorized');
        const denied = withNonce(NextResponse.redirect(fallbackUrl));
        // 인증은 됐으나 진입이 허용되지 않은 경우다 — 권한 부족뿐 아니라 권한 조회 실패(시간 초과·응답 형식·subject 불일치)도
        //   여기로 온다. /login 리다이렉트와 구분한다.
        denied.headers.set('x-mw-auth', `${authDiag};deny=permission`);
        return denied;
    }
  }
  if (accessToken && (matchesPrefix(normalizedPath, '/admin') || requiresRegisteredPermission(pathname))) {
    const verifiedUser = consumeVerifiedPageUser(accessToken);
    if (verifiedUser) {
      signedVerifiedUser = (await signVerifiedUserHeader(verifiedUser, accessToken)) ?? undefined;
    }
  }

  const pass = nextWithCsp(signedVerifiedUser);
  pass.headers.set('x-mw-auth', authDiag);
  return pass;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
