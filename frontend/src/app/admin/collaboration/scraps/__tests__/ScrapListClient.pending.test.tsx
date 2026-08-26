import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  delete: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    delete: mocks.delete,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => <main>{actions}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: { columns: Array<{ accessor: (item: Record<string, unknown>, index: number) => React.ReactNode }>; data: Array<Record<string, unknown>> }) => (
    <div>
      {data.map((item, rowIndex) => (
        <div key={rowIndex}>
          {columns.map((column, columnIndex) => <React.Fragment key={columnIndex}>{column.accessor(item, rowIndex)}</React.Fragment>)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: () => ({
    data: {
      list: [{ scrapSn: 17, scrapNm: '삭제할 스크랩', scrapUrl: 'https://example.com', scrapExpln: '보존 설명' }],
      total: 1,
      totalPage: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: ({ mutationFn, onSuccess, onError }: any) => {
    const mutateAsync = async (value: unknown) => {
      try {
        const result = await mutationFn(value);
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    };
    return {
      isPending: false,
      mutateAsync,
      mutate: (value: unknown) => { void mutateAsync(value).catch(() => undefined); },
    };
  },
}));

import ScrapListClient from '../selectScrapList/ScrapListClient';

describe('ScrapListClient delete pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.delete.mockResolvedValue(undefined);
  });

  it('confirm 전에 동기 선점하고 정확한 삭제 제어를 안내하며 실패 뒤 목록을 유지한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.delete.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    render(<ScrapListClient />);
    const remove = screen.getByRole('button', { name: '삭제할 스크랩 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('삭제할 스크랩 삭제 중');

    rejectDelete(new Error('스크랩 목록 삭제 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('스크랩 목록 삭제 오류', 'error'));
    expect(screen.getByText('삭제할 스크랩')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy');
  });
});
