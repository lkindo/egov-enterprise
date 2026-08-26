import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SecurityDeptAuthorityClient from '../SecurityDeptAuthorityClient';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  getAuthorList: vi.fn(),
  getDeptList: vi.fn(),
  toast: vi.fn(),
  updateDeptAuthorities: vi.fn(),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: {
    getDeptList: (...args: unknown[]) => mocks.getDeptList(...args),
  },
}));

vi.mock('@/services/foundation/system/DeptAuthorityAdminService', () => ({
  deptAuthorityAdminService: {
    updateDeptAuthorities: (...args: unknown[]) => mocks.updateDeptAuthorities(...args),
  },
}));

vi.mock('@/services/foundation/system/AuthorAdminService', () => ({
  authorAdminService: {
    getAuthorList: (...args: unknown[]) => mocks.getAuthorList(...args),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityDeptAuthorityClient />
    </QueryClientProvider>,
  );
}

describe('SecurityDeptAuthorityClient contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getDeptList.mockResolvedValue({
      list: [{ ognzId: 'D-100', ognzNm: '기획부' }],
      total: 1,
    });
    mocks.getAuthorList.mockResolvedValue({
      list: [{ authrtCd: 'ROLE_ADMIN', authrtNm: '관리자', authrtExpln: '전체 권한' }],
      total: 1,
      totalPage: 1,
    });
    mocks.updateDeptAuthorities.mockResolvedValue(undefined);
  });

  it('권한 선택 전에는 저장 버튼이 비활성화되어 write sink를 막는다', async () => {
    renderClient();

    fireEvent.click((await screen.findByText('기획부')).closest('button')!);
    const submit = screen.getByRole('button', { name: '부서 전체에 적용' });

    expect(submit).toBeDisabled();
    expect(mocks.updateDeptAuthorities).not.toHaveBeenCalled();
  });

  it('updateDeptAuthorities 적용은 같은 tick 중복 요청을 막고 pending·실패·복구를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.updateDeptAuthorities.mockReturnValueOnce(pending.promise);
    renderClient();

    fireEvent.click((await screen.findByText('기획부')).closest('button')!);
    fireEvent.click(screen.getAllByRole('button', { name: '관리자 권한 선택' })[0]);
    const submit = screen.getByRole('button', { name: '부서 전체에 적용' });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.updateDeptAuthorities).toHaveBeenCalledTimes(1));
    expect(mocks.updateDeptAuthorities).toHaveBeenCalledWith({
      deptId: 'D-100',
      authrtId: 'ROLE_ADMIN',
      allMembers: true,
    });
    expect(screen.getByRole('button', { name: '적용 중…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '적용 중…' })).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('권한 저장 API 장애')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('권한 저장 중 오류가 발생했습니다.', 'error'));
    expect(screen.getByRole('button', { name: '부서 전체에 적용' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: '관리자 권한 선택' })[0]).toHaveAttribute('aria-pressed', 'true');
  });
});
