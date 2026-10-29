import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 등록자의 담당자 재지정(2026-10-01 결정 22).
 *
 * 등록자는 맡긴 업무의 담당자만 바꾼다 — 서버 힌트 reassignable 일 때만 버튼이 보이고, 내용 수정·삭제 버튼은
 * 보이지 않는다. 담당자 본인·관리자는 수정 폼에서 바꾸므로 이 버튼을 따로 보지 않는다.
 */
const mocks = vi.hoisted(() => ({
  reassignDeptJob: vi.fn(),
  updateDeptJob: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  invalidateQueries: vi.fn(),
  jobResponse: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: () => {} }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), error: mocks.toastError, success: mocks.toastSuccess }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (user: { esntlId: string; userNm: string }) => void }) => (isOpen
    ? <button type="button" onClick={() => onSelect({ esntlId: 'USR_NEW', userNm: '새 담당자' })}>새 담당자 고르기</button>
    : null),
}));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: { reassignDeptJob: mocks.reassignDeptJob, updateDeptJob: mocks.updateDeptJob, deleteDeptJob: vi.fn() },
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({ data: mocks.jobResponse, isLoading: false, isError: false }),
  useMutation: () => ({ isPending: false, mutate: vi.fn(), mutateAsync: vi.fn() }),
}));

import DeptJobDetailClient from './DeptJobDetailClient';

describe('DeptJobDetailClient reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reassignDeptJob.mockResolvedValue(undefined);
    mocks.jobResponse = { deptTaskSn: 7, deptTaskNm: '맡긴 업무', picNm: '기존 담당자', editable: false, deletable: false, reassignable: true, version: 4 };
  });

  it('등록자에게는 담당자 바꾸기만 보이고 수정·삭제는 보이지 않는다', () => {
    render(<DeptJobDetailClient deptTaskSn={7} />);
    expect(screen.getByRole('button', { name: /담당자 바꾸기/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /업무 삭제/ })).toBeNull();
  });

  it.each([0, 4])('새 담당자를 고르면 esntlId와 읽은 버전 %i로 한 번 재지정하고 결과를 알린다', async (version) => {
    mocks.jobResponse = { ...mocks.jobResponse, version };
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));
    await waitFor(() => expect(mocks.reassignDeptJob).toHaveBeenCalledWith(7, 'USR_NEW', version));
    expect(mocks.reassignDeptJob).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('담당자를 새 담당자님으로 바꿨습니다.'));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dept-job', 7] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['work-jobs'] });
    expect(mocks.updateDeptJob).not.toHaveBeenCalled();
  });

  it('409면 서버 사유를 알리고 상세를 다시 읽으며 성공 처리나 담당자 덮어쓰기를 하지 않는다', async () => {
    const conflict = '다른 사용자가 먼저 수정했습니다. 최신 업무를 확인한 뒤 다시 담당자를 골라 주세요.';
    mocks.reassignDeptJob.mockRejectedValueOnce({ response: { status: 409, data: { message: conflict } } });
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(conflict));
    expect(mocks.reassignDeptJob).toHaveBeenCalledTimes(1);
    expect(mocks.reassignDeptJob).toHaveBeenCalledWith(7, 'USR_NEW', 4);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.updateDeptJob).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dept-job', 7] });
    expect(mocks.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['work-jobs'] });
    // The query mock has not returned refreshed data yet: a rejected choice must not replace it.
    expect(screen.getByText('기존 담당자')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: /담당자 바꾸기/ })).toBeEnabled());
  });

  it('선택창을 연 뒤 상세가 갱신되어도 처음 확인한 버전으로 재지정해 충돌을 감추지 않는다', async () => {
    const conflict = '다른 사용자가 담당자를 바꿨습니다. 최신 업무를 확인한 뒤 다시 골라 주세요.';
    mocks.reassignDeptJob.mockRejectedValueOnce({ response: { status: 409, data: { message: conflict } } });
    const { rerender } = render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    expect(screen.getByRole('button', { name: '새 담당자 고르기' })).toBeVisible();

    // A background query sees another user's committed reassignment while this choice is open.
    // It must not silently advance the version that protects the choice begun at version 4.
    mocks.jobResponse = { ...mocks.jobResponse, version: 5, picId: 'USR_OTHER', picNm: '다른 담당자' };
    rerender(<DeptJobDetailClient deptTaskSn={7} />);
    expect(screen.getByText('다른 담당자')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));

    await waitFor(() => expect(mocks.reassignDeptJob).toHaveBeenCalledWith(7, 'USR_NEW', 4));
    expect(mocks.reassignDeptJob).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(conflict));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.updateDeptJob).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dept-job', 7] });
    expect(screen.getByText('다른 담당자')).toBeVisible();

    // Reopening begins a new choice against the now-visible server state, rather than retaining 4.
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));
    await waitFor(() => expect(mocks.reassignDeptJob).toHaveBeenNthCalledWith(2, 7, 'USR_NEW', 5));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledTimes(1));
  });

  it.each([undefined, null])('조회 버전이 %s이면 버전 없는 담당자 변경을 보내지 않는다', async (version) => {
    mocks.jobResponse = { ...mocks.jobResponse, version };
    render(<DeptJobDetailClient deptTaskSn={7} />);

    await act(async () => {
      const reassign = screen.queryByRole('button', { name: /담당자 바꾸기/ });
      if (reassign) fireEvent.click(reassign);
    });
    await act(async () => {
      const pick = screen.queryByRole('button', { name: '새 담당자 고르기' });
      if (pick) fireEvent.click(pick);
    });

    expect(mocks.reassignDeptJob).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      '업무 정보를 다시 불러옵니다. 최신 내용을 확인한 뒤 담당자를 다시 골라 주세요.',
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dept-job', 7] });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.updateDeptJob).not.toHaveBeenCalled();
    expect(screen.getByText('기존 담당자')).toBeVisible();
  });

  it('재지정이 거부되면 사유를 알리고, 담당자 본인에게는 이 버튼을 두지 않는다', async () => {
    mocks.reassignDeptJob.mockRejectedValue(new Error('사용 중이 아닌 사용자입니다.'));
    const { unmount } = render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    unmount();

    mocks.jobResponse = { ...mocks.jobResponse, editable: true, deletable: true, reassignable: true };
    render(<DeptJobDetailClient deptTaskSn={7} />);
    expect(screen.queryByRole('button', { name: /담당자 바꾸기/ })).toBeNull();
  });
});
