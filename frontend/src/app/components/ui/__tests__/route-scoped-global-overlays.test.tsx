import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteScopedGlobalOverlays } from '@/app/providers';
import { GlobalCommandCenter } from '../global-command-center';
import { GlobalShortcutProvider } from '../global-shortcut-provider';

const routeMocks = vi.hoisted(() => ({
  pathname: '/admin',
  logout: vi.fn(),
  getHeadMenus: vi.fn(),
  getLeftMenus: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => routeMocks.pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: routeMocks.logout }),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getHeadMenus: (...args: unknown[]) => routeMocks.getHeadMenus(...args),
    getLeftMenus: (...args: unknown[]) => routeMocks.getLeftMenus(...args),
  },
}));

function renderRouteOverlays(children: React.ReactNode) {
  return render(
    <GlobalShortcutProvider>
      <RouteScopedGlobalOverlays>{children}</RouteScopedGlobalOverlays>
    </GlobalShortcutProvider>
  );
}

describe('RouteScopedGlobalOverlays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.pathname = '/admin';
    routeMocks.getHeadMenus.mockResolvedValue([]);
    routeMocks.getLeftMenus.mockResolvedValue([]);
  });

  it('업무 화면에서는 세 오버레이를 렌더하고 로그인 경로에서는 모두 언마운트한다', () => {
    const { rerender } = renderRouteOverlays(
      <>
        <div data-testid="command-center" />
        <div data-testid="session-expiry" />
        <div data-testid="onboarding" />
      </>
    );

    expect(screen.getByTestId('command-center')).toBeInTheDocument();
    expect(screen.getByTestId('session-expiry')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding')).toBeInTheDocument();

    routeMocks.pathname = '/login';
    rerender(
      <GlobalShortcutProvider>
        <RouteScopedGlobalOverlays>
          <div data-testid="command-center" />
          <div data-testid="session-expiry" />
          <div data-testid="onboarding" />
        </RouteScopedGlobalOverlays>
      </GlobalShortcutProvider>
    );

    expect(screen.queryByTestId('command-center')).not.toBeInTheDocument();
    expect(screen.queryByTestId('session-expiry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument();
  });

  it('로그인으로 이동하면 실제 커맨드 센터의 단축키 등록도 해제한다', async () => {
    const { rerender } = renderRouteOverlays(
      <GlobalCommandCenter />
    );

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: '글로벌 커맨드 센터' })).toBeInTheDocument();
    expect(routeMocks.getHeadMenus).toHaveBeenCalledOnce();

    routeMocks.pathname = '/login/help';
    rerender(
      <GlobalShortcutProvider>
        <RouteScopedGlobalOverlays>
          <GlobalCommandCenter />
        </RouteScopedGlobalOverlays>
      </GlobalShortcutProvider>
    );

    expect(screen.queryByRole('dialog', { name: '글로벌 커맨드 센터' })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog', { name: '글로벌 커맨드 센터' })).not.toBeInTheDocument();
    expect(routeMocks.getHeadMenus).toHaveBeenCalledOnce();
  });
});
