import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceMyPage from '../WorkspaceMyPageClient';

const mocks = vi.hoisted(() => ({
  getContents: vi.fn(),
  toast: vi.fn(),
  updateContent: vi.fn(),
}));

vi.mock('@/services/foundation/workspace/MyPageAdminService', () => ({
  myPageAdminService: {
    getContents: (...args: unknown[]) => mocks.getContents(...args),
    updateContent: (...args: unknown[]) => mocks.updateContent(...args),
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, filter, title }: {
    actions?: ReactNode;
    children: ReactNode;
    filter?: ReactNode;
    title: string;
  }) => <main><h1>{title}</h1>{actions}{filter}{children}</main>,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor?: (item: unknown, index: number) => ReactNode }>;
    data: unknown[];
  }) => (
    <div>
      {data.map((item, rowIndex) => (
        <div key={rowIndex}>
          {columns.map((column, columnIndex) => (
            <span key={columnIndex}>{column.accessor?.(item, rowIndex)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('WorkspaceMyPage validation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContents.mockResolvedValue([{
      contsSn: 1,
      cntntsNm: '업무 위젯',
      cntcUrl: '/widget',
      cntntsUseYn: 'Y',
      cntntsLinkUrl: '/widget',
      cntntsDc: '업무 위젯',
    }]);
  });

  it('toggleStatus Y/N 상태 변경은 같은 tick 중복 요청을 막고 pending·실패 상태를 안내한다', async () => {
    const pending = deferred<void>();
    mocks.updateContent.mockReturnValueOnce(pending.promise);
    render(<WorkspaceMyPage />);
    const toggle = await screen.findByRole('button', { name: '업무 위젯 상태 변경' });

    act(() => {
      toggle.click();
      toggle.click();
    });

    await waitFor(() => expect(mocks.updateContent).toHaveBeenCalledTimes(1));
    expect(mocks.updateContent).toHaveBeenCalledWith(1, expect.objectContaining({ cntntsUseYn: 'N' }));
    const busy = screen.getByRole('button', { name: '업무 위젯 상태 변경 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('상태 변경 API 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('상태 변경 중 오류가 발생했습니다.', 'error'));
    await waitFor(() => expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).toBeEnabled());
    expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).toHaveTextContent('활성');
    expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).not.toHaveAttribute('aria-busy');
  });

  it('상태 변경 실패를 알리고 기존 값과 재시도 가능한 버튼을 보존한다', async () => {
    mocks.updateContent.mockRejectedValueOnce(new Error('상태 변경 API 장애'));
    render(<WorkspaceMyPage />);

    const toggle = await screen.findByRole('button', { name: '업무 위젯 상태 변경' });
    await act(async () => {
      toggle.click();
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('상태 변경 중 오류가 발생했습니다.', 'error'));
    expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).toHaveTextContent('활성');
    expect(screen.getByRole('button', { name: '업무 위젯 상태 변경' })).not.toHaveAttribute('aria-busy');
  });
});
