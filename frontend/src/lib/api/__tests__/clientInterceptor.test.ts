/**
 * API 클라이언트 **인터셉터 로직** 테스트.
 *
 * [2026-08-09 신설] 기존 `client.test.ts` 는 axios 를 통째로 목킹하고
 * "create 가 불렸는가 / interceptors.use 가 불렸는가" 만 확인했다.
 * **핸들러 안쪽 로직에는 한 번도 닿지 않았다** — 그래서 이 파일 커버리지가 23% 였다.
 *
 * 이 자리는 저장소의 모든 API 호출이 지나가는 목이다. 여기서 조용히 틀어질 수 있는 것:
 *
 *   ① `success:false` 응답을 예외로 바꾸지 않으면 → **오류 본문이 정상 데이터로 흘러간다.**
 *      화면은 빈 목록·null 필드를 그리고, 사용자는 "데이터가 없다" 고 읽는다.
 *   ② 로그인 화면의 401 에 재발급을 걸면 → **401 → 재발급 → 401 무한 루프**.
 *   ③ 재발급 요청의 `baseURL:''` 이 빠지면 → `/api/v1/api/auth/reissue` 로 나가 404/401,
 *      **세션 재발급 자체가 죽는다**(소스 주석이 명시한 함정이다).
 *   ④ 동시 401 을 큐잉하지 않으면 → N개의 재발급이 동시에 나간다.
 *   ⑤ 서버(SSR)에서 재발급을 시도하면 → 리다이렉트할 window 가 없어 무의미하고,
 *      서버 렌더링이 지연된다.
 *
 * 전부 예외가 나지 않고 조용히 어긋나는 종류라 타입검사·빌드로는 잡히지 않는다.
 *
 * 검증 방식: axios 를 스텁으로 바꾸고 **인터셉터에 등록된 핸들러 자체를 붙잡아** 직접 호출한다.
 * HTTP 를 태우지 않으므로 분기 판정이 결정적이다.
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

type Handler = (arg: unknown) => Promise<unknown>;

/** axios.create() 가 돌려줄 스텁. 인터셉터 핸들러를 캡처한다. */
function makeInstanceStub() {
  const captured: { requestOk?: Handler; responseErr?: Handler } = {};
  const instance = Object.assign(
    // 인스턴스 자체가 함수다 — 인터셉터가 `axiosInstance(originalRequest)` 로 재시도한다.
    vi.fn(async (config: unknown) => ({ __retriedWith: config })),
    {
      interceptors: {
        request: { use: vi.fn((ok: Handler) => { captured.requestOk = ok; }), eject: vi.fn() },
        response: {
          use: vi.fn((_ok: Handler, err: Handler) => { captured.responseErr = err; }),
          eject: vi.fn(),
        },
      },
      defaults: { headers: { common: {} } },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  );
  return { instance, captured };
}

vi.mock('axios', () => ({
  default: { create: vi.fn() },
}));

/** 모듈을 새로 적재해 인터셉터를 다시 등록시킨다(모듈 수준 isRetrying 상태도 초기화된다). */
async function loadClient() {
  const { instance, captured } = makeInstanceStub();
  vi.mocked(axios.create).mockReturnValue(instance as never);
  vi.resetModules();
  const mod = await import('../client');
  return { client: mod.default, instance, captured };
}

describe('API 클라이언트 인터셉터', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow, configurable: true, writable: true,
      });
    }
  });

  describe('응답 본문 처리 (extractData)', () => {
    it('success:false 는 예외로 바꾼다 — 오류 본문이 데이터로 흘러가면 안 된다', async () => {
      const { client, instance } = await loadClient();
      instance.get.mockResolvedValueOnce({
        data: { success: false, code: 'C001', message: '권한이 없습니다.', data: null },
      });

      // 이 변환이 사라지면 화면은 null 을 정상 데이터로 그리고 사용자는 원인을 못 본다.
      await expect(client.get('/x')).rejects.toThrow('권한이 없습니다.');
    });

    it('success:false 인데 message 가 없으면 기본 문구로 던진다', async () => {
      const { client, instance } = await loadClient();
      instance.post.mockResolvedValueOnce({ data: { success: false, code: 'C001', data: null } });

      await expect(client.post('/x', {})).rejects.toThrow('요청 처리 중 오류가 발생했습니다.');
    });

    it('success:true 는 래퍼를 벗겨 data 만 돌려준다', async () => {
      const { client, instance } = await loadClient();
      instance.post.mockResolvedValueOnce({
        data: { success: true, code: 'S001', message: 'ok', data: { id: 7 } },
      });

      await expect(client.post('/x', {})).resolves.toEqual({ id: 7 });
    });

    it('ApiResponse 래퍼가 아닌 본문은 그대로 돌려준다', async () => {
      const { client, instance } = await loadClient();
      instance.get.mockResolvedValueOnce({ data: [1, 2, 3] });

      // 래퍼를 쓰지 않는 엔드포인트(파일 다운로드 등)를 깨뜨리지 않아야 한다.
      await expect(client.get('/raw')).resolves.toEqual([1, 2, 3]);
    });
  });

  describe('401 재발급 흐름', () => {
    it('로그인 화면에서의 401 은 재발급하지 않는다 — 무한 루프 차단', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/login', href: '' } },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      const error = { response: { status: 401 }, config: { url: '/whatever' } };

      await expect(captured.responseErr!(error)).rejects.toBe(error);

      // 재발급 요청이 나가면 401 → 재발급 → 401 이 끝없이 돈다.
      expect(instance.post).not.toHaveBeenCalled();
    });

    it('재발급 엔드포인트 자신의 401 도 재발급하지 않는다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' } },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      const error = { response: { status: 401 }, config: { url: '/api/auth/reissue' } };

      await expect(captured.responseErr!(error)).rejects.toBe(error);
      expect(instance.post).not.toHaveBeenCalled();
    });

    it('서버(SSR)에서는 재발급하지 않고 그대로 거절한다', async () => {
      // window 가 없으면 리다이렉트할 대상도 없고, 서버 렌더링만 지연된다.
      Object.defineProperty(globalThis, 'window', {
        value: undefined, configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      const error = { response: { status: 401 }, config: { url: '/x' } };

      await expect(captured.responseErr!(error)).rejects.toBe(error);
      expect(instance.post).not.toHaveBeenCalled();
    });

    it('이미 재시도한 요청(_retry)은 다시 재발급하지 않는다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      const error = { response: { status: 401 }, config: { url: '/x', _retry: true }, message: 'unauthorized' };

      await expect(captured.responseErr!(error)).rejects.toBeDefined();
      expect(instance.post).not.toHaveBeenCalled();
    });

    it('재발급은 Route Handler 로 직결해야 한다 — baseURL 이 빠지면 재발급이 죽는다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      instance.post.mockResolvedValueOnce({ data: { success: true } });

      await captured.responseErr!({ response: { status: 401 }, config: { url: '/x' } });

      expect(instance.post).toHaveBeenCalledTimes(1);
      const [url, body, config] = instance.post.mock.calls[0];
      expect(url).toBe('/api/auth/reissue');
      expect(body).toEqual({});
      // baseURL 을 비우지 않으면 '/api/v1' 이 전치돼 '/api/v1/api/auth/reissue' 로 나간다
      //   → 백엔드가 401 을 내고 **재발급 자체가 파손된다**(소스 주석이 명시한 함정).
      expect((config as { baseURL?: string }).baseURL).toBe('');
      // 만료된 Authorization 을 그대로 실어 보내면 재발급이 거절된다.
      expect((config as { headers?: Record<string, string> }).headers?.Authorization).toBe('');
      // 재발급 요청 자신이 401 을 받아도 다시 재발급을 타지 않도록 표시한다.
      expect((config as { _retry?: boolean })._retry).toBe(true);
    });

    it('재발급에 성공하면 원요청을 재시도한다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();
      instance.post.mockResolvedValueOnce({ data: { success: true } });
      const original = { url: '/x' };

      const result = await captured.responseErr!({ response: { status: 401 }, config: original });

      // 재시도가 없으면 사용자는 만료 직후 한 번의 실패를 그대로 본다.
      expect(result).toEqual({ __retriedWith: expect.objectContaining({ url: '/x', _retry: true }) });
    });

    it('재발급 응답이 success:false 면 실패로 취급하고 로그인으로 보낸다', async () => {
      const win = { location: { pathname: '/admin/users', href: '' }, dispatchEvent: vi.fn() };
      Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true });
      const { instance, captured } = await loadClient();
      // HTTP 200 이지만 본문이 실패 — 상태코드만 보면 성공으로 오독한다.
      instance.post.mockResolvedValueOnce({ data: { success: false } });

      await expect(
        captured.responseErr!({ response: { status: 401 }, config: { url: '/x' } })
      ).rejects.toThrow('Token reissue failed');

      expect(win.location.href).toContain('/login?expired=true');
      // 돌아올 곳을 실어 보내야 사용자가 하던 화면으로 복귀한다.
      expect(win.location.href).toContain(encodeURIComponent('/admin/users'));
    });

    it('재발급 자체가 실패해도 로그인으로 보낸다', async () => {
      const win = { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() };
      Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true });
      const { instance, captured } = await loadClient();
      instance.post.mockRejectedValueOnce(new Error('network down'));

      await expect(
        captured.responseErr!({ response: { status: 401 }, config: { url: '/x' } })
      ).rejects.toBeInstanceOf(Error);

      expect(win.location.href).toContain('/login?expired=true');
    });
  });

  describe('오류 정규화', () => {
    it('백엔드 message 를 최종 오류 메시지로 쓴다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() },
        configurable: true, writable: true,
      });
      const { captured } = await loadClient();
      const error = Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { message: '제목을 입력해주세요.' } },
      });

      // axios 기본 문구를 그대로 보여주면 사용자는 무엇이 잘못됐는지 알 수 없다.
      await expect(captured.responseErr!(error)).rejects.toThrow('제목을 입력해주세요.');
    });

    it('오류를 전역 이벤트로 알린다 — 토스트가 이 이벤트에 붙어 있다', async () => {
      const dispatchEvent = vi.fn();
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent },
        configurable: true, writable: true,
      });
      const { captured } = await loadClient();

      await expect(
        captured.responseErr!(Object.assign(new Error('boom'), {
          response: { status: 500, data: { message: '서버 오류' } },
        }))
      ).rejects.toBeDefined();

      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('api-error');
      expect(event.detail).toEqual({ message: '서버 오류', status: 500 });
    });

    it('401 이 아닌 오류는 재발급을 타지 않는다', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { pathname: '/admin', href: '' }, dispatchEvent: vi.fn() },
        configurable: true, writable: true,
      });
      const { instance, captured } = await loadClient();

      await expect(
        captured.responseErr!(Object.assign(new Error('nope'), { response: { status: 403 } }))
      ).rejects.toBeDefined();

      expect(instance.post).not.toHaveBeenCalled();
    });
  });
});
