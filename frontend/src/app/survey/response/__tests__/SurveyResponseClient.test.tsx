import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyResponseClient from '../SurveyResponseClient';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteResponse: vi.fn(),
  getResponses: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  permissions: ['SURVEY_RSP_READ', 'SURVEY_RSP_DELETE'],
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { authorizationVersion: 'test-v1', permissions: mocks.permissions } }) }));

// [2026-09-06 DEC-OPS-038] 네이티브 confirm → useConfirm 모달(모듈 mock).
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/lib/api/survey', () => ({
  cancelSurveySubmission: (...args: unknown[]) => mocks.deleteResponse(...args),
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
    mocks.permissions = ['SURVEY_RSP_READ', 'SURVEY_RSP_DELETE'];
    mocks.confirm.mockResolvedValue(true);
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

  /**
   * [2026-08-29] 첫 화면이 1페이지를 요청한다.
   *
   * 종전에는 1-base 인 `pageNo` 를 그대로 실어 `page: 1`(= Spring 기준 두 번째 페이지)을
   * 보냈다. 응답이 한 페이지뿐이면 표는 '검색 결과가 없습니다.' 인데 머리말은 '총 1건의
   * 응답이 조회되었습니다.' 라고 말하고, 페이저는 '1 / 1' 로 양쪽이 비활성이라 사용자는
   * 있는 데이터에 닿을 방법이 없었다.
   */
  it('첫 페이지를 0-base 로 요청한다 — 화면의 1페이지가 서버의 1페이지다', async () => {
    renderSubject();
    await screen.findByRole('button', { name: '홍길동 전체 제출 취소' });

    expect(mocks.getResponses).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10 }),
    );
  });

  it('모든 문항과 선택을 취소함을 안내하고 사용자가 돌아가면 요청하지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderSubject();
    const cancel = await screen.findByRole('button', { name: '홍길동 전체 제출 취소' });
    await act(async () => cancel.click());
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '전체 제출 취소',
      message: expect.stringContaining('모든 문항·선택 답변을 함께 취소'),
      confirmText: '전체 제출 취소',
    }));
    expect(mocks.deleteResponse).not.toHaveBeenCalled();
    expect(cancel).toBeEnabled();
  });

  it('응답 읽기 권한만 있으면 상세는 열 수 있지만 제출 취소를 제공하지 않는다', async () => {
    mocks.permissions = ['SURVEY_RSP_READ'];
    renderSubject();
    expect(await screen.findByRole('button', { name: '홍길동 응답 상세보기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '홍길동 전체 제출 취소' })).not.toBeInTheDocument();
    expect(mocks.deleteResponse).not.toHaveBeenCalled();
  });

  it('확인된 삭제는 같은 tick 중복 요청을 막고 pending 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.deleteResponse.mockReturnValueOnce(pending.promise);
    renderSubject();
    const remove = await screen.findByRole('button', { name: '홍길동 전체 제출 취소' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.deleteResponse).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '홍길동 전체 제출 취소 중' })).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: '응답자 이름 검색' })).toBeVisible();

    await act(async () => pending.resolve());
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('전체 제출을 취소했습니다.'));
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
    const remove = await screen.findByRole('button', { name: '홍길동 전체 제출 취소' });
    const otherRemove = screen.getByRole('button', { name: '김영희 전체 제출 취소' });
    let reentered = false;
    // 확인 모달이 열린 동안(응답 대기 중) 다른 행을 눌러도 동기 잠금이 막는다.
    mocks.confirm.mockImplementation(async () => {
      if (!reentered) {
        reentered = true;
        otherRemove.click();
      }
      return true;
    });

    act(() => remove.click());

    await waitFor(() => expect(mocks.deleteResponse).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '홍길동 전체 제출 취소 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('전체 제출 취소 API 장애')));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('전체 제출을 취소하지 못했습니다. 응답 상태와 권한을 확인해 주세요.'));
    expect(screen.getByText('홍길동')).toBeVisible();
    expect(screen.getByRole('button', { name: '홍길동 전체 제출 취소' })).toBeEnabled();
  });

  it('삭제 실패를 알리고 동일 응답을 다시 삭제할 수 있도록 pending 상태를 해제한다', async () => {
    mocks.deleteResponse.mockRejectedValueOnce(new Error('전체 제출 취소 API 장애'));
    renderSubject();

    const remove = await screen.findByRole('button', { name: '홍길동 전체 제출 취소' });
    await act(async () => {
      remove.click();
    });

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('전체 제출을 취소하지 못했습니다. 응답 상태와 권한을 확인해 주세요.'));
    expect(screen.getByRole('button', { name: '홍길동 전체 제출 취소' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '홍길동 전체 제출 취소' })).not.toHaveAttribute('aria-busy');
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  /*
   * [2026-09-15 DEC-OPS-100] 목록 조회 실패는 0건도 전송 오류 원문도 아니다. 조건 없이 비어 있는 목록은
   * 검색 결과 없음이 아니다(G15).
   */
  it('목록 조회가 실패하면 0건과 오류 원문 대신 실패와 다시 불러오기를 보인다', async () => {
    mocks.getResponses.mockRejectedValue(new Error('Request failed with status code 500'));
    renderSubject();

    expect(await screen.findByText('응답 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('응답 수를 확인하지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText(/총 0건/)).toBeNull();
    expect(screen.queryByText(/Request failed|연결 오류/)).toBeNull();
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeEnabled();
  });

  it("🚨 '기타' 답과 이름 없는 이전 응답을 빈 칸으로 두지 않는다 (DIP V8)", async () => {
    mocks.getResponses.mockResolvedValue({
      list: [
        { srvyRspnsSn: 9, rspnsNm: '김기타', etcAnsCn: '재택 근무 확대', crtDt: '2026-09-26' },
        { srvyRspnsSn: 10, rspnsNm: '', rspdntAnsCn: '만족합니다.', crtDt: '2026-09-01' },
      ],
      total: 2,
      totalPage: 1,
    });
    renderSubject();

    expect(await screen.findByText('기타: 재택 근무 확대')).toBeInTheDocument();
    expect(screen.getByText('이름 없음(이전 응답)')).toBeInTheDocument();
  });

  it('검색어 없이 비어 있으면 검색 결과 없음이 아니라 등록된 응답이 없다고 말한다', async () => {
    mocks.getResponses.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    renderSubject();

    expect(await screen.findByText('등록된 응답이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다.')).toBeNull();
  });

  it('선택형 표시: 서버가 보강한 선택 내용과 삭제된 항목 안내를 표시하고 자유답·기타 우선순위를 보존한다', async () => {
    const base = {
      srvySn: 201, srvyTmpltSn: 11, srvyQstnSn: 301, srvyArtclSn: 401,
      rspdntAnsCn: '', etcAnsCn: '', frstRgtrId: 'test-user', crtDt: '2026-09-27',
    };
    mocks.getResponses.mockResolvedValue({
      list: [
        { ...base, srvyRspnsSn: 21, rspnsNm: '선택 응답', rspdntAnsCn: '교육' },
        { ...base, srvyRspnsSn: 22, srvyArtclSn: 402, rspnsNm: '선택 응답', rspdntAnsCn: '복지' },
        { ...base, srvyRspnsSn: 23, srvyArtclSn: 499, rspnsNm: '항목 조회 불가 응답' },
        { ...base, srvyRspnsSn: 24, rspnsNm: '직접 작성 응답', rspdntAnsCn: '작성한 답변', etcAnsCn: '보조 입력' },
        { ...base, srvyRspnsSn: 25, rspnsNm: '기타 선택 응답', rspdntAnsCn: ' ', etcAnsCn: '재택 근무 확대' },
      ],
      total: 5,
      totalPage: 1,
    });
    renderSubject();

    expect(await screen.findByText('교육')).toBeVisible();
    expect(screen.getByText('복지')).toBeVisible();
    expect(screen.getAllByText('선택 응답')).toHaveLength(2);
    const unavailableRow = screen.getByText('항목 조회 불가 응답').closest('tr')!;
    expect(within(unavailableRow).getByText('선택 항목을 확인할 수 없습니다.')).toBeVisible();
    expect(screen.getByText('작성한 답변')).toBeVisible();
    expect(screen.queryByText(/보조 입력/)).toBeNull();
    expect(screen.getByText('기타: 재택 근무 확대')).toBeVisible();
    expect(mocks.getResponses).toHaveBeenCalledTimes(1);
    expect(mocks.deleteResponse).not.toHaveBeenCalled();
  });
});
