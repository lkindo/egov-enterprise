import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { NavItem, NavQueryScope } from '../NavItem';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  searchParams: new URLSearchParams(),
  setSidebarOpen: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ setSidebarOpen: mocks.setSidebarOpen }),
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

/**
 * 메뉴 링크를 이름으로 찾는다. 접근성 이름에는 아이콘 목의 텍스트가 함께 들어오므로 부분 일치로 찾는다.
 * 활성 여부는 aria-current="page"(IA §7.3 canonical node 선언)로 판정한다.
 */
function activeLink(name: string) {
  return screen.getByRole('link', { name: new RegExp(name) });
}

describe('메뉴 활성 표시가 화면 내 상호작용에 살아남는다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    mocks.searchParams = new URLSearchParams();
  });

  it('쿼리 없이 진입하면 해당 메뉴가 활성으로 보인다', () => {
    mocks.pathname = '/admin/system/logs/login';
    mocks.searchParams = new URLSearchParams();

    render(<NavItem item={menu({ menuNm: '로그인 로그', modernRoute: '/admin/system/logs/login' })} />);

    expect(activeLink('로그인 로그')).toHaveAttribute('aria-current', 'page');
  });

  it('화면 안에서 페이지를 넘겨 쿼리가 붙어도 메뉴 활성 표시가 유지된다', () => {
    // 사용자가 로그인 로그 메뉴로 들어간 뒤 표의 2페이지 버튼을 누른 상황이다.
    // URL 에 화면 상태 쿼리가 붙었을 뿐 여전히 같은 메뉴 안에 있다.
    mocks.pathname = '/admin/system/logs/login';
    mocks.searchParams = new URLSearchParams('page=2');

    render(<NavItem item={menu({ menuNm: '로그인 로그', modernRoute: '/admin/system/logs/login' })} />);

    expect(activeLink('로그인 로그')).toHaveAttribute('aria-current', 'page');
  });

  it('검색어·필터 쿼리에서도 활성 표시가 유지된다', () => {
    mocks.pathname = '/admin/system/logs/login';
    mocks.searchParams = new URLSearchParams('keyword=admin&from=2026-08-01');

    render(<NavItem item={menu({ menuNm: '로그인 로그', modernRoute: '/admin/system/logs/login' })} />);

    expect(activeLink('로그인 로그')).toHaveAttribute('aria-current', 'page');
  });

  it('쿼리로 갈리는 메뉴는 자기 탭일 때만 활성이다', () => {
    mocks.pathname = '/admin/survey/hub';
    mocks.searchParams = new URLSearchParams('tab=questions');

    render(
      <>
        <NavItem item={menu({ menuNo: 1, menuNm: '질문관리', modernRoute: '/admin/survey/hub?tab=questions' })} />
        <NavItem item={menu({ menuNo: 2, menuNm: '응답자관리', modernRoute: '/admin/survey/hub?tab=respondents' })} />
      </>,
    );

    expect(activeLink('질문관리')).toHaveAttribute('aria-current', 'page');
    expect(activeLink('응답자관리')).not.toHaveAttribute('aria-current');
  });

  it('탭 메뉴는 무관한 쿼리가 더 붙어도 자기 탭이면 활성이다', () => {
    mocks.pathname = '/admin/survey/hub';
    mocks.searchParams = new URLSearchParams('tab=questions&page=3');

    render(<NavItem item={menu({ menuNm: '질문관리', modernRoute: '/admin/survey/hub?tab=questions' })} />);

    expect(activeLink('질문관리')).toHaveAttribute('aria-current', 'page');
  });

  it('다른 경로에서는 활성이 아니다', () => {
    mocks.pathname = '/admin/system/logs/web';
    mocks.searchParams = new URLSearchParams('page=2');

    render(<NavItem item={menu({ menuNm: '로그인 로그', modernRoute: '/admin/system/logs/login' })} />);

    expect(activeLink('로그인 로그')).not.toHaveAttribute('aria-current');
  });

  it('같은 경로를 쿼리로 나눠 쓰는 형제가 있으면 쿼리 없는 메뉴가 양보한다', () => {
    // 원래 규칙의 의도. NavQueryScope 가 형제 명세를 알려줄 때만 양보한다.
    const siblings = [
      menu({ menuNo: 1, menuNm: '업무 보고함', modernRoute: '/admin/work-hub' }),
      menu({ menuNo: 2, menuNm: '부서 일정', modernRoute: '/admin/work-hub?tab=job' }),
    ];
    mocks.pathname = '/admin/work-hub';
    mocks.searchParams = new URLSearchParams('tab=job');

    render(
      <NavQueryScope menus={siblings}>
        {siblings.map((item) => (
          <NavItem key={item.menuNo} item={item} />
        ))}
      </NavQueryScope>,
    );

    expect(activeLink('부서 일정')).toHaveAttribute('aria-current', 'page');
    expect(activeLink('업무 보고함')).not.toHaveAttribute('aria-current');
  });

  it('형제가 있어도 그 형제와 무관한 쿼리에서는 쿼리 없는 메뉴가 활성이다', () => {
    const siblings = [
      menu({ menuNo: 1, menuNm: '업무 보고함', modernRoute: '/admin/work-hub' }),
      menu({ menuNo: 2, menuNm: '부서 일정', modernRoute: '/admin/work-hub?tab=job' }),
    ];
    mocks.pathname = '/admin/work-hub';
    mocks.searchParams = new URLSearchParams('page=2');

    render(
      <NavQueryScope menus={siblings}>
        {siblings.map((item) => (
          <NavItem key={item.menuNo} item={item} />
        ))}
      </NavQueryScope>,
    );

    expect(activeLink('업무 보고함')).toHaveAttribute('aria-current', 'page');
    expect(activeLink('부서 일정')).not.toHaveAttribute('aria-current');
  });

  it('접두사만 같은 다른 경로를 잡지 않는다', () => {
    mocks.pathname = '/admin/work-hub-archive';
    mocks.searchParams = new URLSearchParams();

    render(<NavItem item={menu({ menuNm: '업무 허브', modernRoute: '/admin/work-hub' })} />);

    expect(activeLink('업무 허브')).not.toHaveAttribute('aria-current');
  });
});
