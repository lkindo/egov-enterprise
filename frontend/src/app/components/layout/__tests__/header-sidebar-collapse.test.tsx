/**
 * 넓은 화면(lg 이상)의 사이드바 접기(2026-10-05, 카탈로그 §4 '사이드바 접기').
 *
 * 고정하는 것:
 *  - 머리글 단추는 이름이 고정이고 접힘 상태는 aria-expanded 하나로만 말하며(APG disclosure — 이름까지 바꾸면 상태를 두 번
 *    말한다), aria-controls 로 사이드바를 가리킨다.
 *  - 아이콘은 둘 다 그리고 <html data-sidebar-collapsed> 를 보는 CSS 가 하나만 보인다 — 새로고침 직후 하이드레이션 전에도 맞다.
 *  - 누르면 <html data-sidebar-collapsed> 와 이 브라우저의 기억이 함께 바뀐다(실제 숨김·본문 여백은 globals.css).
 *  - 저장소를 쓸 수 없어도 이번 화면의 접기·펼치기는 동작한다.
 *  - 그리기 전 스크립트가 되살린 접힘을 단추가 그대로 읽는다(기본은 펼침).
 *  - 접힌 상태에서 주메뉴의 '메뉴 보기' 단추를 누르면 사이드바가 다시 펼쳐진다 — 그 단추는 사이드바의 하위 메뉴만 바꾸므로
 *    접힌 채로 두면 눌러도 보이는 변화가 없는 죽은 단추가 된다(반박 리뷰 major 1, G10).
 *  - 서랍형(lg 미만) 단추와는 별개다 — 두 단추는 CSS 로만 번갈아 보이고 같은 사이드바를 가리킨다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '@/services/foundation/auth/authService';
import type { MenuInfo } from '@/types/foundation/menu';
import {
  SIDEBAR_COLLAPSE_SCRIPT,
  SIDEBAR_COLLAPSED_ATTRIBUTE,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_TOGGLE_LABEL,
} from '@/lib/layout/sidebar-collapse-script';
import { setSidebarCollapsed } from '@/lib/layout/use-sidebar-collapsed';
import { Header } from '../header';

const { setActiveMenuNo } = vi.hoisted(() => ({ setActiveMenuNo: vi.fn() }));

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin', name: '관리자', groups: [], permissions: [], authorizationVersion: 'v1' } as unknown as UserInfo,
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ isSidebarOpen: false, toggleSidebar: vi.fn(), activeMenuNo: 0, setActiveMenuNo }),
}));

vi.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [], unreadCount: 0, error: null, markAsRead: vi.fn(), markAllAsRead: vi.fn(), refresh: vi.fn(),
  }),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../ui/app-notification-drawer', () => ({ AppNotificationDrawer: () => null }));
vi.mock('../HeaderSearchParamSync', () => ({ HeaderSearchParamSync: () => null }));

/** 경로가 없고 하위 메뉴만 있는 영역(OCI 실측: 소통·지식·참여·관리 센터가 이 형태다). */
const ROUTELESS_DOMAIN: MenuInfo = {
  menuNo: 2000000,
  menuNm: '소통·지식',
  upperMenuId: 0,
  upMenuSn: 0,
  menuOrdr: 2,
  children: [{ menuNo: 2000100, menuNm: '게시판', upperMenuId: 2000000, upMenuSn: 2000000, menuOrdr: 1 }],
};

function renderHeader(initialMenus: MenuInfo[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Header initialMenus={initialMenus} />
    </QueryClientProvider>,
  );
}

const html = () => document.documentElement;
const toggleButton = () => screen.getByRole('button', { name: SIDEBAR_TOGGLE_LABEL });

describe('넓은 화면 사이드바 접기', () => {
  beforeEach(() => {
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    setActiveMenuNo.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('기본은 펼침이고, 단추가 고정 이름·aria-expanded·aria-controls 로 사이드바를 가리킨다', () => {
    renderHeader();
    const toggle = toggleButton();

    expect(SIDEBAR_TOGGLE_LABEL).toBe('사이드바 접기·펼치기');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'primary-sidebar');
    expect(toggle).toHaveAttribute('title', SIDEBAR_TOGGLE_LABEL);
    // 넓은 화면에서만 보인다(CSS) — 서랍형 단추와 같은 DOM 에서 CSS 로만 번갈아 보인다(ADR-0006).
    expect(toggle).toHaveClass('hidden', 'lg:inline-flex');
    const drawerToggle = screen.getByRole('button', { name: '주 메뉴 열기' });
    expect(drawerToggle).toHaveClass('lg:hidden');
    expect(drawerToggle).toHaveAttribute('aria-controls', 'primary-sidebar');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('아이콘은 둘 다 그리고 접힘 속성을 보는 CSS 가 하나만 보인다(하이드레이션 전에도 맞는 아이콘)', () => {
    renderHeader();
    const toggle = toggleButton();
    const collapseIcon = toggle.querySelector('[data-sidebar-icon="collapse"]');
    const expandIcon = toggle.querySelector('[data-sidebar-icon="expand"]');

    // 아이콘만 있는 단추라 접근 이름이 필요하다 — 아이콘은 보조기술에서 숨긴다(테스트 설정은 lucide 아이콘을 span 으로 바꾼다).
    expect(collapseIcon).toHaveAttribute('aria-hidden', 'true');
    expect(expandIcon).toHaveAttribute('aria-hidden', 'true');
    expect(collapseIcon).toHaveClass('sidebar-collapsed:hidden');
    expect(collapseIcon).not.toHaveClass('hidden');
    expect(expandIcon).toHaveClass('hidden', 'sidebar-collapsed:block');
  });

  it('누르면 <html> 표지와 기억이 함께 바뀌고, 다시 누르면 펼친다(이름은 그대로, 상태만 바뀐다)', async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = toggleButton();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName(SIDEBAR_TOGGLE_LABEL);
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('1');
    // 단추가 자리를 지켜 포커스가 사라지지 않는다.
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it('저장소를 쓸 수 없어도 이번 화면의 접기·펼치기는 동작한다', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('SecurityError'); });
    // 저장 실패는 던지지 않는다 — 던지면 단추의 클릭 처리기가 중간에 끊긴다.
    expect(() => setSidebarCollapsed(true)).not.toThrow();
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');
    expect(() => setSidebarCollapsed(false)).not.toThrow();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    const user = userEvent.setup();
    renderHeader();

    await user.click(toggleButton());
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');

    await user.click(toggleButton());
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('그리기 전 스크립트가 되살린 접힘을 단추가 그대로 읽는다', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '1');
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, 'true');

    renderHeader();
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('접힌 상태에서 주메뉴의 하위 메뉴 보기 단추를 누르면 사이드바를 함께 편다(죽은 단추 방지)', async () => {
    setSidebarCollapsed(true);
    const user = userEvent.setup();
    renderHeader([ROUTELESS_DOMAIN]);

    await user.click(screen.getByRole('button', { name: '소통·지식 메뉴 보기' }));

    expect(setActiveMenuNo).toHaveBeenCalledWith(2000000);
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it('펼친 상태에서 하위 메뉴 보기 단추는 영역만 바꾸고 접힘을 건드리지 않는다(대조군)', async () => {
    const user = userEvent.setup();
    renderHeader([ROUTELESS_DOMAIN]);

    await user.click(screen.getByRole('button', { name: '소통·지식 메뉴 보기' }));

    expect(setActiveMenuNo).toHaveBeenCalledWith(2000000);
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });
});

describe('그리기 전 복원 스크립트', () => {
  beforeEach(() => {
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('기억이 없거나 다른 값이면 아무것도 하지 않는다(기본 펼침)', () => {
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    new Function(SIDEBAR_COLLAPSE_SCRIPT)();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('저장소 접근이 막혀도 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => new Function(SIDEBAR_COLLAPSE_SCRIPT)()).not.toThrow();
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('정적 문자열이다 — 요청 값이 섞일 자리가 없다', () => {
    expect(SIDEBAR_COLLAPSE_SCRIPT).not.toMatch(/\$\{/);
    expect(SIDEBAR_COLLAPSE_SCRIPT).toContain(`'${SIDEBAR_COLLAPSED_STORAGE_KEY}'`);
    expect(SIDEBAR_COLLAPSE_SCRIPT).toContain(`'${SIDEBAR_COLLAPSED_ATTRIBUTE}'`);
  });
});
