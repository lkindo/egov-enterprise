import { Suspense, createContext, useContext, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MenuByAuthorityClient from '../MenuByAuthorityClient';

const mocks = vi.hoisted(() => ({
  getAuthorList: vi.fn(),
  getAuthorMenus: vi.fn(),
  getAllMenus: vi.fn(),
  push: vi.fn(),
}));

const SelectCtx = createContext<{ onValueChange?: (v: string) => void }>({});

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/services/foundation/system/AuthorAdminService', () => ({
  authorAdminService: {
    getAuthorList: (...args: unknown[]) => mocks.getAuthorList(...args),
    getAuthorMenus: (...args: unknown[]) => mocks.getAuthorMenus(...args),
  },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: {
    getAllMenus: (...args: unknown[]) => mocks.getAllMenus(...args),
  },
}));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, filter, toolbarActions, children }: {
    title: string; filter: ReactNode; toolbarActions: ReactNode; children: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{filter}</div>
      <div>{toolbarActions}</div>
      <div>{children}</div>
    </div>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
    <SelectCtx.Provider value={{ onValueChange }}>{children}</SelectCtx.Provider>
  ),
  SelectTrigger: ({ children }: { id?: string; children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => {
    const { onValueChange } = useContext(SelectCtx);
    return <button type="button" onClick={() => onValueChange?.(value)}>{children}</button>;
  },
}));

async function renderWithClient(initialData: Array<{ authrtCd: string; authrtNm: string }> = [{ authrtCd: 'ROLE_USER', authrtNm: '일반 사용자' }]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let rendered!: ReturnType<typeof render>;
  await act(async () => {
    rendered = render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <MenuByAuthorityClient authorsPromise={Promise.resolve({ data: initialData, error: null })} />
        </Suspense>
      </QueryClientProvider>,
    );
  });
  return rendered;
}

describe('MenuByAuthorityClient behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all authority pages on refresh instead of truncating at page 1', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      authrtCd: `ROLE_${i + 1}`,
      authrtNm: `역할 ${i + 1}`,
    }));
    const page2 = [
      { authrtCd: 'ROLE_101', authrtNm: '역할 101' },
      { authrtCd: 'ROLE_102', authrtNm: '역할 102' },
    ];
    mocks.getAuthorList
      .mockResolvedValueOnce({ list: page1, total: 102, page: 1, size: 100, totalPage: 2 })
      .mockResolvedValueOnce({ list: page2, total: 102, page: 2, size: 100, totalPage: 2 });
    mocks.getAllMenus.mockResolvedValue([]);

    await renderWithClient([]);
    await screen.findByText('조회된 권한 그룹 0개');

    fireEvent.click(screen.getByRole('button', { name: '권한 목록과 메뉴 트리 새로고침' }));

    await waitFor(() => expect(mocks.getAuthorList).toHaveBeenCalledTimes(2));
    expect(mocks.getAuthorList).toHaveBeenNthCalledWith(1, { page: 1, size: 100, searchCondition: '1', searchKeyword: '' });
    expect(mocks.getAuthorList).toHaveBeenNthCalledWith(2, { page: 2, size: 100, searchCondition: '1', searchKeyword: '' });
    expect(await screen.findByText('조회된 권한 그룹 102개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '역할 102 (ROLE_102)' })).toBeInTheDocument();
  });

  it('shows an error state and retries when /menus/all (MENU_READ) fails instead of claiming no menus assigned', async () => {
    mocks.getAuthorMenus.mockResolvedValue([
      { menuSn: 10, authrtCd: 'ROLE_USER', chkYeoBu: 1 },
    ]);
    mocks.getAllMenus
      .mockRejectedValueOnce(new Error('MENU_READ 권한이 필요합니다.'))
      .mockResolvedValueOnce([
        { menuNo: 10, menuNm: '게시판', upMenuSn: null, menuOrdr: 1 },
      ]);

    await renderWithClient();
    const roleBtn = await screen.findByRole('button', { name: '일반 사용자 (ROLE_USER)' });
    fireEvent.click(roleBtn);

    expect(await screen.findByText(/MENU_READ 권한이 필요합니다/)).toBeInTheDocument();
    expect(screen.queryByText('할당된 메뉴 없음')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '데이터 다시 불러오기' }));

    expect(await screen.findByText('게시판')).toBeInTheDocument();
  });
});
