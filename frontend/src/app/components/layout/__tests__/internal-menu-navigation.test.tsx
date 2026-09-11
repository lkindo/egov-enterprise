import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { NavItem, NavQueryScope } from '../NavItem';
import { DynamicBreadcrumb } from '../DynamicBreadcrumb';
import { HeaderSearchParamSync } from '../HeaderSearchParamSync';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
  setSidebarOpen: vi.fn(),
  getHeadMenus: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ setSidebarOpen: mocks.setSidebarOpen }),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getHeadMenus: (...args: unknown[]) => mocks.getHeadMenus(...args),
  },
}));

function menu(overrides: Partial<MenuInfo>): MenuInfo {
  return {
    menuNo: 1,
    menuNm: '메뉴',
    upperMenuId: 0,
    upMenuSn: 0,
    menuOrdr: 1,
    ...overrides,
  };
}

describe('menu metadata navigation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    mocks.searchParams = new URLSearchParams();
    mocks.getHeadMenus.mockResolvedValue([]);
  });

  it('유효하지 않은 leaf 메뉴는 링크가 아니라 disabled control로 렌더한다', async () => {
    render(<NavItem item={menu({ menuNm: '위험 메뉴', modernRoute: '//evil.example/phish' })} />);

    const disabled = await screen.findByRole('button', { name: '위험 메뉴 이동 불가' });
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: /위험 메뉴/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="//evil.example/phish"]')).not.toBeInTheDocument();
  });

  it('유효하지 않은 parent 메뉴는 이동하지 않고 하위 메뉴만 토글한다', async () => {
    const user = userEvent.setup();
    render(
      <NavItem
        item={menu({
          menuNm: '위험 상위',
          modernRoute: 'javascript:alert(1)',
          children: [menu({ menuNo: 2, menuNm: '안전 하위', modernRoute: '/admin/work-hub' })],
        })}
      />,
    );

    const toggle = await screen.findByRole('button', { name: '위험 상위 하위 메뉴 토글' });
    expect(toggle).not.toBeDisabled();
    expect(screen.queryByRole('link', { name: /위험 상위/ })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(await screen.findByRole('link', { name: /안전 하위/ })).toHaveAttribute(
      'href',
      '/admin/work-hub',
    );
  });

  it('링크와 별도인 서브메뉴 토글은 최소 28px target을 보장한다', async () => {
    mocks.pathname = '/admin/help/faq';
    render(
      <NavItem
        item={menu({
          menuNm: '사용자 지원',
          modernRoute: '/admin/help',
          children: [menu({ menuNo: 2, menuNm: 'FAQ', modernRoute: '/admin/help/faq' })],
        })}
      />,
    );

    const toggle = await screen.findByRole('button', { name: '사용자 지원 서브메뉴 접기' });
    expect(toggle).toHaveClass('min-h-7', 'min-w-7');
    expect(toggle.closest('a')).toBeNull();
    expect(screen.getByRole('link', { name: /사용자 지원/ })).not.toContainElement(toggle);
  });

  it('relative legacy .do와 안전한 query/hash는 내부 링크로 보존한다', async () => {
    render(
      <NavItem
        item={menu({
          menuNm: '레거시 메뉴',
          modernRoute: '',
          chkURL: 'legacy/selectMenu.do?menuNo=1#result',
        })}
      />,
    );

    expect(await screen.findByRole('link', { name: /레거시 메뉴/ })).toHaveAttribute(
      'href',
      '/legacy/selectMenu.do?menuNo=1#result',
    );
  });

  it('breadcrumb는 메뉴 트리의 raw 외부 href를 Link에 전달하지 않는다', async () => {
    mocks.pathname = '/admin/work-hub';
    mocks.getHeadMenus.mockResolvedValue([
      menu({
        menuNm: '위험 상위',
        modernRoute: '//evil.example/phish',
        children: [menu({ menuNo: 2, menuNm: '현재 화면', modernRoute: '/admin/work-hub' })],
      }),
    ]);

    render(<DynamicBreadcrumb />);

    await waitFor(() => expect(screen.getByText('위험 상위')).toBeInTheDocument());
    expect(screen.getByText('위험 상위').closest('a')).toBeNull();
    expect(document.querySelector('a[href="//evil.example/phish"]')).not.toBeInTheDocument();
  });

  it('breadcrumb는 검증된 내부 parent href만 링크로 제공한다', async () => {
    mocks.pathname = '/admin/work-hub';
    mocks.getHeadMenus.mockResolvedValue([
      menu({
        menuNm: '안전 상위',
        modernRoute: '/admin/workspace?view=all#top',
        children: [menu({ menuNo: 2, menuNm: '현재 화면', modernRoute: '/admin/work-hub' })],
      }),
    ]);

    render(<DynamicBreadcrumb />);

    expect(await screen.findByRole('link', { name: '안전 상위' })).toHaveAttribute(
      'href',
      '/admin/workspace?view=all#top',
    );
  });

  it('같은 목적지의 메뉴는 하나만 현재 페이지로 표시한다', () => {
    mocks.pathname = '/admin/security/authority';
    const menus = [
      menu({ menuNo: 1, menuNm: '정본 권한', modernRoute: mocks.pathname }),
      menu({ menuNo: 2, menuNm: '중복 권한', modernRoute: mocks.pathname }),
    ];
    render(<NavQueryScope menus={menus}>{menus.map((item) => <NavItem key={item.menuNo} item={item} />)}</NavQueryScope>);
    expect(screen.getAllByRole('link', { current: 'page' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: '정본 권한' })).toHaveAttribute('aria-current', 'page');
  });

  it('자식의 정확한 페이지가 부모의 일반 경로보다 우선한다', () => {
    mocks.pathname = '/admin/help/faq';
    mocks.searchParams = new URLSearchParams('tab=FAQ&page=2');
    const item = menu({ menuNm: '사용자 지원', modernRoute: '/admin/help', children: [
      menu({ menuNo: 2, menuNm: 'FAQ', modernRoute: '/admin/help/faq?tab=FAQ' }),
    ] });
    render(<NavQueryScope menus={[item]}><NavItem item={item} /></NavQueryScope>);
    expect(screen.getAllByRole('link', { current: 'page' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '사용자 지원 서브메뉴 접기' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('상단 영역도 쿼리 탭 변경을 따라 정확히 선택한다', () => {
    mocks.pathname = '/admin/help/faq';
    mocks.searchParams = new URLSearchParams('tab=FAQ');
    const setActiveMenuNo = vi.fn();
    const menus = [
      menu({ menuNo: 1, children: [menu({ menuNo: 11, modernRoute: '/admin/help/faq?tab=WIKI' })] }),
      menu({ menuNo: 2, children: [menu({ menuNo: 21, modernRoute: '/admin/help/faq?tab=FAQ' })] }),
    ];
    const view = render(<HeaderSearchParamSync menus={menus} activeMenuNo={1} setActiveMenuNo={setActiveMenuNo} />);
    expect(setActiveMenuNo).toHaveBeenLastCalledWith(2);
    mocks.searchParams = new URLSearchParams('tab=WIKI');
    view.rerender(<HeaderSearchParamSync menus={menus} activeMenuNo={2} setActiveMenuNo={setActiveMenuNo} />);
    expect(setActiveMenuNo).toHaveBeenLastCalledWith(1);
  });

  it('상단 영역은 4단계 아래 메뉴와 게시판 식별자를 정확히 찾는다', () => {
    mocks.pathname = '/admin/community/boards/detail';
    mocks.searchParams = new URLSearchParams('bbsId=BOARD_A&pstSn=3');
    const setActiveMenuNo = vi.fn();
    const menus = [
      menu({ menuNo: 1, children: [menu({ menuNo: 11, modernRoute: '/admin/community/boards/select-board-list?bbsId=BOARD_AB' })] }),
      menu({ menuNo: 2, children: [menu({ menuNo: 21, children: [menu({ menuNo: 211, children: [
        menu({ menuNo: 2111, modernRoute: '/admin/community/boards/select-board-list?bbsId=BOARD_A' }),
      ] })] })] }),
    ];
    render(<HeaderSearchParamSync menus={menus} activeMenuNo={0} setActiveMenuNo={setActiveMenuNo} />);
    expect(setActiveMenuNo).toHaveBeenCalledWith(2);
  });

  it('같은 URL에서는 다른 영역 탐색을 허용하고 사라진 영역 선택만 복구한다', () => {
    mocks.pathname = '/one';
    const menus = [menu({ menuNo: 1, modernRoute: '/one' }), menu({ menuNo: 2, modernRoute: '/two' })];
    const setActiveMenuNo = vi.fn();
    const view = render(<HeaderSearchParamSync menus={menus} activeMenuNo={1} setActiveMenuNo={setActiveMenuNo} />);
    view.rerender(<HeaderSearchParamSync menus={menus} activeMenuNo={2} setActiveMenuNo={setActiveMenuNo} />);
    expect(setActiveMenuNo).not.toHaveBeenCalled();
    view.rerender(<HeaderSearchParamSync menus={[menus[0]]} activeMenuNo={2} setActiveMenuNo={setActiveMenuNo} />);
    expect(setActiveMenuNo).toHaveBeenCalledWith(1);
  });

  it('breadcrumb도 부모 prefix에서 멈추지 않고 현재 탭과 전체 조상을 표시한다', async () => {
    mocks.pathname = '/admin/help/faq';
    mocks.searchParams = new URLSearchParams('tab=FAQ');
    mocks.getHeadMenus.mockResolvedValue([menu({ menuNm: '지식', modernRoute: '/admin/help', children: [
      menu({ menuNo: 2, menuNm: '위키', modernRoute: '/admin/help/faq?tab=WIKI' }),
      menu({ menuNo: 3, menuNm: '자주 묻는 질문', modernRoute: '/admin/help/faq?tab=FAQ' }),
    ] })]);
    render(<DynamicBreadcrumb />);
    expect(await screen.findByText('자주 묻는 질문')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '지식' })).toHaveAttribute('href', '/admin/help');
    expect(screen.queryByText('위키')).not.toBeInTheDocument();
  });
});
