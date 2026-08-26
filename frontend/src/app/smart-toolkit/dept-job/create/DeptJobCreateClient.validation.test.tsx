import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createDeptJob: vi.fn(),
  invalidateQueries: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({ data: { list: [] }, isFetching: false }),
}));
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: { createDeptJob: mocks.createDeptJob },
}));
import DeptJobCreateClient from './DeptJobCreateClient';

describe('DeptJobCreateClient server validation ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DeptJobForm 제출은 부모 등록 sink를 한 번만 호출하고 pending·필드 오류 뒤 값을 보존한다', async () => {
    let rejectCreate!: (reason?: unknown) => void;
    const serverError = {
      response: { data: { errors: [{ field: 'deptTaskNm', message: '중복된 업무명입니다.' }] } },
    };
    mocks.createDeptJob.mockReturnValueOnce(new Promise<number>((_, reject) => {
      rejectCreate = reject;
    }));
    render(<DeptJobCreateClient />);
    const taskName = screen.getByRole('textbox', { name: /업무명/ });
    fireEvent.change(taskName, { target: { value: '보존할 중복 업무' } });
    const submit = screen.getByRole('button', { name: '업무 등록' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createDeptJob).toHaveBeenCalledTimes(1));
    expect(mocks.createDeptJob).toHaveBeenCalledWith(expect.objectContaining({
      deptTaskNm: '보존할 중복 업무',
    }));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectCreate(serverError));

    expect(await screen.findByText('중복된 업무명입니다.')).toBeVisible();
    expect(taskName).toHaveValue('보존할 중복 업무');
    expect(submit).not.toBeDisabled();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
