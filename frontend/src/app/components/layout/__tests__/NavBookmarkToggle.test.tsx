import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';

/**
 * [2026-09-26 DIP B5 F2] 사이드바 말단 메뉴의 즐겨찾기 토글.
 */
const mocks = vi.hoisted(() => ({
  getMyBookmarkStatus: vi.fn(),
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  toast: vi.fn(),
  authUser: vi.fn(),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getMyBookmarkStatus: mocks.getMyBookmarkStatus,
    addBookmark: mocks.addBookmark,
    removeBookmark: mocks.removeBookmark,
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authUser() }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/LayoutContext', () => ({ useLayout: () => ({ setSidebarOpen: vi.fn() }) }));

import { NavBookmarkToggle } from '../NavBookmarkToggle';
import { useMenuBookmarkToggle } from '@/hooks/api/use-menu-bookmarks';
import { NavBookmarkSlot, NavItem } from '../NavItem';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function menu(overrides: Partial<MenuInfo>): MenuInfo {
  return { menuNo: 1, menuNm: '메뉴', upperMenuId: 0, upMenuSn: 0, menuOrdr: 1, modernRoute: '/admin', ...overrides };
}

describe('메뉴 즐겨찾기 토글', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.authUser.mockReturnValue({ id: 'staff01', authorizationVersion: 'v1' });
    mocks.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [{ menuNo: 10, menuNm: '공지' }], unavailableCount: 0 });
    mocks.addBookmark.mockResolvedValue(undefined);
    mocks.removeBookmark.mockResolvedValue(undefined);
  });

  it('즐겨찾기한 메뉴는 눌린 상태로 보이고, 누르면 뺀다', async () => {
    const user = userEvent.setup();
    renderWithClient(<NavBookmarkToggle menuNo={10} menuNm="공지" />);
    const toggle = screen.getByRole('button', { name: '공지 즐겨찾기' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));

    await user.click(toggle);
    await waitFor(() => expect(mocks.removeBookmark).toHaveBeenCalledWith(10));
    expect(mocks.addBookmark).not.toHaveBeenCalled();
  });

  it('즐겨찾기하지 않은 메뉴를 누르면 더하고, 목록을 다시 읽는다', async () => {
    const user = userEvent.setup();
    renderWithClient(<NavBookmarkToggle menuNo={20} menuNm="결재함" />);
    const toggle = screen.getByRole('button', { name: '결재함 즐겨찾기' });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    await waitFor(() => expect(mocks.addBookmark).toHaveBeenCalledWith(20));
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(2));
  });

  it('처리 중에는 다시 눌러도 요청이 하나만 나가고, 실패하면 서버 사유를 알린다', async () => {
    const user = userEvent.setup();
    let reject: (error: Error) => void = () => undefined;
    mocks.addBookmark.mockImplementation(() => new Promise((_, r) => { reject = r; }));
    renderWithClient(<NavBookmarkToggle menuNo={20} menuNm="결재함" />);
    const toggle = screen.getByRole('button', { name: '결재함 즐겨찾기' });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalled());
    await waitFor(() => expect(toggle).not.toBeDisabled());

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-busy', 'true'));
    expect(toggle).toBeDisabled();
    toggle.click();
    expect(mocks.addBookmark).toHaveBeenCalledTimes(1);

    reject(new Error('즐겨찾기는 30개까지 둘 수 있습니다. 쓰지 않는 즐겨찾기를 빼 주세요.'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('즐겨찾기는 30개까지 둘 수 있습니다. 쓰지 않는 즐겨찾기를 빼 주세요.', 'error'));
    await waitFor(() => expect(toggle).not.toBeDisabled());
  });

  it('같은 틱에 두 번 불러도 요청은 하나만 나간다 — 화면이 다시 그려지기 전의 연타를 막는다', async () => {
    let resolve: () => void = () => undefined;
    mocks.addBookmark.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useMenuBookmarkToggle(20, '결재함'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalled());
    await waitFor(() => expect(result.current.toggleReady).toBe(true));

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.toggle();
      void result.current.toggle();
    });
    await waitFor(() => expect(mocks.addBookmark).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(mocks.addBookmark).toHaveBeenCalledTimes(1);
    resolve();
    await act(async () => { await first; });
  });

  it('추가·빼기 뒤 사이드바 상태와 기존 명령 센터 목록을 모두 무효화한다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useMenuBookmarkToggle(20, '결재함'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalled());
    await waitFor(() => expect(result.current.toggleReady).toBe(true));
    await act(async () => { await result.current.toggle(); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['menus', 'bookmarks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['menus', 'command-center', 'bookmarks'] });
  });

  it('사이드바 슬롯은 말단 메뉴에만 별을 그리고, 슬롯이 없으면 그리지 않는다', () => {
    const tree = menu({ menuNo: 1, menuNm: '업무', children: [menu({ menuNo: 2, menuNm: '결재함', modernRoute: '/approvals' })] });
    const slot = (item: MenuInfo) => <span data-testid={`star-${item.menuNo}`} />;

    const { unmount } = render(<NavBookmarkSlot value={slot}><NavItem item={menu({ menuNo: 3, menuNm: '공지' })} /><NavItem item={tree} /></NavBookmarkSlot>);
    expect(screen.getByTestId('star-3')).toBeInTheDocument();
    expect(screen.queryByTestId('star-1')).toBeNull();
    unmount();

    render(<NavItem item={menu({ menuNo: 3, menuNm: '공지' })} />);
    expect(screen.queryByTestId('star-3')).toBeNull();
  });

  it('첫 상태 조회가 끝나기 전에는 쓰지 않고, 확인한 뒤 추가하면 새 상태를 읽는다', async () => {
    const user = userEvent.setup();
    let resolveInitial!: (value: { bookmarks: { menuNo: number; menuNm: string }[]; unavailableCount: number }) => void;
    mocks.getMyBookmarkStatus.mockImplementationOnce(() => new Promise(resolve => { resolveInitial = resolve; }))
      .mockResolvedValue({ bookmarks: [{ menuNo: 20, menuNm: '결재함' }], unavailableCount: 0 });
    renderWithClient(<NavBookmarkToggle menuNo={20} menuNm="결재함" />);
    const toggle = screen.getByRole('button', { name: '결재함 즐겨찾기' });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(1));
    expect(toggle).toBeDisabled();
    expect(toggle).not.toHaveAttribute('aria-busy', 'true');
    await user.click(toggle);
    expect(mocks.addBookmark).not.toHaveBeenCalled();
    expect(mocks.removeBookmark).not.toHaveBeenCalled();

    await act(async () => { resolveInitial({ bookmarks: [], unavailableCount: 0 }); });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    await user.click(toggle);
    await waitFor(() => expect(mocks.addBookmark).toHaveBeenCalledWith(20));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));
    expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(2);
  });

  it('첫 상태 조회가 실패하면 빈 목록으로 추정해 쓰지 않는다', async () => {
    mocks.getMyBookmarkStatus.mockRejectedValue(new Error('상태 조회 실패'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useMenuBookmarkToggle(20, '결재함'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(client.getQueryState(['menus', 'bookmarks', 'staff01', 'v1'])?.status).toBe('error'));
    expect(result.current.toggleReady).toBe(false);
    expect(result.current.togglePending).toBe(false);
    await act(async () => { await result.current.toggle(); });
    expect(mocks.addBookmark).not.toHaveBeenCalled();
    expect(mocks.removeBookmark).not.toHaveBeenCalled();
  });

  it('계정·권한 범위가 바뀌면 새 상태를 확인하기 전의 호출을 거부한다', async () => {
    let resolveNext!: (value: { bookmarks: { menuNo: number; menuNm: string }[]; unavailableCount: number }) => void;
    mocks.getMyBookmarkStatus.mockResolvedValueOnce({ bookmarks: [{ menuNo: 20, menuNm: '결재함' }], unavailableCount: 0 })
      .mockImplementationOnce(() => new Promise(resolve => { resolveNext = resolve; }))
      .mockResolvedValue({ bookmarks: [{ menuNo: 20, menuNm: '결재함' }], unavailableCount: 0 });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result, rerender } = renderHook(() => useMenuBookmarkToggle(20, '결재함'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.isBookmarked).toBe(true));
    mocks.authUser.mockReturnValue({ id: 'staff02', authorizationVersion: 'v2' });
    rerender();
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(2));
    expect(result.current.toggleReady).toBe(false);
    expect(result.current.togglePending).toBe(false);
    await act(async () => { await result.current.toggle(); });
    expect(mocks.addBookmark).not.toHaveBeenCalled();
    expect(mocks.removeBookmark).not.toHaveBeenCalled();
    await act(async () => { resolveNext({ bookmarks: [], unavailableCount: 0 }); });
    await waitFor(() => expect(result.current.toggleReady).toBe(true));
    await act(async () => { await result.current.toggle(); });
    expect(mocks.addBookmark).toHaveBeenCalledWith(20);
    expect(mocks.removeBookmark).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isBookmarked).toBe(true));
  });

  it('성공한 캐시의 배경 재조회 중에는 토글을 계속 사용할 수 있다', async () => {
    let resolveBackground!: (value: { bookmarks: { menuNo: number; menuNm: string }[]; unavailableCount: number }) => void;
    mocks.getMyBookmarkStatus.mockImplementationOnce(() => new Promise(resolve => { resolveBackground = resolve; }))
      .mockResolvedValue({ bookmarks: [{ menuNo: 20, menuNm: '결재함' }], unavailableCount: 0 });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = ['menus', 'bookmarks', 'staff01', 'v1'];
    client.setQueryData(key, { bookmarks: [], unavailableCount: 0 });
    const { result } = renderHook(() => useMenuBookmarkToggle(20, '결재함'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    let background!: Promise<void>;
    act(() => { background = client.invalidateQueries({ queryKey: key }); });
    await waitFor(() => expect(mocks.getMyBookmarkStatus).toHaveBeenCalledTimes(1));
    expect(result.current.toggleReady).toBe(true);
    expect(result.current.togglePending).toBe(false);
    await act(async () => { await result.current.toggle(); });
    expect(mocks.addBookmark).toHaveBeenCalledWith(20);
    await act(async () => { resolveBackground({ bookmarks: [], unavailableCount: 0 }); await background; });
    await waitFor(() => expect(result.current.isBookmarked).toBe(true));
  });
});
