import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-01] 사이드바는 메뉴 조회 실패와 '배정된 메뉴 없음' 을 같은 문구로 말하지 않는다.
 * 실패면 다시 시도를 두고, 배정이 정말 없으면 그 사실을 말한다.
 */
const menu = vi.hoisted(() => ({ getHeadMenus: vi.fn(), getLeftMenus: vi.fn(), getMyBookmarks: vi.fn() }));
vi.mock('@/services/business/user/MenuService', () => ({ menuService: menu }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u', groups: ['USER'], permissions: [], authorizationVersion: 'v1' } }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

import { Sidebar } from '../sidebar';
import { LayoutProvider } from '@/contexts/LayoutContext';

function renderSidebar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LayoutProvider><Sidebar /></LayoutProvider></QueryClientProvider>);
}

describe('사이드바 메뉴 조회 상태', () => {
  beforeEach(() => { vi.clearAllMocks(); menu.getMyBookmarks.mockResolvedValue([]); });

  it('조회에 실패하면 실패를 말하고 다시 시도하면 메뉴를 다시 읽는다', async () => {
    menu.getHeadMenus.mockRejectedValueOnce(new Error('network')).mockResolvedValue([
      { menuNo: 1, menuNm: '업무', useYn: 'Y', children: [{ menuNo: 2, menuNm: '업무 홈', useYn: 'Y', modernRoute: '/admin/work-hub' }] },
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
      { menuNo: 1, menuNm: '업무', useYn: 'Y', children: [{ menuNo: 2, menuNm: '업무 홈', useYn: 'Y', modernRoute: '/admin/work-hub' }] },
    ]);
    menu.getMyBookmarks.mockResolvedValue([{ menuNo: 2, menuNm: '업무 홈' }, { menuNo: 99, menuNm: '회수된 메뉴' }]);
    renderSidebar();

    const group = await screen.findByRole('group', { name: '즐겨찾기' });
    expect(within(group).getByRole('link', { name: '업무 홈' })).toHaveAttribute('href', '/admin/work-hub');
    expect(within(group).queryByText('회수된 메뉴')).not.toBeInTheDocument();
  });
});
