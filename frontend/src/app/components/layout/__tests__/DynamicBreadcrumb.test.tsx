import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-01] 현재 위치 경로는 메뉴 트리가 원천이다. 화면이 넘긴 고정 경로는 메뉴에 없는 화면의 대체값과
 * 하위 화면(상세)의 마지막 한 단계로만 쓴다 — 종전에는 고정 경로가 메뉴 트리를 통째로 덮어 옛 이름이 보였다.
 */
const nav = vi.hoisted(() => ({ pathname: '/admin/system/menus', getHeadMenus: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/services/business/user/MenuService', () => ({ menuService: { getHeadMenus: nav.getHeadMenus } }));

import { DynamicBreadcrumb } from '../DynamicBreadcrumb';

const menus = [{
  menuNo: 1, menuNm: '관리 센터', useYn: 'Y', modernRoute: '/admin',
  children: [{ menuNo: 2, menuNm: '메뉴 관리', useYn: 'Y', modernRoute: '/admin/system/menus', children: [] }],
}];

const crumbs = () => within(screen.getByRole('navigation', { name: '현재 위치' })).getAllByRole('listitem').map((li) => (li.textContent ?? '').replace(/^(Home |ChevronRight)/, '').trim());

describe('DynamicBreadcrumb', () => {
  beforeEach(() => {
    nav.pathname = '/admin/system/menus';
    nav.getHeadMenus.mockResolvedValue(menus);
  });

  it('메뉴에 있는 화면은 화면이 넘긴 옛 이름 대신 메뉴 트리 이름을 보인다', async () => {
    render(<DynamicBreadcrumb customItems={[{ name: '시스템관리' }, { name: '메뉴관리' }]} currentLabel="메뉴 관리" />);
    await waitFor(() => expect(crumbs()).toEqual(['홈', '관리 센터', '메뉴 관리']));
    expect(screen.queryByText('시스템관리')).not.toBeInTheDocument();
  });

  it('메뉴의 하위 화면(상세)은 메뉴 경로 뒤에 마지막 한 단계만 덧붙인다', async () => {
    nav.pathname = '/admin/system/menus/12';
    render(<DynamicBreadcrumb customItems={[{ name: '운영지원' }, { name: '메뉴 상세' }]} />);
    await waitFor(() => expect(crumbs()).toEqual(['홈', '관리 센터', '메뉴 관리', '메뉴 상세']));
    expect(screen.getByText('메뉴 상세')).toHaveAttribute('aria-current', 'page');
  });

  it('메뉴 트리에 없는 화면이면 화면이 넘긴 경로를 대체값으로 쓴다', async () => {
    nav.pathname = '/approvals';
    render(<DynamicBreadcrumb customItems={[{ name: '업무' }, { name: '결재함' }]} />);
    await waitFor(() => expect(nav.getHeadMenus).toHaveBeenCalled());
    expect(crumbs()).toEqual(['홈', '업무', '결재함']);
  });
});
