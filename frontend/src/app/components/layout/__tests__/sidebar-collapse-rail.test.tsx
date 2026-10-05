/**
 * 사이드바 맨 위 '사이드바 접기'와 접힘 막대의 '사이드바 펼치기'(2026-10-05 DEC-OPS-227).
 *
 * 사용자 보고: 머리글 맨 왼쪽 아이콘 하나뿐이라 접기 기능이 "적용 안 된 것 같다". 그래서 사이드바 맨 위에 글자가 보이는
 * '사이드바 접기'를, 접힌 자리에 '사이드바 펼치기'가 있는 막대를 둔다. jsdom 은 CSS 를 적용하지 않으므로 보이고 숨는 사실은
 * 클래스·표지로, 실제 화면 표현은 e2e(responsive-shell)가 본다.
 *
 * 고정하는 것:
 *  - 사이드바 '사이드바 접기'는 보이는 글자가 곧 접근 이름이고(2.5.3), 넓은 화면에서만 보이며(서랍에는 닫기 단추가 있다),
 *    aria-controls 로 사이드바를 가리킨다. 사이드바가 보일 때만 보이므로 aria-expanded 는 true 다.
 *  - 그 단추는 메뉴 탐색 랜드마크 밖, 서비스 영역·즐겨찾기보다 앞에 있다 — 즐겨찾기가 많아도 첫 화면 아래로 밀리지 않는다.
 *  - 누르면 접히고(<html> 표지·기억), 자기 자신이 사라지므로 포커스가 막대의 '펼치기'로 간다(2.4.3).
 *  - 막대의 '펼치기'는 고정 이름·aria-expanded=false·aria-controls 이고, 누르면 펼치고 포커스가 사이드바 '접기'로 돌아간다.
 *  - 상대 단추가 아직 없거나 그려지지 않으면 포커스를 본문으로 보낸다 — 문서 처음으로 떨어지지 않는다.
 *  - 머리글 단추·사이드바·막대는 같은 상태를 본다 — 막대로 펴면 머리글 단추도 펼침을 말한다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutProvider } from '@/contexts/LayoutContext';
import {
  SIDEBAR_COLLAPSED_ATTRIBUTE,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_EXPAND_LABEL,
  SIDEBAR_EXPAND_VISIBLE_TEXT,
  SIDEBAR_TOGGLE_LABEL,
} from '@/lib/layout/sidebar-collapse-script';
import { setSidebarCollapsed, useSidebarCollapsed } from '@/lib/layout/use-sidebar-collapsed';
import { Sidebar } from '../sidebar';
import { SidebarRail } from '../sidebar-rail';

const menu = vi.hoisted(() => ({ getHeadMenus: vi.fn(), getLeftMenus: vi.fn(), getMyBookmarks: vi.fn() }));
vi.mock('@/services/business/user/MenuService', () => ({ menuService: menu }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u', groups: ['USER'], permissions: [], authorizationVersion: 'v1' } }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

/** 머리글 단추와 같은 상태를 읽는 최소 대역 — 머리글 전체를 그리지 않고 상태 공유만 본다. */
function HeaderToggleProbe() {
  const { collapsed, toggle } = useSidebarCollapsed();
  return <button type="button" aria-label={SIDEBAR_TOGGLE_LABEL} aria-expanded={!collapsed} onClick={toggle} />;
}

function renderShell({ withSidebar = true }: { withSidebar?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LayoutProvider>
        <HeaderToggleProbe />
        {withSidebar && <Sidebar />}
        <SidebarRail />
        <main id="main-content" tabIndex={-1}>본문</main>
      </LayoutProvider>
    </QueryClientProvider>,
  );
}

const html = () => document.documentElement;
const collapseButton = () => within(screen.getByRole('complementary', { name: '주 메뉴' }))
  .getByRole('button', { name: '사이드바 접기' });
const railExpandButton = () => within(screen.getByRole('complementary', { name: '접힌 사이드바' }))
  .getByRole('button', { name: '사이드바 펼치기' });

describe('사이드바 안 접기와 접힘 막대', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    menu.getHeadMenus.mockResolvedValue([]);
    menu.getMyBookmarks.mockResolvedValue([]);
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });
  afterEach(() => {
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('사이드바 접기는 보이는 글자가 곧 이름이고 넓은 화면에서만 보이며 사이드바를 가리킨다', () => {
    renderShell();
    const collapse = collapseButton();

    // 보이는 글자와 접근 이름이 같다(2.5.3) — 이름을 aria-label 로 따로 달지 않는다.
    expect(collapse).toHaveTextContent('사이드바 접기');
    expect(collapse).toHaveAccessibleName('사이드바 접기');
    expect(collapse).not.toHaveAttribute('aria-label');
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(collapse).toHaveAttribute('aria-controls', 'primary-sidebar');
    // 서랍(lg 미만)에는 위쪽 '사이드바 닫기'가 있다 — 이 줄은 넓은 화면에서만 보인다(CSS 만, 단일 DOM).
    expect(collapse.parentElement).toHaveClass('hidden', 'lg:flex');
    expect(within(screen.getByRole('complementary', { name: '주 메뉴' }))
      .getByRole('button', { name: '사이드바 닫기' })).toBeInTheDocument();
  });

  it('사이드바 접기는 메뉴 탐색 밖, 서비스 영역·즐겨찾기·전체 메뉴보다 앞에 있다', async () => {
    // 즐겨찾기(최대 30개)가 많으면 그 뒤의 단추는 첫 화면 아래로 밀린다 — 사용자가 겪은 '단추가 안 보인다'가 다시 난다.
    menu.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '업무', useYn: 'Y', children: [{ menuNo: 2, menuNm: '업무 홈', useYn: 'Y', modernRoute: '/admin/work-hub' }] },
    ]);
    menu.getMyBookmarks.mockResolvedValue([{ menuNo: 2, menuNm: '업무 홈' }]);
    renderShell();
    const favorites = await screen.findByRole('group', { name: '즐겨찾기' });
    const collapse = collapseButton();
    const nav = screen.getByRole('navigation', { name: '주 메뉴 탐색' });

    expect(nav).not.toContainElement(collapse);
    const precedes = (node: Node) => (collapse.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(precedes(nav)).toBe(true);
    expect(precedes(screen.getByRole('group', { name: '서비스 영역' }))).toBe(true);
    expect(precedes(favorites)).toBe(true);
    expect(precedes(screen.getByText('전체 메뉴'))).toBe(true);
  });

  it('막대는 기본 숨김이고 펼치기 단추는 고정 이름·접힘 상태·대상을 말한다', () => {
    renderShell();
    const rail = screen.getByRole('complementary', { name: '접힌 사이드바' });
    const expand = railExpandButton();

    // 보이고 숨는 일은 globals.css 의 접힘 블록만 한다(인쇄 숨김 포함) — 기본은 hidden 이다.
    expect(rail).toHaveAttribute('data-app-sidebar-rail', '');
    expect(rail).toHaveClass('hidden');
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand).toHaveAttribute('aria-controls', 'primary-sidebar');
    // 아이콘만 두지 않는다 — '펼치기'가 글자로 보이고 그 글자가 이름 안에 든다(2.5.3). 글자가 보이므로 툴팁은 없다.
    expect(within(expand).getByText(SIDEBAR_EXPAND_VISIBLE_TEXT, { exact: true })).toBeInTheDocument();
    expect(SIDEBAR_EXPAND_LABEL).toContain(SIDEBAR_EXPAND_VISIBLE_TEXT);
    expect(expand).not.toHaveAttribute('title');
  });

  it('사이드바 접기를 누르면 접히고 기억되며 포커스가 막대의 펼치기로 간다', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(collapseButton());

    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('1');
    expect(railExpandButton()).toHaveFocus();
    expect(screen.getByRole('button', { name: SIDEBAR_TOGGLE_LABEL })).toHaveAttribute('aria-expanded', 'false');
  });

  it('막대의 펼치기를 누르면(키보드 포함) 펼치고 포커스가 사이드바 접기로 돌아간다', async () => {
    setSidebarCollapsed(true);
    const user = userEvent.setup();
    renderShell();

    railExpandButton().focus();
    await user.keyboard('{Enter}');

    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
    expect(collapseButton()).toHaveFocus();
    expect(screen.getByRole('button', { name: SIDEBAR_TOGGLE_LABEL })).toHaveAttribute('aria-expanded', 'true');
  });

  it('사이드바가 아직 없으면 펼친 뒤 포커스를 본문으로 보낸다(문서 처음으로 떨어지지 않는다)', async () => {
    setSidebarCollapsed(true);
    const user = userEvent.setup();
    renderShell({ withSidebar: false });

    await user.click(railExpandButton());

    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('상대 단추가 그려지지 않으면(checkVisibility=false) 접은 뒤 포커스를 본문으로 보낸다', async () => {
    // 표시 규칙이 어긋나 막대가 display:none 인 채면 focus() 는 조용히 실패하고 포커스가 문서 처음으로 떨어진다.
    const user = userEvent.setup();
    renderShell();
    const expand = railExpandButton();
    Object.defineProperty(expand, 'checkVisibility', { configurable: true, value: () => false });

    await user.click(collapseButton());

    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(expand).not.toHaveFocus();
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
