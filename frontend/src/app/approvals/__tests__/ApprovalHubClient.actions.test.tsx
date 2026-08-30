import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  confirmMutation: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
  toast: vi.fn(),
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

vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  SANCTION_STATUS: {
    REQUESTED: 'A',
    APPROVED: 'C',
    REJECTED: 'R',
  },
  isSanctionPending: (value?: string) => value === 'A',
  approvalUserService: {
    confirm: mocks.confirmMutation,
    getMyHistory: mocks.getMyHistory,
    getPending: mocks.getPending,
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
  ApprovalStepper: () => <div>결재 단계</div>,
}));

import ApprovalHubClient from '../ApprovalHubClient';

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
      <ApprovalHubClient />
    </QueryClientProvider>,
  );
}

describe('ApprovalHubClient handleAction pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.confirmMutation.mockResolvedValue(undefined);
    mocks.getMyHistory.mockResolvedValue({ list: [], total: 0 });
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 1 });
  });

  it('공백 반려 사유는 요약과 inline 오류로 연결하고 첫 오류 입력에 초점을 둔다', async () => {
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '반려 사유' });
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

    const reason = await screen.findByRole('textbox', { name: '반려 사유' });
    fireEvent.change(reason, { target: { value: '현재 입력은 유지되어야 합니다.' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 반려' }));

    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    const summary = await screen.findByRole('alert');
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

  it('결재 반려는 중복 실행을 막고 실패 뒤 입력 사유를 보존한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '반려 사유' });
    fireEvent.change(reason, { target: { value: '예산 코드 확인이 필요합니다.' } });
    const reject = screen.getByRole('button', { name: '결재 반려' });

    act(() => {
      fireEvent.click(reject);
      fireEvent.click(reject);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(confirmMutation).toHaveBeenCalledWith(73, 'R', '예산 코드 확인이 필요합니다.');
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
});
