// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';

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
  const data = `${b64({ alg, typ: 'JWT' })}.${b64(payload)}`;
  const sig = createHmac(HASH[alg], Buffer.from(secret, 'utf8')).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
const pastExp = () => Math.floor(Date.now() / 1000) - 3600;

let proxy: (req: NextRequest) => Promise<Response>;
let NextRequestCtor: typeof NextRequest;
const originalSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  const serverMod = await import('next/server');
  NextRequestCtor = serverMod.NextRequest;
  proxy = (await import('../proxy')).proxy as typeof proxy;
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

function requestWith(token: string | null, path = '/admin/work-hub'): NextRequest {
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
  it('백엔드와 같은 시크릿으로 서명된 토큰은 통과한다', async () => {
    const res = await proxy(requestWith(signToken({ sub: 'webmaster', role: 'ADMIN', exp: futureExp() }, SECRET)));
    expect(redirectedToLogin(res)).toBe(false);
  });

  it.each(['HS256', 'HS384', 'HS512'] as const)('%s 로 서명해도 통과한다(alg 화이트리스트)', async (alg) => {
    const token = signToken({ sub: 'webmaster', role: 'ADMIN', exp: futureExp() }, SECRET, alg);
    expect(redirectedToLogin(await proxy(requestWith(token)))).toBe(false);
  });

  it('[회귀] 다른 시크릿으로 서명된 토큰은 통과하지 못한다 — 좌우 시크릿 비대칭의 관측 형태', async () => {
    // 백엔드가 .env 값으로 서명하고 미들웨어가 dev 기본값으로 검증하던 상태가 정확히 이것이다.
    // 로그인 자체는 200 이므로(미들웨어를 우회한다) 사용자에겐 "인증 완료 후 로그인창" 으로만 보였다.
    const token = signToken({ sub: 'webmaster', role: 'ADMIN', exp: futureExp() }, OTHER_SECRET);
    expect(redirectedToLogin(await proxy(requestWith(token)))).toBe(true);
  });

  it('만료된 토큰은 통과하지 못한다', async () => {
    const token = signToken({ sub: 'webmaster', role: 'ADMIN', exp: pastExp() }, SECRET);
    expect(redirectedToLogin(await proxy(requestWith(token)))).toBe(true);
  });

  it('alg=none 위조 토큰은 거부한다', async () => {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'x', role: 'ADMIN', exp: futureExp() })}.`;
    expect(redirectedToLogin(await proxy(requestWith(forged)))).toBe(true);
  });

  it('서명부를 변조한 토큰은 거부한다', async () => {
    const token = signToken({ sub: 'webmaster', role: 'ADMIN', exp: futureExp() }, SECRET);
    const tampered = token.slice(0, -4) + 'AAAA';
    expect(redirectedToLogin(await proxy(requestWith(tampered)))).toBe(true);
  });

  it('토큰이 아예 없으면 로그인으로 보낸다', async () => {
    expect(redirectedToLogin(await proxy(requestWith(null)))).toBe(true);
  });

  it('로그인 페이지 자체는 게이트를 적용하지 않는다(리다이렉트 루프 방지)', async () => {
    expect(redirectedToLogin(await proxy(requestWith(null, '/login')))).toBe(false);
  });
});
