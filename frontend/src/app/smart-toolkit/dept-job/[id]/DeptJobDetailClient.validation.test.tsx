import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteDeptJob: vi.fn(),
  updateDeptJob: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    updateDeptJob: mocks.updateDeptJob,
    deleteDeptJob: mocks.deleteDeptJob,
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({
    data: { deptTaskSn: 7, deptTaskNm: '기존 업무', deptTaskCn: '작성 중인 내용' },
    isLoading: false,
    isError: false,
  }),
  useMutation: ({ mutationFn, onSuccess, onError }: any) => ({
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: async (values: unknown) => {
      try {
        const result = await mutationFn(values);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
  }),
}));

import DeptJobDetailClient from './DeptJobDetailClient';

describe('DeptJobDetailClient server validation ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteDeptJob.mockResolvedValue(undefined);
  });

  it('DeptJobForm 제출은 부모 수정 sink를 한 번만 호출하고 pending·필드 오류 뒤 편집 값을 보존한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'deptTaskNm', message: '중복된 업무명입니다.' }] } },
    };
    mocks.updateDeptJob.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectUpdate = reject;
    }));
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /수정/ }));
    const taskName = screen.getByRole('textbox', { name: /업무명/ });
    fireEvent.change(taskName, { target: { value: '보존할 중복 업무' } });
    const submit = screen.getByRole('button', { name: '수정 저장' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.updateDeptJob).toHaveBeenCalledTimes(1));
    expect(mocks.updateDeptJob).toHaveBeenCalledWith(7, expect.objectContaining({
      deptTaskNm: '보존할 중복 업무',
    }));
    expect(mocks.deleteDeptJob).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();

    await act(async () => rejectUpdate(serverError));

    expect(await screen.findByText('중복된 업무명입니다.')).toBeVisible();
    expect(taskName).toHaveValue('보존할 중복 업무');
    expect(submit).not.toBeDisabled();
    expect(mocks.toastError).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('일반 수정 오류는 mutation 토스트가 안내하고 공용 폼의 편집 값을 유지한다', async () => {
    const serverError = new Error('업무 수정 권한이 없습니다.');
    mocks.updateDeptJob.mockRejectedValueOnce(serverError);
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /수정/ }));
    const taskName = screen.getByRole('textbox', { name: /업무명/ });
    fireEvent.change(taskName, { target: { value: '일반 오류 보존 업무' } });

    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      '수정에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.',
    ));
    expect(taskName).toHaveValue('일반 오류 보존 업무');
    expect(screen.getByRole('button', { name: '수정 저장' })).toBeEnabled();
  });

  it('삭제는 confirm 전에 동기 선점하고 실패 후 상세 화면과 재시도 상태를 유지한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteDeptJob.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<DeptJobDetailClient deptTaskSn={7} />);
    const remove = screen.getByRole('button', { name: /삭제$/ });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteDeptJob).toHaveBeenCalledTimes(1));
    expect(mocks.updateDeptJob).not.toHaveBeenCalled();
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('업무 삭제 중');
    expect(screen.getByRole('button', { name: /수정$/ })).toBeDisabled();

    rejectDelete(new Error('delete failed'));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      '삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.',
    ));
    expect(screen.getByText('기존 업무')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy');
  });
});
