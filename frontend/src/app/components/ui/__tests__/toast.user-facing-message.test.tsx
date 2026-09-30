import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({ base: vi.fn(), error: vi.fn(), success: vi.fn(), loading: vi.fn() }));

vi.mock('sonner', () => ({
  toast: Object.assign(sonner.base, { error: sonner.error, success: sonner.success, loading: sonner.loading }),
}));

/*
 * vitest.setup.ts 가 이 모듈을 전역으로 목킹한다(대부분의 화면 테스트는 토스트 구현이 필요 없다).
 * 여기서는 실제 useToast 가 sonner 에 무엇을 넘기는지가 대상이므로 원본을 불러온다 —
 * 원본이 import 하는 sonner 는 위의 목을 그대로 쓴다.
 */
async function loadUseToast() {
  const actual = await vi.importActual<typeof import('../toast')>('../toast');
  return actual.useToast;
}

/**
 * [2026-09-15 DEC-OPS-100] 토스트는 문자열이 아닌 값을 받으면 사용자 문장만 뽑는다.
 * 종전에는 객체를 JSON 원문으로, axios 오류는 transport 원문으로 보여 줬다.
 */
describe('useToast 문구', () => {
  beforeEach(() => vi.clearAllMocks());

  it('문자열이 아닌 axios 오류는 원문이나 JSON 대신 한국어 안내를 보인다', async () => {
    const useToast = await loadUseToast();
    const { result } = renderHook(() => useToast());
    result.current.toast({ isAxiosError: true, message: 'Network Error', config: { url: '/x' } }, 'error');

    expect(sonner.error).toHaveBeenCalledWith('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('서버 문구를 담은 객체는 그 문구를, 문자열은 그대로 보인다', async () => {
    const useToast = await loadUseToast();
    const { result } = renderHook(() => useToast());
    result.current.toast({ response: { data: { message: '권한이 없습니다.' } } }, 'error');
    expect(sonner.error).toHaveBeenLastCalledWith('권한이 없습니다.');

    result.current.toast('문의를 등록했습니다.', 'success');
    expect(sonner.success).toHaveBeenLastCalledWith('문의를 등록했습니다.');
  });

  it('호출부가 넘긴 전송 오류 문자열은 사용자 문장으로 쓰지 않는다', async () => {
    const useToast = await loadUseToast();
    const { result } = renderHook(() => useToast());
    result.current.toast('Request failed with status code 500', 'error');

    expect(sonner.error).toHaveBeenCalledWith('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });
});

/**
 * [2026-09-30] 실패 한 번에 토스트는 하나다.
 *
 * 종전에는 API 인터셉터의 전역 알림과 화면의 catch 토스트가 둘 다 떠서 같은 실패가 두 번(조회 재시도까지 세 번)
 * 보였다. 전역 알림은 화면이 스스로 알리지 않은 실패에만 뜨고, 화면이 알리면 전역 문구는 그 토스트의 설명 줄로
 * 들어간다 — 서버가 준 사유를 잃지 않는다.
 */
describe('실패 알림의 주인', () => {
  async function mountProvider() {
    const actual = await vi.importActual<typeof import('../toast')>('../toast');
    const view = render(<actual.ToastProvider><span /></actual.ToastProvider>);
    const hook = renderHook(() => actual.useToast());
    return { view, toast: hook.result.current };
  }

  function apiError(message: string, status = 500) {
    window.dispatchEvent(new CustomEvent('api-error', { detail: { message, status } }));
  }

  // 모듈 상태(방금 뜬 전역 토스트의 시각)가 다음 테스트로 넘어가지 않게, 테스트마다 시계를 교체 창보다 멀리 옮긴다.
  let clock = Date.UTC(2026, 8, 30);

  beforeEach(() => {
    vi.clearAllMocks();
    clock += 60_000;
    vi.useFakeTimers();
    vi.setSystemTime(clock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('화면이 알리지 않은 실패는 전역 토스트 하나로 알린다', async () => {
    const { view } = await mountProvider();
    apiError('서버 오류');
    expect(sonner.error).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(sonner.error).toHaveBeenCalledTimes(1);
    expect(sonner.error).toHaveBeenCalledWith('서버 오류', { id: 'api-error:서버 오류' });
    view.unmount();
  });

  it('화면이 같은 실패를 알리면 토스트는 하나이고, 서버가 준 사유는 설명 줄에 남는다', async () => {
    const { view, toast } = await mountProvider();
    apiError('이미 처리된 결재입니다.', 409);
    // 화면의 catch 는 거절 직후(전역 알림의 대기 시간 안)에 돈다.
    toast.toast('결재를 승인하지 못했습니다.', 'error');
    vi.advanceTimersByTime(10);

    expect(sonner.error).toHaveBeenCalledTimes(1);
    expect(sonner.error).toHaveBeenCalledWith('결재를 승인하지 못했습니다.', { description: '이미 처리된 결재입니다.' });
    view.unmount();
  });

  it('화면이 서버 문구를 그대로 알리면 같은 문장을 두 번 싣지 않는다', async () => {
    const { view, toast } = await mountProvider();
    apiError('권한이 없습니다.', 403);
    toast.error('권한이 없습니다.');
    vi.advanceTimersByTime(10);

    expect(sonner.error).toHaveBeenCalledTimes(1);
    expect(sonner.error).toHaveBeenCalledWith('권한이 없습니다.');
    view.unmount();
  });

  it('재시도가 같은 문구로 다시 실패해도 토스트는 쌓이지 않는다 — 같은 id 로 갱신된다', async () => {
    const { view } = await mountProvider();
    apiError('서버 오류');
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(1000);
    apiError('서버 오류');
    vi.advanceTimersByTime(0);

    const ids = sonner.error.mock.calls.map((call) => (call[1] as { id?: string } | undefined)?.id);
    expect(ids).toEqual(['api-error:서버 오류', 'api-error:서버 오류']);
    view.unmount();
  });

  it('화면이 늦게 알리면(조회 실패를 effect 에서 알림) 이미 뜬 전역 토스트를 교체한다', async () => {
    const { view, toast } = await mountProvider();
    apiError('서버 오류');
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(300);
    toast.toast('목록을 불러오지 못했습니다.', 'error');

    expect(sonner.error).toHaveBeenLastCalledWith('목록을 불러오지 못했습니다.', {
      id: 'api-error:서버 오류',
      description: '서버 오류',
    });
    view.unmount();
  });

  it('교체 창이 지난 뒤의 화면 토스트는 앞선 실패와 무관한 새 토스트다', async () => {
    const { view, toast } = await mountProvider();
    apiError('서버 오류');
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(5000);
    toast.toast('입력값을 확인해 주세요.', 'error');

    expect(sonner.error).toHaveBeenLastCalledWith('입력값을 확인해 주세요.');
    view.unmount();
  });

  it('성공·안내 토스트는 실패 알림을 거둬 가지 않는다', async () => {
    const { view, toast } = await mountProvider();
    apiError('서버 오류');
    toast.toast('저장했습니다.', 'success');
    vi.advanceTimersByTime(0);

    expect(sonner.error).toHaveBeenCalledWith('서버 오류', { id: 'api-error:서버 오류' });
    view.unmount();
  });

  it('401 은 알리지 않는다 — 재발급·로그인 이동이 처리한다', async () => {
    const { view } = await mountProvider();
    apiError('인증이 필요합니다.', 401);
    vi.advanceTimersByTime(10);

    expect(sonner.error).not.toHaveBeenCalled();
    view.unmount();
  });

  it('화면이 사라지면 대기 중인 전역 알림도 거둔다', async () => {
    const { view } = await mountProvider();
    apiError('서버 오류');
    view.unmount();
    vi.advanceTimersByTime(10);

    expect(sonner.error).not.toHaveBeenCalled();
  });
});
