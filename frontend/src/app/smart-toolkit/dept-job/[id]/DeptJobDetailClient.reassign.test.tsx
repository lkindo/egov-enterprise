import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 등록자의 담당자 재지정(2026-10-01 결정 22).
 *
 * 등록자는 맡긴 업무의 담당자만 바꾼다 — 서버 힌트 reassignable 일 때만 버튼이 보이고, 내용 수정·삭제 버튼은
 * 보이지 않는다. 담당자 본인·관리자는 수정 폼에서 바꾸므로 이 버튼을 따로 보지 않는다.
 */
const mocks = vi.hoisted(() => ({
  reassignDeptJob: vi.fn(),
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
  deptJobUserService: { reassignDeptJob: mocks.reassignDeptJob, updateDeptJob: vi.fn(), deleteDeptJob: vi.fn() },
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
    mocks.jobResponse = { deptTaskSn: 7, deptTaskNm: '맡긴 업무', picNm: '기존 담당자', editable: false, deletable: false, reassignable: true };
  });

  it('등록자에게는 담당자 바꾸기만 보이고 수정·삭제는 보이지 않는다', () => {
    render(<DeptJobDetailClient deptTaskSn={7} />);
    expect(screen.getByRole('button', { name: /담당자 바꾸기/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /업무 삭제/ })).toBeNull();
  });

  it('새 담당자를 고르면 esntlId 로 한 번 재지정하고 결과를 알린다', async () => {
    mocks.reassignDeptJob.mockResolvedValue(undefined);
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /담당자 바꾸기/ }));
    fireEvent.click(screen.getByRole('button', { name: '새 담당자 고르기' }));
    await waitFor(() => expect(mocks.reassignDeptJob).toHaveBeenCalledWith(7, 'USR_NEW'));
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('담당자를 새 담당자님으로 바꿨습니다.'));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dept-job', 7] });
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
