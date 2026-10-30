import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageInProjection } from '@/test-utils/projection';

// These cases exercise the actual confirmation dialog and cancellation/focus behavior.
vi.unmock('@/app/components/ui/confirm-modal');
vi.unmock('@/components/ui/dialog');

// 고정 메뉴의 경로 — 원본에서는 로그인만 요구하는 관리 화면이 게이트를 통과하는지를 함께 본다. 그 화면이 투영으로 빠진
//   생성물에는 그런 관리 화면이 없으므로 관리 밖 core 경로로 본다(page 파일이 원장에 있고 실제로 없을 때다).
const WORK_HUB_ROUTE = pageInProjection('/admin/work-hub') ? '/admin/work-hub' : '/smart-toolkit/dept-job';

/**
 * [2026-10-01] 사이드바는 메뉴 조회 실패와 '배정된 메뉴 없음' 을 같은 문구로 말하지 않는다.
 * 실패면 다시 시도를 두고, 배정이 정말 없으면 그 사실을 말한다.
 */
const menu = vi.hoisted(() => ({ getHeadMenus: vi.fn(), getLeftMenus: vi.fn(), getMyBookmarkStatus: vi.fn(), cleanupUnavailableBookmarks: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { id: 'u', groups: ['USER'], permissions: [] as string[], authorizationVersion: 'v1' }, checkAuth: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/services/business/user/MenuService', () => ({ menuService: menu }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

import { Sidebar } from '../sidebar';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { ConfirmProvider } from '@/app/components/ui/confirm-modal';

function OpenSidebar() {
  const { setSidebarOpen, isSidebarOpen } = useLayout();
  return <button onClick={() => setSidebarOpen(true)} aria-expanded={isSidebarOpen}>메뉴 열기</button>;
}

function renderSidebar() {
  // Even a retrying application default must not retry an explicit cleanup.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: true }, mutations: { retry: 2, retryDelay: 0 } } });
  const tree = () => <QueryClientProvider client={client}><ConfirmProvider><LayoutProvider><OpenSidebar /><Sidebar /></LayoutProvider></ConfirmProvider></QueryClientProvider>;
  const rendered = render(tree());
  return { ...rendered, client, refresh: () => rendered.rerender(tree()) };
}

const cleanupButton = () => screen.getByRole('button', { name: '사용할 수 없는 즐겨찾기 정리' });
const confirmDialog = () => screen.findByRole('dialog', { name: '사용할 수 없는 즐겨찾기 정리' });

describe('사이드바 메뉴 조회 상태', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.user = { id: 'u', groups: ['USER'], permissions: [], authorizationVersion: 'v1' };
    auth.checkAuth.mockResolvedValue(undefined);
    menu.getHeadMenus.mockResolvedValue([]);
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 0 });
    menu.cleanupUnavailableBookmarks.mockResolvedValue({ removedCount: 1 });
  });

  it('조회에 실패하면 실패를 말하고 다시 시도하면 메뉴를 다시 읽는다', async () => {
    menu.getHeadMenus.mockRejectedValueOnce(new Error('network')).mockResolvedValue([
      { menuNo: 1, menuNm: '업무', useYn: 'Y', children: [{ menuNo: 2, menuNm: '업무 홈', useYn: 'Y', modernRoute: WORK_HUB_ROUTE }] },
    ]);
    renderSidebar();

    expect(await screen.findByText('메뉴를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('이 계정에 배정된 메뉴가 없습니다.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(menu.getHeadMenus).toHaveBeenCalledTimes(2));
  });

  it('배정된 메뉴가 정말 없으면 실패가 아니라 배정 없음으로 말한다', async () => {
    menu.getHeadMenus.mockResolvedValue([]);
    renderSidebar();

    expect(await screen.findByText('이 계정에 배정된 메뉴가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });

  it('즐겨찾기를 사이드바 위쪽 묶음으로 보이고, 지금 열 수 없는 메뉴의 즐겨찾기는 뺀다 (2026-10-01)', async () => {
    menu.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '업무', useYn: 'Y', children: [{ menuNo: 2, menuNm: '업무 홈', useYn: 'Y', modernRoute: WORK_HUB_ROUTE }] },
    ]);
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [{ menuNo: 2, menuNm: '업무 홈' }, { menuNo: 99, menuNm: '회수된 메뉴' }], unavailableCount: 0 });
    renderSidebar();

    const group = await screen.findByRole('group', { name: '즐겨찾기' });
    expect(await within(group).findByRole('link', { name: '업무 홈' })).toHaveAttribute('href', WORK_HUB_ROUTE);
    expect(within(group).queryByText('회수된 메뉴')).not.toBeInTheDocument();
  });

  it('열 수 있는 즐겨찾기가 없어도 보관 개수만 알리고 취소하면 쓰지 않는다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 2 });
    renderSidebar();
    expect(await screen.findByText('사용할 수 없는 즐겨찾기 2개가 보관되어 있습니다.')).toBeInTheDocument();
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
    await userEvent.click(cleanupButton());
    const dialog = await confirmDialog();
    expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(cleanupButton()).toHaveFocus());
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
    expect(menu.getHeadMenus).toHaveBeenCalledTimes(2);
    expect(menu.getMyBookmarkStatus).toHaveBeenCalledTimes(2);
  });

  it('메뉴 조회 실패를 빈 트리로 간주해 모든 즐겨찾기를 정리하지 않는다', async () => {
    menu.getHeadMenus.mockRejectedValue(new Error('head unavailable'));
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [{ menuNo: 99, menuNm: '보존할 메뉴' }], unavailableCount: 1 });
    renderSidebar();
    expect(await screen.findByText('즐겨찾기의 현재 상태를 확인하지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText(/사용할 수 없는 즐겨찾기 \d+개/)).not.toBeInTheDocument();
    expect(cleanupButton()).toBeDisabled();
    await userEvent.click(cleanupButton());
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });

  it('즐겨찾기 조회 실패는 0건이 아니며 재시도 뒤에만 정리할 수 있다', async () => {
    menu.getMyBookmarkStatus.mockRejectedValueOnce(new Error('status unavailable')).mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    renderSidebar();
    expect(await screen.findByText('즐겨찾기의 현재 상태를 확인하지 못했습니다.')).toBeInTheDocument();
    expect(cleanupButton()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '즐겨찾기 상태 다시 확인' }));
    expect(await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.')).toBeInTheDocument();
    expect(cleanupButton()).not.toBeDisabled();
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });

  it('전체 메뉴를 아직 읽는 중이면 숨김 개수를 확정하거나 정리하지 않는다', async () => {
    let finish: (value: []) => void = () => undefined;
    menu.getHeadMenus.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 2 });
    renderSidebar();
    expect(await screen.findByText('즐겨찾기의 현재 상태를 확인하는 중입니다.')).toBeInTheDocument();
    expect(cleanupButton()).toBeDisabled();
    expect(screen.queryByText(/사용할 수 없는 즐겨찾기 \d+개/)).not.toBeInTheDocument();
    await act(async () => { finish([]); });
    expect(await screen.findByText('사용할 수 없는 즐겨찾기 2개가 보관되어 있습니다.')).toBeInTheDocument();
  });

  it('확인 전 재조회가 실패하면 이전 개수로 확인창을 열거나 삭제하지 않는다', async () => {
    menu.getHeadMenus.mockResolvedValueOnce([]).mockRejectedValue(new Error('fresh read failed'));
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(cleanupButton());
    await screen.findByText('즐겨찾기의 현재 상태를 확인하지 못했습니다.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });

  it('성공한 빈 전체 트리에서는 기존 서버 목록을 UI 불가 후보로 확인한다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [{ menuNo: 99, menuNm: '화면에서 열 수 없는 이름' }], unavailableCount: 1 });
    const { client } = renderSidebar();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await screen.findByText('사용할 수 없는 즐겨찾기 2개가 보관되어 있습니다.');
    expect(screen.queryByText('화면에서 열 수 없는 이름')).not.toBeInTheDocument();
    await userEvent.click(cleanupButton());
    const dialog = await confirmDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledWith({
      expectedAuthorizationVersion: 'v1', expectedServerUnavailableCount: 1, uiUnavailableMenuNos: [99],
    }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['menus', 'bookmarks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['menus', 'command-center', 'bookmarks'] });
  });

  it('확인 직전에 새로 읽은 개수와 전체 트리로 후보를 고정한다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValueOnce({ bookmarks: [], unavailableCount: 1 })
      .mockResolvedValue({ bookmarks: [{ menuNo: 99, menuNm: '새 후보' }], unavailableCount: 2 });
    renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(cleanupButton());
    const dialog = await confirmDialog();
    expect(within(dialog).getByText('3개를 즐겨찾기에서 삭제할까요? 권한이 복구되어도 자동으로 돌아오지 않습니다.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledWith({
      expectedAuthorizationVersion: 'v1', expectedServerUnavailableCount: 2, uiUnavailableMenuNos: [99],
    }));
  });

  it.each(['account', 'authorization'])('확인 중 %s가 바뀌면 새 scope로 바꿔 보내지 않고 취소한다', async (change) => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    const { refresh } = renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(cleanupButton());
    const dialog = await confirmDialog();
    auth.user = { ...auth.user, ...(change === 'account' ? { id: 'other' } : { authorizationVersion: 'v2' }) };
    refresh();
    await userEvent.click(within(dialog).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.', 'info'));
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });

  it('확인 중 즐겨찾기 변경이 알려지면 기존 후보를 폐기한다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    const { client } = renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(cleanupButton());
    const dialog = await confirmDialog();
    await act(() => client.invalidateQueries({ queryKey: ['menus', 'bookmarks'], refetchType: 'none' }));
    await userEvent.click(within(dialog).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.', 'info'));
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });

  it('409 뒤에는 인증·목록을 갱신하고 자동 재시도 없이 다시 확인받는다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    menu.cleanupUnavailableBookmarks.mockRejectedValueOnce({ response: { status: 409 } }).mockResolvedValue({ removedCount: 1 });
    renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(cleanupButton());
    await userEvent.click(within(await confirmDialog()).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(auth.checkAuth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cleanupButton()).not.toHaveAttribute('aria-busy', 'true'));
    expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledTimes(1);
    await userEvent.click(cleanupButton());
    await userEvent.click(within(await confirmDialog()).getByRole('button', { name: '정리하기' }));
    await waitFor(() => expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledTimes(2));
  });

  it('같은 틱의 연타에도 확인과 정리 요청은 각각 하나다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    let finish: (value: { removedCount: number }) => void = () => undefined;
    menu.cleanupUnavailableBookmarks.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    act(() => { cleanupButton().click(); cleanupButton().click(); });
    const dialog = await confirmDialog();
    expect(menu.getMyBookmarkStatus).toHaveBeenCalledTimes(2);
    const submit = within(dialog).getByRole('button', { name: '정리하기' });
    act(() => { submit.click(); submit.click(); });
    await waitFor(() => expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledTimes(1));
    try {
      await userEvent.click(cleanupButton());
      expect(menu.getMyBookmarkStatus).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(menu.cleanupUnavailableBookmarks).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => { finish({ removedCount: 1 }); });
    }
  });

  it('열린 서랍 위 확인창의 Escape는 정리만 취소하고 서랍·초점을 보존한다', async () => {
    menu.getMyBookmarkStatus.mockResolvedValue({ bookmarks: [], unavailableCount: 1 });
    renderSidebar();
    await screen.findByText('사용할 수 없는 즐겨찾기 1개가 보관되어 있습니다.');
    await userEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    await userEvent.click(cleanupButton());
    await confirmDialog();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'true');
    expect(cleanupButton()).toHaveFocus();
    expect(menu.cleanupUnavailableBookmarks).not.toHaveBeenCalled();
  });
});
