// @vitest-environment node
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import axios from 'axios';

import { POST as login } from '../login/route';
import { POST as logout } from '../logout/route';
import { POST as reissue } from '../reissue/route';

/**
 * 인증 프록시 라우트(login · logout · reissue) 계약 테스트.
 *
 * [존재 이유 — 2026-08-15 신설] 이 세 파일은 커버리지가 **0 / 0 / 0** 이었다.
 * 프런트에서 세션을 실제로 만들고 지우는 유일한 지점인데 자동 검증이 한 줄도 없었다.
 *
 * 이 계층에서 조용히 틀어질 수 있는 것들 — 전부 예외를 던지지 않아 타입검사·빌드로는 안 잡힌다:
 *
 *   ① 쿠키 플래그가 빠지면 → HttpOnly 가 없으면 XSS 로 토큰이 읽히고,
 *      SameSite 가 없으면 CSRF 표면이 열린다. 화면은 멀쩡히 동작한다.
 *   ② 응답 바디에 토큰이 실리면 → HttpOnly 로 감춘 의미가 사라진다(JS 메모리 노출).
 *      reissue 는 이 이유로 바디에서 토큰을 뺀 이력이 있다.
 *   ③ 쿠키 수명이 토큰 수명과 어긋나면 → "로그인된 것처럼 보이는데 아무것도 안 되는" 구간이 생긴다.
 *      종전 86400(24시간) 하드코딩 vs 백엔드 기본 1시간이 정확히 그 상태였다.
 *   ④ 백엔드 Set-Cookie(refreshToken) 포워딩이 빠지면 → 재발급이 영영 불가능해진다.
 *      증상은 "한참 쓰다 갑자기 로그아웃" 이라 원인 추적이 어렵다.
 *   ⑤ 로그아웃이 백엔드 실패 시 쿠키를 안 지우면 → 사용자는 로그아웃했다고 믿는데 세션이 남는다.
 *
 * 이 저장소에는 인증 무음 실패로 CI 를 여러 회차 태운 이력이 있다(JWT 시크릿 비대칭 ·
 * Edge realm ArrayBuffer 거부). 그 경로를 로컬에서 볼 수 있게 고정한다.
 */

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

const mockedPost = vi.mocked(axios.post);
const LOGIN_ERROR_COPY = '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.';

function successEnvelope<T>(data: T) {
  return {
    success: true as const,
    status: 200,
    code: 'SUCCESS',
    message: '요청이 정상적으로 처리되었습니다.',
    data,
    timestamp: '2026-08-31T19:00:00',
  };
}

/** 서명은 검증되지 않으므로(만료힌트 전용 디코더) 페이로드만 실제 형식으로 만든다. */
function tokenWithExp(expSeconds: number): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS384', typ: 'JWT' })}.${b64({ sub: 'webmaster', exp: expSeconds })}.signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

interface ParsedCookie {
  value: string;
  attrs: Map<string, string>;
}

/** Set-Cookie 헤더를 직접 파싱한다 — 쿠키 객체 API 가 아니라 **실제 전송되는 헤더**를 본다. */
function setCookie(response: Response, name: string): ParsedCookie | null {
  const raw = response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  if (!raw) return null;
  const [pair, ...rest] = raw.split(';');
  const attrs = new Map<string, string>();
  for (const part of rest) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 0) attrs.set(trimmed.toLowerCase(), '');
    else attrs.set(trimmed.slice(0, eq).toLowerCase(), trimmed.slice(eq + 1));
  }
  return { value: pair.slice(name.length + 1), attrs };
}

function postRequest(path: string, body?: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** axios 가 던지는 에러의 모양(response 를 가진 객체)을 그대로 흉내낸다. */
function axiosError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });
}

beforeEach(() => {
  mockedPost.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/auth/login', () => {
  it('accessToken 을 HttpOnly·SameSite=strict 쿠키로 심고, 바디에는 토큰을 싣지 않는다', async () => {
    const token = tokenWithExp(inOneHour());
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token, role: 'ROLE_ADMIN' }),
      headers: {},
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'webmaster', password: '1' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { role: 'ROLE_ADMIN' } });
    // ② 토큰이 바디로 새면 HttpOnly 가 무의미해진다.
    expect(JSON.stringify(body)).not.toContain(token);

    const cookie = setCookie(response, 'accessToken');
    expect(cookie?.value).toBe(token);
    expect(cookie?.attrs.has('httponly')).toBe(true);
    expect(cookie?.attrs.get('samesite')?.toLowerCase()).toBe('strict');
    expect(cookie?.attrs.get('path')).toBe('/');
  });

  it('쿠키 수명을 토큰 exp 에서 유도한다 — 24시간 고정이 아니다', async () => {
    const token = tokenWithExp(inOneHour());
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token, role: 'ROLE_USER' }),
      headers: {},
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    const maxAge = Number(setCookie(response, 'accessToken')?.attrs.get('max-age'));
    // 1시간(3600) 언저리여야 한다. 실행 지연을 감안해 폭을 준다.
    expect(maxAge).toBeGreaterThan(3500);
    expect(maxAge).toBeLessThanOrEqual(3600);
    // 종전 결함의 회귀 방지: 24시간이 다시 박히면 여기서 잡힌다.
    expect(maxAge).not.toBe(86400);
  });

  it('session_exp 는 만료시각만 담고 HttpOnly 가 아니다 (클라이언트 경고용)', async () => {
    const exp = inOneHour();
    const token = tokenWithExp(exp);
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token, role: 'ROLE_USER' }),
      headers: {},
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    const hint = setCookie(response, 'session_exp');
    expect(hint?.value).toBe(String(exp * 1000));
    // JS 가 읽어야 하므로 HttpOnly 가 없어야 한다. 값은 타임스탬프뿐이라 탈취 표면이 아니다.
    expect(hint?.attrs.has('httponly')).toBe(false);
  });

  it('백엔드가 준 Set-Cookie(refreshToken)를 그대로 포워딩한다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: tokenWithExp(inOneHour()), role: 'ROLE_USER' }),
      headers: { 'set-cookie': ['refreshToken=rt-value; Path=/; HttpOnly'] },
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    // ④ 이게 빠지면 재발급이 영영 불가능해진다.
    expect(setCookie(response, 'refreshToken')?.value).toBe('rt-value');
  });

  it('자격증명이 틀리면 상태만 보존하고 backend 상세는 안전한 로그인 오류로 정규화한다', async () => {
    const backendBody = { success: false, code: 'A005', message: 'Login Failed' };
    mockedPost.mockRejectedValue(axiosError(401, backendBody));

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'wrong' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: 'LOGIN_INVALID_CREDENTIALS',
      message: LOGIN_ERROR_COPY,
    });
    expect(setCookie(response, 'accessToken')).toBeNull();
  });

  it('upstream 오류의 내부 메시지와 payload를 응답이나 console에 노출하지 않는다', async () => {
    const privateMessage = 'jdbc:postgresql://internal-db/users/42?token=secret';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPost.mockRejectedValue(axiosError(503, {
      success: false,
      code: 'INTERNAL_AUTH_TRACE',
      message: privateMessage,
    }));

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      success: false,
      code: 'LOGIN_PROXY_ERROR',
      message: '로그인 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
    });
    expect(JSON.stringify(body)).not.toContain(privateMessage);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('백엔드에 닿지 못하면 500 과 중개 오류 코드를 낸다', async () => {
    mockedPost.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('LOGIN_PROXY_ERROR');
  });

  it('백엔드가 success=true 인데 토큰을 주지 않으면 쿠키를 심지 않는다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ role: 'ROLE_USER' }),
      headers: {},
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    expect(setCookie(response, 'accessToken')).toBeNull();
    expect(response.status).toBe(502);
  });

  it('generated LoginRequest에 없는 필드를 upstream으로 전송하지 않는다', async () => {
    const response = await login(postRequest('/api/auth/login', {
      userId: 'u',
      password: 'p',
      accessToken: 'must-not-be-forwarded',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: 'LOGIN_INVALID_REQUEST',
      message: LOGIN_ERROR_COPY,
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('generated TokenResponse와 다른 200 upstream 응답은 fail-closed 하고 토큰을 쿠키로 심지 않는다', async () => {
    const token = tokenWithExp(inOneHour());
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token, role: 7 }),
      headers: {},
    });

    const response = await login(postRequest('/api/auth/login', { userId: 'u', password: 'p' }));

    expect(response.status).toBe(502);
    expect(setCookie(response, 'accessToken')).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain(token);
  });
});

describe('POST /api/auth/reissue', () => {
  it('새 토큰을 쿠키로만 재설정하고 바디로는 돌려주지 않는다', async () => {
    const token = tokenWithExp(inOneHour());
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token }),
      headers: {},
    });

    const response = await reissue(postRequest('/api/auth/reissue', undefined, { cookie: 'refreshToken=rt' }));

    const body = await response.json();
    expect(body).toEqual({ success: true, data: {} });
    expect(JSON.stringify(body)).not.toContain(token);
    expect(setCookie(response, 'accessToken')?.value).toBe(token);
  });

  it('재발급 쿠키 수명도 새 토큰 exp 를 따른다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: tokenWithExp(inOneHour()) }),
      headers: {},
    });

    const response = await reissue(postRequest('/api/auth/reissue', undefined, { cookie: 'refreshToken=rt' }));

    const maxAge = Number(setCookie(response, 'accessToken')?.attrs.get('max-age'));
    expect(maxAge).toBeGreaterThan(3500);
    expect(maxAge).not.toBe(86400);
  });

  it('요청의 쿠키 헤더를 백엔드로 포워딩한다 (refreshToken 이 거기 있다)', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: tokenWithExp(inOneHour()) }),
      headers: {},
    });

    await reissue(postRequest('/api/auth/reissue', undefined, { cookie: 'refreshToken=rt-abc' }));

    const [, , config] = mockedPost.mock.calls[0];
    expect((config as { headers: Record<string, string> }).headers.Cookie).toContain('refreshToken=rt-abc');
    expect(mockedPost.mock.calls[0][1]).toBeUndefined();
  });

  it('리프레시 토큰이 만료되면 401은 보존하고 백엔드 원문은 숨긴다', async () => {
    const privateMessage = 'refresh token row 42 expired for private-user@example.test';
    mockedPost.mockRejectedValue(axiosError(401, {
      success: false,
      code: 'A003',
      message: privateMessage,
    }));

    const response = await reissue(postRequest('/api/auth/reissue'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      code: 'SESSION_EXPIRED',
      message: '세션이 만료되었습니다. 다시 로그인해주세요.',
    });
    expect(JSON.stringify(body)).not.toContain(privateMessage);
    expect(setCookie(response, 'accessToken')).toBeNull();
  });

  it('백엔드 5xx의 원문과 응답 데이터를 클라이언트에 노출하지 않는다', async () => {
    const privateMessage = 'jdbc://internal-db/private-user failed';
    mockedPost.mockRejectedValue(axiosError(503, {
      success: false,
      code: 'INTERNAL-42',
      message: privateMessage,
    }));

    const response = await reissue(postRequest('/api/auth/reissue'));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      success: false,
      code: 'REISSUE_PROXY_ERROR',
      message: '세션 연장 서비스에 일시적으로 연결할 수 없습니다.',
    });
    expect(JSON.stringify(body)).not.toContain(privateMessage);
  });

  it('200 응답이라도 새 accessToken이 없으면 실패를 정규화한다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: { success: false, code: 'PRIVATE', message: 'internal session record missing' },
      headers: {},
    });

    const response = await reissue(postRequest('/api/auth/reissue'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      success: false,
      code: 'REISSUE_PROXY_ERROR',
      message: '세션 연장 서비스에 일시적으로 연결할 수 없습니다.',
    });
  });

  it('generated TokenResponse와 다른 재발급 응답은 fail-closed 하고 토큰을 노출하지 않는다', async () => {
    const token = tokenWithExp(inOneHour());
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ accessToken: token, role: 7 }),
      headers: {},
    });

    const response = await reissue(postRequest('/api/auth/reissue'));

    expect(response.status).toBe(502);
    expect(setCookie(response, 'accessToken')).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain(token);
  });
});

describe('POST /api/auth/logout', () => {
  it('성공 시 accessToken·refreshToken·session_exp 쿠키를 모두 즉시 만료시킨다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope('Logged out successfully'),
      headers: {},
    });

    const response = await logout(postRequest('/api/auth/logout', undefined, { cookie: 'accessToken=t' }));

    expect(response.status).toBe(200);
    await expect(response.clone().json()).resolves.toEqual({ success: true, data: { cleared: true } });
    for (const name of ['accessToken', 'refreshToken', 'session_exp']) {
      const cookie = setCookie(response, name);
      expect(cookie?.value).toBe('');
      expect(new Date(cookie?.attrs.get('expires') ?? '').getTime()).toBe(0);
    }
  });

  it('쿠키의 accessToken 을 Bearer 헤더로 백엔드에 중개한다', async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope('Logged out successfully'),
      headers: {},
    });

    await logout(postRequest('/api/auth/logout', undefined, { cookie: 'accessToken=tok-123' }));

    const [, , config] = mockedPost.mock.calls[0];
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer tok-123');
  });

  it('백엔드가 실패해도 accessToken·refreshToken·session_exp 를 모두 즉시 만료시킨다 (fail-safe)', async () => {
    mockedPost.mockRejectedValue(axiosError(500, { success: false }));

    const response = await logout(postRequest('/api/auth/logout', undefined, { cookie: 'accessToken=t' }));

    // ⑤ 여기서 쿠키가 남으면 사용자는 로그아웃했다고 믿는데 세션이 살아 있다.
    expect(response.status).toBe(200);
    await expect(response.clone().json()).resolves.toEqual({
      success: true,
      data: { cleared: true },
    });
    for (const name of ['accessToken', 'refreshToken', 'session_exp']) {
      const cookie = setCookie(response, name);
      expect(cookie?.value).toBe('');
      expect(new Date(cookie?.attrs.get('expires') ?? '').getTime()).toBe(0);
    }
  });

  it('upstream 로그아웃 payload를 로컬 응답으로 포워딩하지 않는다', async () => {
    const privateValue = 'internal-session-token';
    mockedPost.mockResolvedValue({
      status: 200,
      data: successEnvelope({ token: privateValue }),
      headers: {},
    });

    const response = await logout(postRequest('/api/auth/logout', undefined, { cookie: 'accessToken=t' }));
    const body = await response.json();

    expect(body).toEqual({ success: true, data: { cleared: true } });
    expect(JSON.stringify(body)).not.toContain(privateValue);
  });
});
