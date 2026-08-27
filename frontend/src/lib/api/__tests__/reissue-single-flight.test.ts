import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 재발급 단일 실행(single-flight) 계약.
 *
 * 백엔드는 재발급 때 리프레시 토큰을 **회전**시킨다 — 같은 토큰으로 두 번 부르면 두 번째는
 * 401(SESSION_EXPIRED)이다(2026-08-27 실행 중인 서버로 실측). 재발급을 부르는 경로는 둘이라
 * (401 자동 재발급 인터셉터, 세션 연장 버튼) 각자 쏘면 늦게 도착한 쪽만 401 이 되고,
 * 사용자에게는 "세션은 연장됐는데 연장 버튼만 실패" 로 보인다.
 *
 * 그래서 겹치는 동안에는 요청이 정확히 하나여야 하고, 결과(성공·실패)는 공유돼야 한다.
 */

const postMock = vi.fn();

vi.mock('axios', () => {
  const instance = {
    post: (...args: unknown[]) => postMock(...args),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: () => instance,
      isAxiosError: (e: unknown) => Boolean(e && typeof e === 'object' && 'response' in (e as object)),
    },
  };
});

/** 수동으로 결말을 정할 수 있는 지연 응답. 두 호출이 겹치는 구간을 만들기 위한 장치다. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('reissueSession 단일 실행', () => {
  beforeEach(() => {
    vi.resetModules();
    postMock.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('겹치는 동안에는 요청을 한 번만 보내고 결과를 공유한다', async () => {
    const gate = deferred<{ data: { success: boolean } }>();
    postMock.mockReturnValue(gate.promise);

    const { reissueSession } = await import('../client');

    const first = reissueSession();
    const second = reissueSession();

    expect(postMock).toHaveBeenCalledTimes(1);

    gate.resolve({ data: { success: true } });
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });

  it('겹친 호출은 실패도 함께 받는다', async () => {
    const gate = deferred<{ data: { success: boolean } }>();
    postMock.mockReturnValue(gate.promise);

    const { reissueSession } = await import('../client');

    const first = reissueSession();
    const second = reissueSession();
    gate.reject(new Error('401 Unauthorized'));

    await expect(first).rejects.toThrow('401 Unauthorized');
    await expect(second).rejects.toThrow('401 Unauthorized');
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('이전 재발급이 끝난 뒤의 호출은 새로 보낸다', async () => {
    postMock.mockResolvedValue({ data: { success: true } });

    const { reissueSession } = await import('../client');

    await reissueSession();
    await reissueSession();

    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('Route Handler 직결 경로로 보낸다 (baseURL 전치 회귀 방어)', async () => {
    postMock.mockResolvedValue({ data: { success: true } });

    const { reissueSession } = await import('../client');
    await reissueSession();

    const [url, body, config] = postMock.mock.calls[0] as [string, unknown, { baseURL?: string }];
    expect(url).toBe('/api/auth/reissue');
    expect(body).toEqual({});
    expect(config.baseURL).toBe('');
  });

  it('success 가 아니면 실패로 다룬다', async () => {
    postMock.mockResolvedValue({ data: { success: false } });

    const { reissueSession } = await import('../client');

    await expect(reissueSession()).rejects.toThrow('Token reissue failed');
  });
});
