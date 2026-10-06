vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Sidebar } from '../sidebar';
import { HeaderSearchParamSync } from '../HeaderSearchParamSync';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import type { MenuInfo } from '@/types/foundation/menu';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'layout-user', groups: ['USER'], permissions: [], authorizationVersion: 'v1' } }),
}));

const navigation = vi.hoisted(() => ({ pathname: '/', searchParams: new URLSearchParams() }));

beforeEach(() => {
  navigation.pathname = '/';
  navigation.searchParams = new URLSearchParams();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
 usePathname: () => navigation.pathname,
 useSearchParams: () => navigation.searchParams,
}));

const sidebarMenus = [
  {
    menuNo: 1000000,
    menuNm: '업무 공간',
    children: [{ menuNo: 1000001, menuNm: '업무 홈', modernRoute: '/admin/work-hub' }],
  },
  {
    menuNo: 2000000,
    menuNm: '커뮤니티',
    children: [{ menuNo: 2000001, menuNm: '커뮤니티 홈', modernRoute: '/admin/collaboration' }],
  },
] as MenuInfo[];

function SidebarHarness() {
  const { toggleSidebar } = useLayout();
  return (
    <>
      <a href="#sidebar-harness-main" data-sidebar-modal-background="skip-link">
        본문 바로가기
      </a>
      <header data-sidebar-modal-background="header" aria-hidden="false">
        <button type="button" onClick={toggleSidebar}>메뉴 열기</button>
      </header>
      <main
        id="sidebar-harness-main"
        data-sidebar-modal-background="main"
        inert
        aria-hidden="false"
      >
        본문
      </main>
      <Sidebar initialMenus={sidebarMenus} />
    </>
  );
}

function renderSidebar(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LayoutProvider>{ui}</LayoutProvider>
    </QueryClientProvider>,
  );
}

function SynchronizedSidebar() {
  const { activeMenuNo, setActiveMenuNo } = useLayout();
  return <>
    <HeaderSearchParamSync menus={sidebarMenus} activeMenuNo={activeMenuNo} setActiveMenuNo={setActiveMenuNo} />
    <Sidebar initialMenus={sidebarMenus} />
  </>;
}

describe('Sidebar responsive primary navigation', () => {
  it.each([
    {
      name: '정확한 경로', pathname: '/admin/collaboration', query: '', menus: sidebarMenus,
      selected: '커뮤니티', visible: '커뮤니티 홈', absent: '업무 홈',
    },
    {
      name: '같은 경로의 메뉴 쿼리', pathname: '/admin/collaboration', query: 'tab=second&page=2',
      menus: sidebarMenus.map((menu, index) => ({
        ...menu,
        children: menu.children!.map((child) => ({
          ...child, modernRoute: `/admin/collaboration?tab=${index === 0 ? 'first' : 'second'}`,
        })),
      })),
      selected: '커뮤니티', visible: '커뮤니티 홈', absent: '업무 홈',
    },
    {
      name: '미일치 URL의 첫 영역 fallback', pathname: '/unmapped-route', query: '', menus: sidebarMenus,
      selected: '업무 공간', visible: '업무 홈', absent: '커뮤니티 홈',
    },
  ])('$name에 맞는 영역을 SSR부터 선택하고 hydration 후에도 유지한다', async (scenario) => {
    navigation.pathname = scenario.pathname;
    navigation.searchParams = new URLSearchParams(scenario.query);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(['menus', 'bookmarks', 'layout-user', 'v1'], []);
    const tree = <QueryClientProvider client={queryClient}>
      <LayoutProvider><Sidebar initialMenus={scenario.menus} /></LayoutProvider>
    </QueryClientProvider>;
    const container = document.createElement('div');
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      container.innerHTML = renderToString(tree);
      document.body.append(container);
      const assertSelection = () => {
        const menuTree = within(container).getByRole('navigation', { name: '주 메뉴 탐색' });
        expect(within(menuTree).getByRole('button', { name: scenario.selected })).toHaveAttribute('aria-pressed', 'true');
        expect(within(menuTree).getByRole('link', { name: scenario.visible })).toBeInTheDocument();
        expect(within(menuTree).queryByRole('link', { name: scenario.absent })).not.toBeInTheDocument();
      };
      // HeaderSearchParamSync의 effect가 실행되기 전 서버 HTML 자체가 정확해야 한다.
      assertSelection();
      await act(async () => { root = hydrateRoot(container, tree, { onRecoverableError }); });
      assertSelection();
      expect(onRecoverableError).not.toHaveBeenCalled();
    } finally {
      if (root) await act(async () => { root!.unmount(); });
      container.remove();
      queryClient.clear();
    }
  });

  it('정본 URL로 처음 진입할 때 좌측 기본 영역이 상단의 현재 위치 선택을 덮어쓰지 않는다', async () => {
    navigation.pathname = '/admin/collaboration';
    const user = userEvent.setup();
    renderSidebar(<SynchronizedSidebar />);
    const navigationTree = await screen.findByRole('navigation', { name: '주 메뉴 탐색' });
    const community = within(navigationTree).getByRole('button', { name: '커뮤니티' });
    const workspace = within(navigationTree).getByRole('button', { name: '업무 공간' });

    await waitFor(() => expect(community).toHaveAttribute('aria-pressed', 'true'));
    expect(within(navigationTree).getByRole('link', { name: '커뮤니티 홈', current: 'page' })).toBeInTheDocument();
    expect(within(navigationTree).getAllByRole('link', { current: 'page' })).toHaveLength(1);

    // 같은 페이지에서 다른 영역을 펼치는 동작은 유지한다.
    await user.click(workspace);
    expect(workspace).toHaveAttribute('aria-pressed', 'true');
    expect(within(navigationTree).getByRole('link', { name: '업무 홈' })).toBeInTheDocument();
  });

  it('서비스 영역과 하위 메뉴를 하나의 semantic nav tree에 한 번씩 렌더한다', async () => {
    const user = userEvent.setup();
    renderSidebar(<Sidebar initialMenus={sidebarMenus} />);

    const navigation = await screen.findByRole('navigation', { name: '주 메뉴 탐색' });
    const workspace = within(navigation).getByRole('button', { name: '업무 공간' });
    const community = within(navigation).getByRole('button', { name: '커뮤니티' });
    expect(within(navigation).getAllByRole('button', { name: '업무 공간' })).toHaveLength(1);
    expect(within(navigation).getAllByRole('button', { name: '커뮤니티' })).toHaveLength(1);
    expect(within(navigation).getByRole('link', { name: /업무 홈/ })).toBeInTheDocument();

    await waitFor(() => expect(workspace).toHaveAttribute('aria-pressed', 'true'));
    await user.click(community);
    expect(community).toHaveAttribute('aria-pressed', 'true');
    expect(workspace).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(within(navigation).getByRole('link', { name: /커뮤니티 홈/ })).toBeInTheDocument());
  });

  it('닫힘 상태는 CSS visibility로만 전환하고 공유 tree에 inert·aria-hidden을 두지 않는다', () => {
    const { container } = renderSidebar(<SidebarHarness />);
    const aside = container.querySelector('aside');

    expect(aside).toHaveClass('invisible', '-translate-x-full', 'lg:visible', 'lg:translate-x-0');
    expect(aside).not.toHaveAttribute('inert');
    expect(aside).not.toHaveAttribute('aria-hidden');
    expect(screen.getAllByRole('navigation', { name: '주 메뉴 탐색' })).toHaveLength(1);
  });

  it('열림 상태에서 닫기 버튼으로 포커스를 옮기고 ESC 후 trigger로 복귀한다', async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar(<SidebarHarness />);
    const opener = screen.getByRole('button', { name: '메뉴 열기' });
    const header = container.querySelector<HTMLElement>('[data-sidebar-modal-background="header"]')!;
    const main = container.querySelector<HTMLElement>('[data-sidebar-modal-background="main"]')!;

    await user.click(opener);
    expect(screen.getByRole('button', { name: '사이드바 닫기' })).toHaveFocus();
    expect(container.querySelector('aside')).toHaveClass('visible', 'translate-x-0');
    expect(header).not.toHaveAttribute('inert');
    expect(header).toHaveAttribute('aria-hidden', 'false');
    expect(main).toHaveAttribute('inert');
    expect(main).toHaveAttribute('aria-hidden', 'false');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
    expect(container.querySelector('aside')).toHaveClass('invisible', '-translate-x-full');
  });

  it('렌더 중 viewport JS를 조회하지 않는다', () => {
    vi.mocked(window.matchMedia).mockClear();
    renderSidebar(<Sidebar initialMenus={sidebarMenus} />);
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
