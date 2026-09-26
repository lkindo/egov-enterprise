import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelDraft: vi.fn(),
  confirm: vi.fn(),
  confirmMutation: vi.fn(),
  createDraft: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
  getProcessed: vi.fn(),
  getTaskTypes: vi.fn(),
  getDetail: vi.fn(),
  toast: vi.fn(),
}));

// 기안 다이얼로그는 자기 테스트(ApprovalDraftDialog.test.tsx)가 있다. 여기서는 열림 상태만 본다.
vi.mock('../ApprovalDraftDialog', () => ({
  ApprovalDraftDialog: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div role="dialog" aria-label="새 결재 기안">기안 다이얼로그</div> : null
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { esntlId: 'approver' } }) }));

vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  SANCTION_STATUS: {
    REQUESTED: 'A',
    APPROVED: 'C',
    REJECTED: 'R',
    WITHDRAWN: 'W',
  },
  isSanctionPending: (value?: string) => value === 'A',
  approvalUserService: {
    cancelDraft: mocks.cancelDraft,
    confirm: mocks.confirmMutation,
    createDraft: mocks.createDraft,
    getMyHistory: mocks.getMyHistory,
    getPending: mocks.getPending,
    getProcessed: mocks.getProcessed,
    getTaskTypes: mocks.getTaskTypes,
    getDetail: mocks.getDetail,
  },
}));

vi.mock('@/app/components/patterns/master-detail-page', () => ({
  MasterDetailPage: ({
    actions,
    detail,
    detailActions,
    master,
    navigation,
  }: {
    actions?: React.ReactNode;
    detail?: React.ReactNode;
    detailActions?: React.ReactNode;
    master?: React.ReactNode;
    navigation?: React.ReactNode;
  }) => (
    <main>
      {actions}
      {navigation}
      <aside>{master}</aside>
      <section>
        {detailActions}
        {detail}
      </section>
    </main>
  ),
}));

vi.mock('../ApprovalStepper', () => ({
  ApprovalStepper: ({ accessibleLabel = '결재선 진행' }: { accessibleLabel?: string }) => (
    <ol aria-label={accessibleLabel}><li>결재 단계</li></ol>
  ),
}));

import ApprovalHubClient from '../ApprovalHubClient';
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';

const pendingApproval = {
  ifmlAtrzSn: 73,
  aplcntId: 'drafter',
  aplcntNm: '기안자',
  aprvrId: 'approver',
  aprvrNm: '결재자',
  aprvYn: 'A',
  reqYmd: '20260830',
  taskSeCd: 'LEAVE',
  taskSeNm: '휴가 신청',
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider><ApprovalHubClient /></UnsavedChangesProvider>
    </QueryClientProvider>,
  );
}

describe('ApprovalHubClient handleAction pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.cancelDraft.mockResolvedValue(undefined);
    mocks.confirmMutation.mockResolvedValue(undefined);
    mocks.getMyHistory.mockResolvedValue({ list: [], total: 0 });
    mocks.getProcessed.mockResolvedValue({ list: [], total: 0 });
    mocks.getTaskTypes.mockResolvedValue([]);
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 2, canApprove: id !== 74 && id !== 75, canWithdraw: id === 74, canResubmit: false }));
  });

  /**
   * [2026-09-05] 종전 '결재 처리 이력' 탭은 신청자 기준(getMyHistory)을 불렀다. 탭 세 개가 각각
   * 이름이 약속하는 서비스를 부르고, '새 결재 기안' 은 페이지 이동이 아니라 다이얼로그를 연다.
   */
  it('세 탭이 각각 이름이 약속하는 목록을 부르고 기안 버튼은 다이얼로그를 연다', async () => {
    mocks.getMyHistory.mockResolvedValue({
      list: [{ ...pendingApproval, ifmlAtrzSn: 74, taskSeNm: '내가 올린 건' }], total: 1,
    });
    mocks.getProcessed.mockResolvedValue({
      list: [{ ...pendingApproval, ifmlAtrzSn: 75, aprvYn: 'C', taskSeNm: '내가 처리한 건' }], total: 1,
    });
    renderClient();

    await screen.findByText('휴가 신청');
    expect(mocks.getPending).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '결재 문서 보관함' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    await screen.findByText('내가 올린 건');
    expect(mocks.getMyHistory).toHaveBeenCalledWith({ page: 0, size: 20 });
    // 신청자 탭에서는 승인·반려 버튼이 없다 — 결재자만 확정한다.
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 처리한 결재' }));
    await screen.findByText('내가 처리한 건');
    expect(mocks.getProcessed).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(screen.getByText('승인 완료')).toBeInTheDocument();

    expect(screen.queryByRole('dialog', { name: '새 결재 기안' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '새 결재 기안' }));
    expect(screen.getByRole('dialog', { name: '새 결재 기안' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '새 결재 기안' })).not.toBeInTheDocument();
  });

  /**
   * [2026-09-05] 종전에는 `{ page: 0, size: 50 }` 한 페이지만 받고 페이저가 없어 51번째 문서부터
   * 도달 불가였다. 페이지를 넘기면 서버 페이지가 바뀌고 이전 페이지의 선택은 해제된다.
   */
  it('목록이 한 페이지를 넘으면 페이저로 다음 페이지를 조회하고 stale 선택을 해제한다', async () => {
    const secondPageItem = { ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '두 번째 페이지 건' };
    mocks.getPending.mockImplementation(async ({ page }: { page: number }) => (
      page === 0
        ? { list: [pendingApproval], total: 45 }
        : { list: [secondPageItem], total: 45 }
    ));
    renderClient();

    await screen.findByText('휴가 신청');
    expect(mocks.getPending).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(await screen.findByRole('button', { name: '결재 승인' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: '2' }));

    await screen.findByText('두 번째 페이지 건');
    expect(mocks.getPending).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(screen.queryByText('휴가 신청')).not.toBeInTheDocument();
    // 페이지가 바뀌면 이전 선택(#73)은 stale 이므로 상세는 새 페이지 첫 항목으로 간다.
    expect(screen.getByRole('button', { name: /두 번째 페이지 건 #99 상세 열기/ })).toHaveAttribute('aria-current', 'true');
  });

  it('마지막 페이지가 비면 마지막 페이지로 되돌려 빈 대기함에 갇히지 않는다 (DIP C4)', async () => {
    const lastPageItem = { ...pendingApproval, ifmlAtrzSn: 98, taskSeNm: '세 번째 페이지 건' };
    let total = 45;
    mocks.getPending.mockImplementation(async ({ page }: { page: number }) => {
      if (page === 2) return { list: total > 40 ? [lastPageItem] : [], total };
      return { list: [{ ...pendingApproval, ifmlAtrzSn: 70 + page, taskSeNm: `${page + 1}페이지 건` }], total };
    });
    renderClient();
    await screen.findByText('1페이지 건');
    fireEvent.click(screen.getByRole('link', { name: '3' }));
    await screen.findByText('세 번째 페이지 건');

    // 마지막 페이지의 유일한 문서가 처리돼 전체가 40건(2페이지)으로 줄었다.
    total = 40;
    fireEvent.click(screen.getByRole('button', { name: '결재함 목록 새로고침' }));

    expect(await screen.findByText('2페이지 건')).toBeInTheDocument();
    expect(mocks.getPending).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });

  it('공백 반려 사유는 요약과 inline 오류로 연결하고 첫 오류 입력에 초점을 둔다', async () => {
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 반려' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('반려 사유');
    expect(summary).toHaveTextContent('반려 사유를 입력해 주세요.');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(reason).toHaveFocus());
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('서버 reason 오류를 필드에 연결하고 반려 입력값을 보존한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    confirmMutation.mockRejectedValueOnce({
      response: {
        data: {
          errors: [{ field: 'reason', message: '반려 사유를 더 구체적으로 입력해 주세요.' }],
        },
      },
    });
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '현재 입력은 유지되어야 합니다.' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 반려' }));

    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    const summary = await screen.findByRole('alert', { name: /입력 오류/ });
    expect(summary).toHaveTextContent('반려 사유를 더 구체적으로 입력해 주세요.');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveValue('현재 입력은 유지되어야 합니다.');
  });

  it('결재 승인은 confirm 전 동기 선점하고 pending 상태와 실패 피드백을 제공한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    const approve = await screen.findByRole('button', { name: '결재 승인' });

    act(() => {
      fireEvent.click(approve);
      fireEvent.click(approve);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '결재 반려' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('결재 승인 API 장애'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '승인 처리 중 오류가 발생했습니다.',
      'error',
    ));
    expect(screen.getByText('휴가 신청')).toBeInTheDocument();
    expect(approve).toBeEnabled();
    expect(approve).not.toHaveAttribute('aria-busy');
  });

  /**
   * 기안 취소(철회) — 되돌릴 수 없는 동작이므로 확인 → 동기 선점 → 실패 노출을 모두 지킨다.
   *
   * 서버는 신청자 본인 + 대기('A') 상태만 허용한다(InformalSanctionService#deleteInformalSanction).
   * 화면도 같은 조건에서만 버튼을 띄운다 — '내가 올린 결재' 탭 + 대기 상태.
   */
  it('기안 취소는 내가 올린 대기 건에만 뜨고, 대상 문서 번호를 밝힌 확인 뒤 철회한다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    renderClient();

    // 결재 대기함(결재자 시점)에는 기안 취소가 없다 — 남의 기안을 철회할 수 없다.
    await screen.findByText('휴가 신청');
    expect(screen.queryByRole('button', { name: '결재 회수' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });
    fireEvent.click(cancel);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0].message).toContain('#74');
    expect(mocks.confirm.mock.calls[0][0].variant).toBe('destructive');
    await waitFor(() => expect(mocks.cancelDraft).toHaveBeenCalledWith(74, 2));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문서를 회수했습니다. 처리 이력은 보존됩니다.', 'success'));
  });

  it('기안 취소는 확인 대기 중에도 재진입을 막고 pending 상태·실패 사유를 드러낸다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    // 지역 이름은 census 가 세는 write sink(cancelMutation.mutateAsync)와 같은 이름으로 둔다.
    const cancelMutation = mocks.cancelDraft;
    const pending = deferred<void>();
    cancelMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });

    act(() => {
      fireEvent.click(cancel);
      fireEvent.click(cancel);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cancelMutation).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(cancel).toHaveAttribute('aria-busy', 'true');

    // 서버가 이유를 말하면(예: '신청 상태인 경우에만 삭제할 수 있습니다.') 그대로 드러낸다 —
    // 고정 문구로 덮으면 사용자가 왜 실패했는지 알 수 없다.
    await act(async () => {
      pending.reject(new Error('신청 상태인 경우에만 삭제할 수 있습니다.'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '신청 상태인 경우에만 삭제할 수 있습니다.',
      'error',
    ));
    expect(cancel).toBeEnabled();
  });

  it('확인 대화에서 취소하면 아무것도 지우지 않고 잠금을 푼다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    mocks.confirm.mockResolvedValue(false);
    renderClient();

    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });
    fireEvent.click(cancel);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.cancelDraft).not.toHaveBeenCalled();
    await waitFor(() => expect(cancel).toBeEnabled());
  });

  it('결재 반려는 중복 실행을 막고 실패 뒤 입력 사유를 보존한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '예산 코드 확인이 필요합니다.' } });
    const reject = screen.getByRole('button', { name: '결재 반려' });

    act(() => {
      fireEvent.click(reject);
      fireEvent.click(reject);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(confirmMutation).toHaveBeenCalledWith(73, 'R', '예산 코드 확인이 필요합니다.', 2);
    expect(reject).toBeDisabled();
    expect(reject).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '결재 승인' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('결재 반려 API 장애'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '반려 처리 중 오류가 발생했습니다.',
      'error',
    ));
    expect(reason).toHaveValue('예산 코드 확인이 필요합니다.');
    expect(reject).toBeEnabled();
    expect(reject).not.toHaveAttribute('aria-busy');
  });

  it('신청 상태와 대기 탭만으로 승인 권한을 추론하지 않는다', async () => {
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 2, canApprove: false, canWithdraw: false, canResubmit: false });
    renderClient(); await screen.findByText('휴가 신청');
    await waitFor(() => expect(mocks.getDetail).toHaveBeenCalledWith(73));
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 반려' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 회수' })).not.toBeInTheDocument();
  });

  it('합의 동의를 실제 단계와 버전으로 전송하고 승인 의견을 보존한다', async () => {
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 4, canApprove: true, stages: [{ order: 1, kind: 'AGREEMENT', status: 'ACTIVE', approvers: [{ userId: 'approver', status: 'ACTIVE' }] }] });
    renderClient(); const agree = await screen.findByRole('button', { name: '합의 동의' });
    fireEvent.change(screen.getByRole('textbox', { name: '결재 의견 (반려 시 필수)' }), { target: { value: '검토한 내용에 동의합니다.' } });
    fireEvent.click(agree);
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledWith(73, 'C', '검토한 내용에 동의합니다.', 4));
  });

  it('처리한 문서의 바로 다음 문서로 넘어가고, 마지막이었으면 바로 앞 문서로 간다 (DIP C8)', async () => {
    // 종전에는 처리한 문서가 아닌 첫 문서로 가서, 목록 중간에서 처리하면 매번 맨 위로 되돌아갔다.
    const doc = (sn: number, name: string) => ({ ...pendingApproval, ifmlAtrzSn: sn, taskSeNm: name });
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서'), doc(73, '셋째 문서')], total: 3 });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '둘째 문서 #72 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));

    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: '셋째 문서 #73 상세 열기' })).toHaveAttribute('aria-current', 'true'));

    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
  });

  it('작성 중 의견이 있는 문서 선택 변경을 취소하면 의견과 기존 선택을 보존한다', async () => {
    mocks.getPending.mockResolvedValue({ list: [pendingApproval, { ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '다음 문서' }], total: 2 });
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '작성 중 검토 의견' } }); mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '저장하지 않은 변경' })));
    expect(reason).toHaveValue('작성 중 검토 의견');
    expect(screen.getByRole('button', { name: '휴가 신청 #73 상세 열기' })).toHaveAttribute('aria-current', 'true');
    mocks.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    expect(await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' })).toHaveValue('');
  });

  it('409 후 의견을 유지하고 최신 상세를 확인하기 전 재처리를 막는다', async () => {
    mocks.confirmMutation.mockRejectedValueOnce({ response: { status: 409 } });
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '입력을 보존할 의견' } }); fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('입력한 의견은 유지됩니다.');
    expect(reason).toHaveValue('입력을 보존할 의견');
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 3, canApprove: true });
    fireEvent.click(screen.getByRole('button', { name: '최신 문서 확인' }));
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenLastCalledWith(73, 'C', '입력을 보존할 의견', 3));
  });

  it('목록 새로고침으로 문서가 사라져도 의견을 다른 첫 문서로 옮기지 않는다', async () => {
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려 시 필수)' });
    fireEvent.change(reason, { target: { value: '73번 문서의 검토 의견' } });
    mocks.getPending.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '다른 첫 문서' }], total: 1 });
    fireEvent.click(screen.getByRole('button', { name: '결재함 목록 새로고침' }));
    await screen.findByText('다른 첫 문서');
    expect(screen.getByRole('status')).toHaveTextContent('입력은 이 문서에 보존했습니다.');
    expect(reason).toHaveValue('73번 문서의 검토 의견'); expect(reason).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(mocks.getDetail).not.toHaveBeenCalledWith(99);
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('이력에 현재 차수만 있으면 이전 차수 이력을 표시하지 않는다', async () => {
    mocks.getDetail.mockResolvedValue({
      ...pendingApproval, docTtl: '최초 문서', docCn: '최초 본문', atrzCycl: 1,
      history: [{ atrzCycl: 1, docTtl: '최초 문서', docCn: '최초 본문', aprvYn: 'A', stages: [] }],
    });
    renderClient();
    await screen.findByRole('heading', { name: '최초 문서 · 1차' });
    expect(screen.queryByRole('region', { name: '이전 차수 이력' })).not.toBeInTheDocument();
    expect(screen.getAllByText('최초 본문')).toHaveLength(1);
    expect(screen.getByRole('list', { name: '결재선 진행' })).toBeInTheDocument();
  });

  it('전체 이력에서 이전 차수만 표시하고 현재 문서와 결재선 이름을 구분한다', async () => {
    mocks.getDetail.mockResolvedValue({
      ...pendingApproval, docTtl: '보완된 문서', docCn: '현재 본문', version: 3, atrzCycl: 2, canApprove: false,
      history: [
        { atrzCycl: 1, docTtl: '최초 문서', docCn: '이전 본문', aprvYn: 'R', stages: [] },
        { atrzCycl: 2, docTtl: '보완된 문서', docCn: '현재 본문', aprvYn: 'A', stages: [] },
      ],
    });
    renderClient();
    await screen.findByRole('heading', { name: '보완된 문서 · 2차' });
    expect(screen.getAllByText('현재 본문')).toHaveLength(1);
    expect(screen.getByText('1차 · 최초 문서 · 반려')).toBeInTheDocument();
    expect(screen.getByText('이전 본문')).toBeInTheDocument();
    expect(screen.queryByText('2차 · 보완된 문서 · 대기')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: '결재선 진행' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('1차 · 최초 문서 · 반려'));
    expect(screen.getByRole('list', { name: '1차 결재선 진행' })).toBeInTheDocument();
  });
});
