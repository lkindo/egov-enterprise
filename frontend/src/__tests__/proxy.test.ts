// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { pageInProjection } from '@/test-utils/projection';

/**
 * Proxy 인증 게이트 회귀 테스트.
 *
 * [존재 이유] 이 경로에는 테스트가 단 한 건도 없었다. 그 공백에서 2026-07-19 에
 * "로그인은 200 인데 페이지 진입에서 /login 으로 되돌아가는" 무음 루프가 발생했다.
 * 원인은 백엔드와 미들웨어의 JWT 시크릿 비대칭이었다 — 백엔드는 루트 .env 의 값으로 서명하고,
 * 미들웨어는 그 값을 못 받아 내장 dev 기본값으로 검증해 서명 검증이 전량 실패했다.
 *
 * 그래서 이 테스트가 고정하는 최소 명제는 이것이다:
 *   "백엔드가 서명한 토큰은 미들웨어를 통과하고, 다른 키로 서명된 토큰은 통과하지 못한다."
 *
 * 미들웨어는 모듈 로드 시점에 process.env.JWT_SECRET 을 읽어 상수로 굳히므로,
 * 반드시 env 를 먼저 세팅한 뒤 동적 import 해야 한다.
 */

const SECRET = 'middleware-test-secret-0123456789-abcdefghijklmnop';
const OTHER_SECRET = 'a-different-secret-that-must-not-verify-0987654321';

const HASH: Record<string, string> = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' };

/** 백엔드(JwtTokenProvider)와 동일한 방식으로 서명한다 — 시크릿을 raw UTF-8 바이트로 쓴다. */
function signToken(
  payload: Record<string, unknown>,
  secret: string,
  alg: 'HS256' | 'HS384' | 'HS512' = 'HS384'
): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64({ alg, typ: 'JWT' })}.${b64({ typ: 'access', ...payload })}`;
  const sig = createHmac(HASH[alg], Buffer.from(secret, 'utf8')).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
const pastExp = () => Math.floor(Date.now() / 1000) - 3600;

let proxy: (req: NextRequest) => Promise<Response>;
let NextRequestCtor: typeof NextRequest;
const originalSecret = process.env.JWT_SECRET;
const fetchMock = vi.fn();
const SUBJECT = 'USRCNFRM_fixture_001';

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data: {
    id: 'webmaster', esntlId: SUBJECT, groups: ['USER'], permissions: [], authorizationVersion: 'v1',
  } })));
  vi.stubGlobal('fetch', fetchMock);
});

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  const serverMod = await import('next/server');
  NextRequestCtor = serverMod.NextRequest;
  proxy = (await import('../proxy')).proxy as typeof proxy;
}, 30_000);

afterAll(() => {
  vi.unstubAllGlobals();
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

// 예시 화면이 투영으로 빠진 생성물에서는 그 예시만 뺀다 — 라우트의 page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).
//   토큰 검증 시험의 기본 경로는 로그인만 요구하는 관리 화면(업무 허브)이다. 그 화면이 빠진 생성물에는 그런 관리 화면이
//   없으므로 관리 밖 경로(홈)로 본다 — 관리 밖 경로도 유효한 토큰을 요구한다.
const AUTHENTICATED_ROUTE = pageInProjection('/admin/work-hub') ? '/admin/work-hub' : '/';

function requestWith(token: string | null, path = AUTHENTICATED_ROUTE): NextRequest {
  const headers = new Headers();
  if (token) headers.set('cookie', `accessToken=${token}`);
  return new NextRequestCtor(new URL(`http://localhost:3001${path}`), { headers });
}

/** 로그인 페이지로 되돌려보내졌는지 — 이번 버그의 관측 형태. */
function redirectedToLogin(res: Response): boolean {
  const loc = res.headers.get('location');
  return res.status >= 300 && res.status < 400 && !!loc && new URL(loc).pathname === '/login';
}

describe('proxy 인증 게이트', () => {
  it.each([
    '/api/v1/auth/%6cogin',
    '/api/v1/auth/%6dfa/verify',
    '/api/v1/%61uth/mfa/enrollment/confirm',
    '/api/v1/auth/mfa/%72eauthenticate',
    '/api/v1/auth/%72eissue',
    '/api/v1/%61uth/login',
    '/api/%76%31/auth/reissue',
    '/a%70i/v1/auth/login',
    '/api/v1/%61uth/%6Cogin',
    '/api/v1/auth/reissue%2f',
    '/api/v1/auth/login;a=b',
    '/api/v1/auth/reissue;x',
    '/api/v1/auth;x=1/login',
    '/api/v1/auth/mfa;x/verify',
  ])('거부: 인코딩된 인증 토큰 경로가 rewrite로 BFF를 우회하지 못한다: %s', async path => {
    const response = await proxy(new NextRequestCtor(`http://localhost:3001${path}`, { method: 'POST' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false, code: 'INVALID_AUTH_PATH', message: '요청 경로가 올바르지 않습니다.',
    });
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    '/api/v1/auth/login', '/api/v1/auth/reissue',
    '/api/v1/boards/%ED%95%9C%EA%B8%80', '/api/v1/files/fixture%20file',
    '/api/v1/boards/%2572eissue',
    '/api/v1/boards/a;b',
  ])('유지: 정규 인증 별칭과 일반 업무 자원의 인코딩을 통과시킨다: %s', async path => {
    const response = await proxy(new NextRequestCtor(`http://localhost:3001${path}`, { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  describe('쓰기 요청의 출처', () => {
    const write = (host: string, headers: Record<string, string>) => proxy(new NextRequestCtor(
      new URL(`http://${host}/api/v1/boards`), { method: 'POST', headers: { host, ...headers } }));

    it.each([
      ['portal.example', 'https://portal.example'],
      ['portal.example:8443', 'https://portal.example:8443'],
      ['portal.example:443', 'https://portal.example'],
      ['localhost:3001', 'http://127.0.0.1:3001'],
      ['127.0.0.1:3001', 'http://localhost:4000'],
    ])('허용: Host %s 에 온 Origin %s', async (host, origin) => {
      expect((await write(host, { origin })).status).toBe(200);
    });

    it.each([
      ['portal.example', 'http://localhost'],
      ['portal.example', 'http://127.0.0.1:3000'],
      ['portal.example', 'https://portal.example:8443'],
      ['portal.example:8443', 'https://portal.example'],
      ['portal.example', 'https://portal.example.attacker.test'],
      ['portal.example', 'https://attacker.test'],
      ['portal.example', 'null'],
    ])('거부: Host %s 에 온 Origin %s', async (host, origin) => {
      const response = await write(host, { origin });
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe('INVALID_ORIGIN');
    });

    it('Origin 이 없으면 Referer 를 같은 기준으로 보고, 둘 다 없으면 브라우저 쓰기가 아니다', async () => {
      expect((await write('portal.example', { referer: 'https://attacker.test/page' })).status).toBe(403);
      expect((await write('portal.example', { referer: 'https://portal.example/page' })).status).toBe(200);
      expect((await write('portal.example', {})).status).toBe(200);
    });
  });

  describe('백엔드로 넘기는 머리글', () => {
    const api = (headers: Record<string, string>) => proxy(new NextRequestCtor(
      new URL('http://localhost:3001/api/v1/users/me'), { headers: { cookie: 'accessToken=fixture-token', ...headers } }));

    it.each(['image', 'video', 'audio', 'style', 'font', 'object', 'embed'])(
      '부속 자원 요청(%s)에는 쿠키를 Bearer 로 바꾸지 않는다', async dest => {
        const response = await api({ 'sec-fetch-dest': dest });
        expect(response.headers.get('x-middleware-request-authorization')).toBeNull();
      });

    it.each(['empty', 'document'])('화면 요청(%s)은 그대로 Bearer 를 받는다', async dest => {
      const response = await api({ 'sec-fetch-dest': dest });
      expect(response.headers.get('x-middleware-request-authorization')).toBe('Bearer fixture-token');
    });

    it('Sec-Fetch 를 보내지 않는 클라이언트도 그대로 Bearer 를 받는다', async () => {
      expect((await api({})).headers.get('x-middleware-request-authorization')).toBe('Bearer fixture-token');
    });

    it('신뢰 앞단이 없으면 클라이언트가 보낸 IP 머리글을 넘기지 않는다', async () => {
      const response = await api({ 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '203.0.113.9', forwarded: 'for=203.0.113.9' });
      for (const name of ['x-forwarded-for', 'x-real-ip', 'forwarded']) {
        expect(response.headers.get(`x-middleware-request-${name}`)).toBeNull();
      }
    });

    it('신뢰 앞단이 켜져 있으면 앞단이 덮어쓴 값을 그대로 둔다', async () => {
      const original = process.env.TRUSTED_EDGE_PROXY;
      process.env.TRUSTED_EDGE_PROXY = 'true';
      try {
        const response = await api({ 'x-forwarded-for': '198.51.100.7' });
        expect(response.headers.get('x-middleware-request-x-forwarded-for')).toBe('198.51.100.7');
      } finally {
        if (original === undefined) delete process.env.TRUSTED_EDGE_PROXY;
        else process.env.TRUSTED_EDGE_PROXY = original;
      }
    });
  });

  it('같은 시크릿의 토큰은 통과하고 진단은 비밀 파생값 없이 필요한 메타만 남긴다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const res = await proxy(requestWith(signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET)));
      const messages = warn.mock.calls.map(([message]) => String(message));
      const hasMessage = (pattern: RegExp) => messages.some((message) => pattern.test(message));

      expect(redirectedToLogin(res)).toBe(false);
      expect(res.status).toBe(200);
      expect(hasMessage(/JWT 검증 성공/u)).toBe(true);
      expect(hasMessage(/시크릿 출처=환경변수 JWT_SECRET/u)).toBe(true);
      expect(hasMessage(/JWT_SECRET=있음/u)).toBe(true);
      expect(hasMessage(/지문|fingerprint/iu)).toBe(false);
      expect(hasMessage(/E2E_DIAG=(?:있음|없음)/u)).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it.each(['HS256', 'HS384', 'HS512'] as const)('%s 로 서명해도 통과한다(alg 화이트리스트)', async (alg) => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET, alg);
    expect((await proxy(requestWith(token))).status).toBe(200);
  });

  it('[회귀] 다른 시크릿으로 서명된 토큰은 통과하지 못한다 — 좌우 시크릿 비대칭의 관측 형태', async () => {
    // 백엔드가 .env 값으로 서명하고 미들웨어가 dev 기본값으로 검증하던 상태가 정확히 이것이다.
    // 로그인 자체는 200 이므로(미들웨어를 우회한다) 사용자에겐 "인증 완료 후 로그인창" 으로만 보였다.
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, OTHER_SECRET);
    expect(redirectedToLogin(await proxy(requestWith(token)))).toBe(true);
  });

  it('만료된 토큰은 통과하지 못한다', async () => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: pastExp() }, SECRET);
    expect(redirectedToLogin(await proxy(requestWith(token)))).toBe(true);
  });

  it('alg=none 위조 토큰은 거부한다', async () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'x', role: 'ADMIN', exp: futureExp() })}.`;
    expect(redirectedToLogin(await proxy(requestWith(forged)))).toBe(true);
  });

  it('서명부를 변조한 토큰은 거부한다', async () => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET);
    const tampered = token.slice(0, -4) + 'AAAA';
    expect(redirectedToLogin(await proxy(requestWith(tampered)))).toBe(true);
  });

  it('토큰이 아예 없으면 로그인으로 보낸다', async () => {
    expect(redirectedToLogin(await proxy(requestWith(null)))).toBe(true);
  });

  it('로그인 페이지 자체는 게이트를 적용하지 않는다(리다이렉트 루프 방지)', async () => {
    expect(redirectedToLogin(await proxy(requestWith(null, '/login')))).toBe(false);
  });

  it('an old ADMIN claim cannot reopen a page after the server revokes its permission', async () => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET);
    const response = await proxy(requestWith(token, '/admin/system/menus'));
    expect(response.headers.get('x-mw-auth')).toContain('deny=permission');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  it.each([
    '/admin/work-hub/not-registered',
    '/admin/collaboration/not-registered',
    '/admin/help/faq/not-registered',
    // [2026-10-23 ADR-0040 결정 2] master 바로 아래 한 단계는 이제 운영 화면([id], 게시판 관리 조회)이다 — 미등록 자식은 한 단계 더 깊다.
    '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA/not-registered',
    '/admin/survey/polls/participate/not-registered',
  ])('does not inherit a parent shell allowance for a direct URL to %s', async (route) => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET);
    const response = await proxy(requestWith(token, route));
    expect(response.headers.get('x-mw-auth')).toContain('deny=permission');
    expect(new URL(response.headers.get('location')!).searchParams.get('auth_error')).toBe('unauthorized');
  });

  it.each(([
    ['/admin/work-hub', '/admin/work-hub'],
    ['/admin/help/faq', '/admin/help/faq'],
    ['/admin/community/fixture-community', '/admin/community/[id]'],
    ['/admin/collaboration/scraps/insertScrap', '/admin/collaboration/scraps/insertScrap'],
    ['/admin/collaboration/scraps/selectScrapDetail/fixture-scrap', '/admin/collaboration/scraps/selectScrapDetail/[id]'],
  ] as const).filter(([, page]) => pageInProjection(page)).map(([route]) => route))('preserves explicitly registered authenticated routes, including case-sensitive paths: %s', async (route) => {
    const response = await proxy(requestWith(signToken({ sub: SUBJECT, exp: futureExp() }, SECRET), route));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  // 같은 깊이의 동적 형제(/admin/community/[id], 인증만 요구)가 있는 정적 관리 경로도 그 정적 페이지의 권한으로 막는다.
  //   투영으로 정적 page 가 빠진 생성물(템플릿 없이 커뮤니티를 고른 구성)에서는 Next 도 그 경로를 동적 형제로 해석하므로 예시에서
  //   뺀다(T2 첫 실행, run 38275695802). 목록이 비지 않도록 모든 생성물에 남는 core 관리 경로(메뉴 관리)를 함께 둔다.
  it.each([
    '/admin/community/boards/master',
    '/admin/community/boards/maker',
    '/admin/community/templates',
    '/admin/system/menus',
  ].filter((route) => pageInProjection(route)))('requires current management permission before serving the static route %s', async (route) => {
    const token = signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET);
    const response = await proxy(requestWith(token, route));
    expect(response.headers.get('x-mw-auth')).toContain('deny=permission');
    expect(new URL(response.headers.get('location')!).searchParams.get('auth_error')).toBe('unauthorized');
  });

  // 게시판 운영 화면(동적 [id])도 그 페이지의 권한으로 막고 연다 — 관리자 역할 주장만으로는 열리지 않는다.
  if (pageInProjection('/admin/community/boards/master/[id]')) it('the board operations screen requires its own page permission', async () => {
    const denied = await proxy(requestWith(signToken({ sub: SUBJECT, role: 'ADMIN', exp: futureExp() }, SECRET),
      '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA'));
    expect(denied.headers.get('x-mw-auth')).toContain('deny=permission');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data: {
      id: 'webmaster', esntlId: SUBJECT, groups: ['BOARD_OPERATOR'], permissions: [...PAGE_PERMISSIONS['/admin/community/boards/master/[id]']],
      authorizationVersion: 'v2',
    } })));
    const allowed = await proxy(requestWith(signToken({ sub: SUBJECT, role: 'USER', exp: futureExp() }, SECRET),
      '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA'));
    expect(allowed.status).toBe(200);
  });

  it('a current functional grant opens its page without an administrator role claim', async () => {
    const permissions = PAGE_PERMISSIONS['/admin/system/menus'];
    expect(permissions.length).toBeGreaterThan(0);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data: {
      id: 'webmaster', esntlId: SUBJECT, groups: ['MENU_EDITOR'], permissions, authorizationVersion: 'v2',
    } })));
    const token = signToken({ sub: SUBJECT, role: 'USER', exp: futureExp() }, SECRET);
    const response = await proxy(requestWith(token, '/admin/system/menus'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-security-policy')).toContain("script-src");
  });

  it('rejects a different essential ID even when the login ID equals the JWT subject', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, code: 'S000', message: '성공', data: {
      id: SUBJECT, esntlId: 'USRCNFRM_other_002', groups: ['MENU_EDITOR'], permissions: [...PAGE_PERMISSIONS['/admin/system/menus']], authorizationVersion: 'v2',
    } })));
    const response = await proxy(requestWith(signToken({ sub: SUBJECT, role: 'USER', exp: futureExp() }, SECRET), '/admin/system/menus'));
    expect(response.headers.get('x-mw-auth')).toContain('deny=permission');
    expect(new URL(response.headers.get('location')!).pathname).toBe('/');
  });

  it.each([
    { sub: SUBJECT, typ: 'refresh', exp: futureExp() },
    { role: 'ADMIN', exp: futureExp() },
    { sub: SUBJECT, role: 'ADMIN' },
  ])('rejects the wrong token kind or incomplete signed identity before querying permissions', async (payload) => {
    // 권한 조회가 반드시 따르는 관리 화면(모든 생성물에 있다)으로 본다 — 조회 없이 끝나는 경로에서는 아래 단언이 비게 된다.
    expect(redirectedToLogin(await proxy(requestWith(signToken(payload, SECRET), '/admin/system/menus')))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * GAP-FE-002 · DEC-OPS-333 — rewrite 프록시는 백엔드 연결을 유휴 상태로 다시 쓰지 않는다.
 *
 * 불변식: 유휴 연결은 클라이언트가 서버보다 먼저 닫아야 한다. Next 16 rewrite(httpxy)의 keep-alive Agent 는 timeout 이
 * 없고 주입할 수 없으며, Node 22 Agent 는 그때 서버의 `Keep-Alive: timeout=N` 힌트를 무시한다 — 클라이언트 유휴 수명이
 * 무한이라 Tomcat(20초)보다 짧게 만들 방법이 없다. 그래서 유휴 재사용 자체를 없앤다: 미들웨어가 `Connection: close` 를
 * 싣고, httpxy 는 그 헤더를 백엔드에 그대로 보내 요청마다 새 연결을 맺는다. 여기서는 미들웨어의 헤더 덮어쓰기를 고정하고,
 * 설치된 Next 의 rewrite 함수가 그 헤더로 소켓을 다시 쓰지 않는다는 것은 scripts/frontend-proxy-keepalive-contract.test.mjs 가 고정한다.
 */
describe('rewrite 프록시 백엔드 연결 (GAP-FE-002)', () => {
  const overridden = (response: Response) => response.headers.get('x-middleware-override-headers')?.split(',') ?? [];

  it.each(['/api/v1/boards/posts', '/actuator/health', '/ws/info'])('토큰 없는 프록시 요청 %s 도 백엔드에 Connection: close 를 싣는다', async (path) => {
    const response = await proxy(new NextRequestCtor(`http://localhost:3001${path}`, { headers: { connection: 'keep-alive' } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(overridden(response)).toContain('connection');
    expect(response.headers.get('x-middleware-request-connection')).toBe('close');
  });

  it('토큰을 주입하는 프록시 요청에도 함께 싣는다', async () => {
    const response = await proxy(new NextRequestCtor('http://localhost:3001/api/v1/boards/posts', {
      headers: { cookie: 'accessToken=fixture-token', connection: 'keep-alive' } }));
    expect(response.headers.get('x-middleware-request-authorization')).toBe('Bearer fixture-token');
    expect(response.headers.get('x-middleware-request-connection')).toBe('close');
  });

  it('WebSocket 업그레이드 요청의 Connection 은 그대로 둔다', async () => {
    const response = await proxy(new NextRequestCtor('http://localhost:3001/ws/123/abc/websocket', {
      headers: { connection: 'Upgrade', upgrade: 'websocket' } }));
    expect(response.headers.get('x-middleware-request-connection')).toBe('Upgrade');
  });

  it('프록시가 아닌 페이지 요청의 헤더는 덮어쓰지 않는다', async () => {
    const response = await proxy(requestWith(null, '/login'));
    expect(response.headers.get('x-middleware-request-connection')).toBeNull();
  });
});

describe('이중 제출 CSRF 토큰 쿠키 (CredentialCookieCsrfPolicy)', () => {
  const tokenCookie = (response: Response) =>
    response.headers.getSetCookie().find((cookie) => cookie.startsWith('XSRF-TOKEN='));

  it('토큰 쿠키가 없는 문서 응답에서 스크립트가 읽는 SameSite=Strict 쿠키를 만든다', async () => {
    const response = await proxy(requestWith(null, '/login'));
    const cookie = tokenCookie(response);
    expect(cookie).toMatch(/^XSRF-TOKEN=[A-Za-z0-9_-]{43};/);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/HttpOnly/i);
  });

  it('로그인으로 되돌리는 문서 응답에도 만들고, 요청마다 다른 값을 쓴다', async () => {
    const first = tokenCookie(await proxy(requestWith(null)));
    const second = tokenCookie(await proxy(requestWith(null)));
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });

  it('이미 토큰 쿠키가 있으면 덮어쓰지 않는다 — 열린 탭의 헤더와 어긋나지 않게', async () => {
    const response = await proxy(new NextRequestCtor('http://localhost:3001/login', {
      headers: { cookie: 'XSRF-TOKEN=existing-token' } }));
    expect(tokenCookie(response)).toBeUndefined();
  });

  it('백엔드로 넘기는 API 요청에서는 만들지 않는다 — 백엔드 응답의 토큰과 겹치지 않게', async () => {
    const response = await proxy(new NextRequestCtor('http://localhost:3001/api/v1/boards/posts', {
      headers: { cookie: 'accessToken=fixture-token' } }));
    expect(tokenCookie(response)).toBeUndefined();
  });
});
