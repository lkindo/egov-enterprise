import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyResponseClient from '../SurveyResponseClient';

const mocks = vi.hoisted(() => ({
  deleteResponse: vi.fn(),
  getResponses: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/api/survey', () => ({
  deleteQustnrRespondInfo: (...args: unknown[]) => mocks.deleteResponse(...args),
  getQustnrRespondInfoList: (...args: unknown[]) => mocks.getResponses(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function renderSubject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SurveyResponseClient /></QueryClientProvider>);
}

describe('SurveyResponseClient destructive boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    mocks.getResponses.mockResolvedValue({
      list: [{
        srvyRspnsSn: 7,
        rspnsNm: '홍길동',
        rspdntAnsCn: '만족합니다.',
        crtDt: '2026-08-26',
      }],
      total: 1,
      totalPage: 1,
    });
  });

  it('확인된 삭제는 같은 tick 중복 요청을 막고 pending 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.deleteResponse.mockReturnValueOnce(pending.promise);
    renderSubject();
    const remove = await screen.findByRole('button', { name: '홍길동 응답 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.deleteResponse).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '홍길동 응답 삭제 중' })).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: '응답자 이름 검색' })).toBeVisible();

    await act(async () => pending.resolve());
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('삭제되었습니다.'));
  });

  it('확인 콜백 전에 동기 잠금하고 중복 삭제·pending·실패 복구를 한 경로에서 보장한다', async () => {
    const pending = deferred<void>();
    mocks.deleteResponse.mockReturnValue(pending.promise);
    mocks.getResponses.mockResolvedValueOnce({
      list: [
        { srvyRspnsSn: 7, rspnsNm: '홍길동', rspdntAnsCn: '만족합니다.', crtDt: '2026-08-26' },
        { srvyRspnsSn: 8, rspnsNm: '김영희', rspdntAnsCn: '보통입니다.', crtDt: '2026-08-26' },
      ],
      total: 2,
      totalPage: 1,
    });
    renderSubject();
    const remove = await screen.findByRole('button', { name: '홍길동 응답 삭제' });
    const otherRemove = screen.getByRole('button', { name: '김영희 응답 삭제' });
    let reentered = false;
    vi.stubGlobal('confirm', vi.fn(() => {
      if (!reentered) {
        reentered = true;
        otherRemove.click();
      }
      return true;
    }));

    act(() => remove.click());

    await waitFor(() => expect(mocks.deleteResponse).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '홍길동 응답 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('응답 삭제 API 장애')));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('삭제 실패: 응답 삭제 API 장애'));
    expect(screen.getByText('홍길동')).toBeVisible();
    expect(screen.getByRole('button', { name: '홍길동 응답 삭제' })).toBeEnabled();
  });

  it('삭제 실패를 알리고 동일 응답을 다시 삭제할 수 있도록 pending 상태를 해제한다', async () => {
    mocks.deleteResponse.mockRejectedValueOnce(new Error('응답 삭제 API 장애'));
    renderSubject();

    const remove = await screen.findByRole('button', { name: '홍길동 응답 삭제' });
    await act(async () => {
      remove.click();
    });

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('삭제 실패: 응답 삭제 API 장애'));
    expect(screen.getByRole('button', { name: '홍길동 응답 삭제' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '홍길동 응답 삭제' })).not.toHaveAttribute('aria-busy');
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
