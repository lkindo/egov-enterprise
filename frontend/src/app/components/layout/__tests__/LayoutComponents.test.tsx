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

function mockDesktopViewport(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as MediaQueryList));
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
  it('lg~xl 사이에서 모든 서비스 영역을 전환할 수 있는 명시적 내비게이션을 제공한다', async () => {
    mockDesktopViewport(true);
    const user = userEvent.setup();
    renderSidebar(<Sidebar initialMenus={sidebarMenus} />);

    const switcher = await screen.findByRole('navigation', { name: '서비스 영역 선택' });
    expect(switcher).toHaveClass('lg:block', 'xl:hidden');
    const workspace = within(switcher).getByRole('button', { name: '업무 공간' });
    const community = within(switcher).getByRole('button', { name: '커뮤니티' });

    await waitFor(() => expect(workspace).toHaveAttribute('aria-pressed', 'true'));
    await user.click(community);
    expect(community).toHaveAttribute('aria-pressed', 'true');
    expect(workspace).toHaveAttribute('aria-pressed', 'false');
  });

  it('모바일 사이드바는 닫힘 상태를 숨기고 ESC 후 트리거로 포커스를 돌려준다', async () => {
    mockDesktopViewport(false);
    const user = userEvent.setup();
    const { container } = renderSidebar(<SidebarHarness />);
    const opener = screen.getByRole('button', { name: '메뉴 열기' });
    const aside = container.querySelector('aside');

    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside).toHaveAttribute('inert');

    const skipLink = container.querySelector<HTMLElement>('[data-sidebar-modal-background="skip-link"]')!;
    const header = container.querySelector<HTMLElement>('[data-sidebar-modal-background="header"]')!;
    const main = container.querySelector<HTMLElement>('[data-sidebar-modal-background="main"]')!;
    expect(skipLink).not.toHaveAttribute('inert');
    expect(skipLink).not.toHaveAttribute('aria-hidden');
    expect(header).not.toHaveAttribute('inert');
    expect(header).toHaveAttribute('aria-hidden', 'false');
    expect(main).toHaveAttribute('inert');
    expect(main).toHaveAttribute('aria-hidden', 'false');

    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: '주 메뉴' });
    expect(dialog).toHaveAttribute('id', 'primary-sidebar');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: '사이드바 닫기' })).toHaveFocus());
    await waitFor(() => {
      for (const background of [skipLink, header, main]) {
        expect(background).toHaveAttribute('inert');
        expect(background).toHaveAttribute('aria-hidden', 'true');
        expect(background).not.toContainElement(dialog);
      }
    });
    expect(document.body.style.overflow).toBe('hidden');

    const focusable = [...dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '주 메뉴' })).not.toBeInTheDocument());
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
    expect(skipLink).not.toHaveAttribute('inert');
    expect(skipLink).not.toHaveAttribute('aria-hidden');
    expect(header).not.toHaveAttribute('inert');
    expect(header).toHaveAttribute('aria-hidden', 'false');
    expect(main).toHaveAttribute('inert');
    expect(main).toHaveAttribute('aria-hidden', 'false');
  });

  it('모바일 포커스 트랩은 숨겨진 데스크톱 하위 트리를 건너뛴다', async () => {
    mockDesktopViewport(false);
    const user = userEvent.setup();
    renderSidebar(<SidebarHarness />);

    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    const dialog = await screen.findByRole('dialog', { name: '주 메뉴' });
    const mobileView = dialog.querySelector<HTMLElement>('.lg\\:hidden.space-y-2');
    const desktopView = dialog.querySelector<HTMLElement>('.hidden.lg\\:block');

    expect(mobileView).not.toBeNull();
    expect(desktopView).not.toBeNull();
    if (!mobileView || !desktopView) return;

    // jsdom에는 Tailwind stylesheet가 없으므로 실제 `hidden lg:block`의 모바일 상태를
    // ancestor display:none으로 재현한다. 하위 button 자체의 computed display는 visible인
    // 채라서 element-only 필터는 이 decoy를 잘못 focus 순서에 포함한다.
    desktopView.style.display = 'none';
    const hiddenDesktopDecoy = within(desktopView).getByRole('button', {
      name: /커뮤니티/,
      hidden: true,
    });
    const actualLastMobileControl = within(mobileView).getByRole('button', {
      name: /커뮤니티/,
    });
    const firstMobileControl = within(dialog).getByRole('link', {
      name: '메인 화면으로 이동',
    });

    actualLastMobileControl.focus();
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tab);

    expect(tab.defaultPrevented).toBe(true);
    expect(firstMobileControl).toHaveFocus();
    expect(hiddenDesktopDecoy).not.toHaveFocus();
  });

  it('데스크톱에서는 사이드바 열림 상태도 배경을 격리하지 않는다', async () => {
    mockDesktopViewport(true);
    const user = userEvent.setup();
    const { container } = renderSidebar(<SidebarHarness />);
    const opener = screen.getByRole('button', { name: '메뉴 열기' });
    const skipLink = container.querySelector<HTMLElement>('[data-sidebar-modal-background="skip-link"]')!;
    const header = container.querySelector<HTMLElement>('[data-sidebar-modal-background="header"]')!;
    const main = container.querySelector<HTMLElement>('[data-sidebar-modal-background="main"]')!;

    await user.click(opener);

    expect(screen.queryByRole('dialog', { name: '주 메뉴' })).not.toBeInTheDocument();
    expect(skipLink).not.toHaveAttribute('inert');
    expect(skipLink).not.toHaveAttribute('aria-hidden');
    expect(header).not.toHaveAttribute('inert');
    expect(header).toHaveAttribute('aria-hidden', 'false');
    expect(main).toHaveAttribute('inert');
    expect(main).toHaveAttribute('aria-hidden', 'false');
  });
});
