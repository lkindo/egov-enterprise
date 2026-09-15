import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
