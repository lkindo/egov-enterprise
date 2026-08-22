import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '@/services/foundation/auth/authService';
import type { MenuInfo } from '@/types/foundation/menu';
import { Header } from '../header';

const testState = vi.hoisted(() => ({
  user: null as UserInfo | null,
  logout: vi.fn(async () => undefined),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: testState.routerPush, replace: testState.routerReplace }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: testState.user, logout: testState.logout }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({
    isSidebarOpen: false,
    toggleSidebar: vi.fn(),
    activeMenuNo: 1000000,
    setActiveMenuNo: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../../ui/app-notification-drawer', () => ({
  AppNotificationDrawer: () => null,
}));

vi.mock('../HeaderSearchParamSync', () => ({
  HeaderSearchParamSync: () => null,
}));

const headMenus: MenuInfo[] = [
  {
    menuNo: 1000000,
    menuNm: '업무 공간',
    upperMenuId: 0,
    upMenuSn: 0,
    menuOrdr: 1,
    modernRoute: '/admin/work-hub',
  },
];

function renderHeader(user: UserInfo | null, menus: MenuInfo[] = headMenus) {
  testState.user = user;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Header initialMenus={menus} />
    </QueryClientProvider>,
  );
}

async function openAccountMenu() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '사용자 계정 메뉴' }));
}

function queryAccountLink(href: string) {
  return document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
}

describe('Header account navigation authorization', () => {
  beforeEach(() => {
    testState.user = null;
    testState.logout.mockClear();
    testState.routerPush.mockClear();
    testState.routerReplace.mockClear();
  });

  it('320px header keeps its controls while using compact row spacing', async () => {
    const { container } = renderHeader(null);

    expect(await screen.findByRole('link', { name: '로그인 이동' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '주 메뉴 열기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '테마 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument();

    const headerRow = container.querySelector('header > div.flex');
    expect(headerRow).not.toBeNull();
    expect(headerRow).toHaveClass('gap-3', 'sm:gap-4');
    expect(headerRow).not.toHaveClass('gap-4');
  });

  it('일반 사용자는 userSe 값과 무관하게 관리자 전용 링크를 볼 수 없다', async () => {
    renderHeader({ id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'SYS' });

    await openAccountMenu();

    expect(queryAccountLink('/admin/workspace/my-page')).not.toBeInTheDocument();
    expect(queryAccountLink('/admin/system/menus')).not.toBeInTheDocument();
    expect(screen.getByText('사용자')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it.each([undefined, 'ADMINISTRATOR'])('role이 %s이면 관리자 전용 링크를 볼 수 없다', async (role) => {
    renderHeader({ id: 'unknown-user', name: '역할 미확인 사용자', role, userSe: 'ADM' });

    await openAccountMenu();

    expect(queryAccountLink('/admin/workspace/my-page')).not.toBeInTheDocument();
    expect(queryAccountLink('/admin/system/menus')).not.toBeInTheDocument();
  });

  it.each(['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'])('명시적 관리자 역할 %s에는 관리자 전용 링크를 제공한다', async (role) => {
    renderHeader({ id: `${role.toLowerCase()}-user`, name: '관리 사용자', role, userSe: 'USR' });

    await openAccountMenu();

    expect(screen.getByText('관리자')).toBeInTheDocument();
    expect(queryAccountLink('/admin/workspace/my-page')).toHaveAttribute(
      'href',
      '/admin/workspace/my-page',
    );
    expect(queryAccountLink('/admin/system/menus')).toHaveAttribute(
      'href',
      '/admin/system/menus',
    );
    expect(screen.getByRole('link', { name: '마이페이지 환경 설정 이동' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '시스템 메뉴 관리 이동' })).toBeInTheDocument();
  });

  it('로그아웃 후 현재 화면을 history에 남기지 않고 로그인으로 이동한다', async () => {
    renderHeader({ id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'USR' });
    await openAccountMenu();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(testState.logout).toHaveBeenCalledOnce();
    expect(testState.routerReplace).toHaveBeenCalledWith('/login');
    expect(testState.routerPush).not.toHaveBeenCalledWith('/login');
  });

  it('로그아웃 요청이 실패해도 로그인 화면으로 이탈한다', async () => {
    testState.logout.mockRejectedValueOnce(new Error('network failure'));
    renderHeader({ id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'USR' });
    await openAccountMenu();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(testState.routerReplace).toHaveBeenCalledWith('/login');
  });

  it('동적 route가 위험하면 검증된 도메인 route fallback만 링크로 사용한다', async () => {
    renderHeader(
      { id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'USR' },
      [menuWithRoute({
        menuNo: 1000000,
        menuNm: '업무 공간',
        modernRoute: '//evil.example/phish',
        chkURL: '/unsafe-silent-fallback',
      })],
    );

    expect(await screen.findByRole('link', { name: '업무 공간' })).toHaveAttribute(
      'href',
      '/admin/work-hub',
    );
    expect(document.querySelector('a[href="//evil.example/phish"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/unsafe-silent-fallback"]')).not.toBeInTheDocument();
  });

  it('동적 route와 고정 fallback이 모두 없으면 비이동 disabled 항목으로 렌더한다', async () => {
    renderHeader(
      { id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'USR' },
      [menuWithRoute({
        menuNo: 7777777,
        menuNm: '계약 밖 메뉴',
        modernRoute: 'https://evil.example/phish',
      })],
    );

    expect(await screen.findByRole('button', { name: '계약 밖 메뉴 이동 불가' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: '계약 밖 메뉴' })).not.toBeInTheDocument();
  });

  it('relative legacy .do route는 내부 경로로 정규화한다', async () => {
    renderHeader(
      { id: 'ordinary-user', name: '일반 사용자', role: 'USER', userSe: 'USR' },
      [menuWithRoute({
        menuNo: 7777778,
        menuNm: '레거시 메뉴',
        modernRoute: '',
        chkURL: 'legacy/selectMenu.do?menuNo=7#result',
      })],
    );

    expect(await screen.findByRole('link', { name: '레거시 메뉴' })).toHaveAttribute(
      'href',
      '/legacy/selectMenu.do?menuNo=7#result',
    );
  });
});

function menuWithRoute(overrides: Partial<MenuInfo>): MenuInfo {
  return {
    menuNo: 1,
    menuNm: '메뉴',
    upperMenuId: 0,
    upMenuSn: 0,
    menuOrdr: 1,
    ...overrides,
  };
}
