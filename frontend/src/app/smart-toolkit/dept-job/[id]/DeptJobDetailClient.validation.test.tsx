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
  /** push 가 불린 **그 순간**의 guard 판정을 포착한다 — 버그는 finally 가 상태를 되돌리기
   *  전, 정확히 이 시점에만 관측된다. 나중에 호출하면 activeAction 이 이미 null 이라 공허하다. */
  guardAtPush: null as null | { dirty: boolean; pending?: boolean },
  routerPush: vi.fn(),
  /** 화면이 UnsavedChangesProvider 에 등록한 guard 콜백. 아래 계약이 직접 호출해 판정한다. */
  unsavedGuard: null as null | (() => { dirty: boolean; pending?: boolean }),
  jobResponse: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.routerPush }) }));
// 실제 Provider 를 렌더하지 않고 guard 콜백만 가로챈다 — 이 화면이 '지금 이동해도 되는가'로
// 무엇을 보고하는지가 계약의 대상이다.
vi.mock('@/contexts/UnsavedChangesContext', () => ({
  useUnsavedChanges: (guard: () => { dirty: boolean; pending?: boolean }) => { mocks.unsavedGuard = guard; },
}));
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
    data: mocks.jobResponse,
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
    mocks.guardAtPush = null;
    mocks.routerPush.mockImplementation(() => { mocks.guardAtPush = mocks.unsavedGuard?.() ?? null; });
    mocks.jobResponse = { deptTaskSn: 7, deptTaskNm: '기존 업무', deptTaskCn: '작성 중인 내용' };
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteDeptJob.mockResolvedValue(undefined);
    mocks.updateDeptJob.mockResolvedValue(undefined);
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

  it('nullable 응답을 빈 폼 값으로 정규화하고 서버 소유 필드 없이 수정한다', async () => {
    mocks.jobResponse = {
      deptTaskSn: 7,
      deptTaskBoxSn: null,
      deptTaskBoxNm: null,
      deptId: null,
      deptNm: null,
      deptTaskNm: null,
      deptTaskCn: null,
      picId: null,
      picNm: null,
      prrtyRnk: null,
      atchFileSn: null,
      frstRgtrId: null,
      crtDt: null,
      lastMdfrId: null,
      mdfcnDt: null,
    };
    render(<DeptJobDetailClient deptTaskSn={7} />);
    fireEvent.click(screen.getByRole('button', { name: /수정/ }));

    const taskName = screen.getByRole('textbox', { name: /업무명/ });
    expect(taskName).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /업무 내용/ })).toHaveValue('');

    fireEvent.change(taskName, { target: { value: '정규화된 업무' } });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateDeptJob).toHaveBeenCalledWith(7, {
      deptTaskBoxSn: undefined,
      deptTaskNm: '정규화된 업무',
      deptTaskCn: '',
      picId: undefined,
      prrtyRnk: '2',
      atchFileSn: undefined,
    }));
    const submitted = mocks.updateDeptJob.mock.calls[0]?.[1];
    expect(submitted).not.toHaveProperty('deptTaskSn');
    expect(submitted).not.toHaveProperty('deptTaskBoxNm');
    expect(submitted).not.toHaveProperty('picNm');
    expect(submitted).not.toHaveProperty('frstRgtrId');
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

  /*
    [회귀] 삭제 성공 뒤의 목록 복귀가 **자기 미저장 가드에 막히던** 결함.

    UnsavedChangesProvider 의 navigate() 는 pending 인 guard 가 하나라도 있으면 이동을
    취소하고 '저장 중입니다…' 토스트만 띄운다. 그런데 삭제 성공 콜백이 router.push 를
    부르는 시점에는 activeAction 이 아직 'delete' 다(해제는 finally). 그래서 가드를 처음
    달았을 때 화면이 삭제된 업무에 그대로 머물렀다.

    ⚠ 이 결함을 단위 테스트가 놓친 이유: 종전 mock 은 useRouter 를 매번 새 vi.fn() 으로 주고
    Provider 를 렌더하지 않아 **보호 라우터 경로 자체가 없었다**. e2e 25 가 잡았다.
    그래서 여기서는 guard 콜백을 가로채 '완료 후에는 pending 을 보고하지 않는다' 를 고정한다.
  */
  it('삭제가 성공하면 목록으로 이동하고, 그 이동을 막을 pending 을 더는 보고하지 않는다', async () => {
    render(<DeptJobDetailClient deptTaskSn={7} />);
    expect(mocks.unsavedGuard, '화면이 미저장 가드를 등록해야 한다').not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await waitFor(() => expect(mocks.deleteDeptJob).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.routerPush).toHaveBeenCalledWith('/smart-toolkit/dept-job'));
    // 핵심: **push 가 불린 그 순간** pending 이 서 있으면 Provider 가 이동을 취소한다.
    expect(mocks.guardAtPush, 'push 시점의 guard 판정을 포착하지 못했다').not.toBeNull();
    expect(mocks.guardAtPush!.pending, '완료 후 pending 이 서 있으면 목록 복귀가 막힌다').toBe(false);
    expect(mocks.guardAtPush!.dirty).toBe(false);
  });

  it('삭제가 실패하면 이동하지 않고 화면을 유지한다', async () => {
    mocks.deleteDeptJob.mockRejectedValueOnce(new Error('권한 없음'));
    render(<DeptJobDetailClient deptTaskSn={7} />);

    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      '삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.',
    ));
    expect(mocks.routerPush).not.toHaveBeenCalledWith('/smart-toolkit/dept-job');
  });
});
