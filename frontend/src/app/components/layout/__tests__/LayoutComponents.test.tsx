vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollToTop } from '../scroll-to-top';
import { Sidebar } from '../sidebar';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import type { MenuInfo } from '@/types/foundation/menu';

// Mock next/navigation
vi.mock('next/navigation', () => ({
 usePathname: () => '/',
 useSearchParams: () => new URLSearchParams(),
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

/**
 * ScrollToTop 계약 테스트.
 *
 * 종전 이 테스트는 "ScrollToTop 이 제거되어 비활성화"라는 사유로 it.skip 되어 있었으나,
 * 컴포넌트 파일(../scroll-to-top.tsx)은 그대로 살아 있다. 제거된 것은 컴포넌트가 아니라
 * **내부의 스크롤 강제 이동 effect** 다(파일 내 주석 처리됨). 즉 스킵 사유가 사실과 달랐고,
 * 그 결과 이 파일은 아무것도 실행하지 않는 고아 스킵으로 남아 있었다.
 *
 * 종전 단언(`window.scrollTo` 가 (0,0) 으로 호출된다)은 지금은 **틀린 기대**다. 현재 의도는
 * Next.js/브라우저의 기본 스크롤 복원에 맡기는 것이므로, 그 의도 자체를 회귀 방어한다.
 * 누군가 effect 를 되살리면 이 테스트가 깨지고, 그때 "정말 되살릴 것인가"를 의식적으로
 * 판단하게 된다.
 *
 * ⚠ 별건 보고: ScrollToTop 은 현재 앱 어디에서도 렌더되지 않는다(이 테스트가 유일한 참조).
 *   컴포넌트 자체의 존치/삭제는 제품 결정이라 여기서 건드리지 않는다.
 */
describe('Layout Components', () => {
 beforeEach(() => {
 vi.useFakeTimers();
 });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ScrollToTop 은 DOM 을 렌더하지 않는다', () => {
    const { container } = render(<ScrollToTop />);

    expect(container).toBeEmptyDOMElement();
  });

  it('[의도된 계약] ScrollToTop 은 스크롤을 가로채지 않는다 — 브라우저 기본 복원에 위임', () => {
    window.scrollTo = vi.fn();

    render(<ScrollToTop />);

    // 종전 구현은 10ms 지연 후 scrollTo(0, 0) 을 호출했다. 타이머를 모두 흘려도
    // 호출이 없어야 "스크롤 하이재킹이 실제로 꺼져 있다"가 증명된다.
    act(() => {
      vi.runAllTimers();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe('Sidebar responsive primary navigation', () => {
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
