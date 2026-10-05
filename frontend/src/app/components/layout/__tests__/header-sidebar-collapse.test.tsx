/**
 * 머리글과 넓은 화면(lg 이상) 사이드바 접기(2026-10-05, 카탈로그 §4 '사이드바 접기').
 *
 * [DEC-OPS-228] 접고 펴는 단추는 사이드바 경계선의 원형 아이콘 하나다(sidebar-edge-toggle.tsx — 그 동작은
 * sidebar-edge-toggle.test.tsx 가 본다). 사용자가 로고 옆 머리글 아이콘을 보지 못했고, 같은 기능의 단추가 둘이면 어느 쪽이
 * 정본인지 흐려지므로 머리글에서는 걷었다. 여기서 고정하는 것:
 *  - 머리글에는 넓은 화면용 접기·펼치기 단추가 없다(되살아나면 같은 기능의 단추가 둘이 된다).
 *  - lg 미만의 서랍 단추('주 메뉴 열기')는 그대로이고 같은 사이드바를 가리킨다.
 *  - 접힌 상태에서 주메뉴의 '메뉴 보기' 단추를 누르면 사이드바가 다시 펼쳐진다 — 그 단추는 사이드바의 하위 메뉴만 바꾸므로
 *    접힌 채로 두면 눌러도 보이는 변화가 없는 죽은 단추가 된다(G10).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '@/services/foundation/auth/authService';
import type { MenuInfo } from '@/types/foundation/menu';
import {
  SIDEBAR_COLLAPSED_ATTRIBUTE,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
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

describe('머리글과 넓은 화면 사이드바 접기', () => {
  beforeEach(() => {
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    setActiveMenuNo.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    html().removeAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
  });

  it('머리글에는 넓은 화면용 접기·펼치기 단추가 없고, 서랍 단추만 사이드바를 가리킨다', () => {
    renderHeader([ROUTELESS_DOMAIN]);

    // 접기 단추는 사이드바 경계선의 하나뿐이다 — 머리글에 이름이 '사이드바'로 시작하는 단추가 다시 생기면 둘이 된다.
    expect(screen.queryAllByRole('button', { name: /사이드바/ })).toEqual([]);
    expect(document.querySelector('[data-sidebar-icon]')).toBeNull();
    const drawerToggle = screen.getByRole('button', { name: '주 메뉴 열기' });
    expect(drawerToggle).toHaveClass('lg:hidden');
    expect(drawerToggle).toHaveAttribute('aria-controls', 'primary-sidebar');
    // 머리글에서 사이드바를 가리키는 단추는 서랍 단추 하나다.
    expect(document.querySelectorAll('[aria-controls="primary-sidebar"], [aria-controls="primary-sidebar-content"]'))
      .toHaveLength(1);
  });

  it('접힌 상태에서 주메뉴의 하위 메뉴 보기 단추를 누르면 사이드바를 함께 편다(죽은 단추 방지)', async () => {
    setSidebarCollapsed(true);
    const user = userEvent.setup();
    renderHeader([ROUTELESS_DOMAIN]);

    await user.click(screen.getByRole('button', { name: '소통·지식 메뉴 보기' }));

    expect(setActiveMenuNo).toHaveBeenCalledWith(2000000);
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it('펼친 상태에서 하위 메뉴 보기 단추는 영역만 바꾸고 접힘을 건드리지 않는다(대조군)', async () => {
    const user = userEvent.setup();
    renderHeader([ROUTELESS_DOMAIN]);

    await user.click(screen.getByRole('button', { name: '소통·지식 메뉴 보기' }));

    expect(setActiveMenuNo).toHaveBeenCalledWith(2000000);
    expect(html()).not.toHaveAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });
});
