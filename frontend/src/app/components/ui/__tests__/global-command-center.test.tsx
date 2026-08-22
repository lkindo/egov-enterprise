import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCommandCenter } from '../global-command-center';
import { GlobalShortcutProvider } from '../global-shortcut-provider';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  logout: vi.fn(),
  getHeadMenus: vi.fn(),
  getLeftMenus: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mocks.logout }),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getHeadMenus: (...args: unknown[]) => mocks.getHeadMenus(...args),
    getLeftMenus: (...args: unknown[]) => mocks.getLeftMenus(...args),
  },
}));

function CommandCenterHarness({
  isMounted = true,
  onBackgroundClick,
}: {
  isMounted?: boolean;
  onBackgroundClick?: () => void;
}) {
  return (
    <GlobalShortcutProvider>
      <button type="button" onClick={onBackgroundClick}>커맨드 센터 호출 위치</button>
      <div data-testid="preconfigured-background">기존 속성 보존 대상</div>
      {isMounted && <GlobalCommandCenter />}
    </GlobalShortcutProvider>
  );
}

function renderCommandCenter(onBackgroundClick?: () => void) {
  return render(<CommandCenterHarness onBackgroundClick={onBackgroundClick} />);
}

async function openFromTrigger(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole('button', { name: '커맨드 센터 호출 위치' });
  trigger.focus();
  await user.keyboard('{Control>}k{/Control}');
  await screen.findByRole('dialog', { name: '글로벌 커맨드 센터' });
  return trigger;
}

describe('GlobalCommandCenter accessibility contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHeadMenus.mockResolvedValue([]);
    mocks.getLeftMenus.mockResolvedValue([]);
  });

  it('배경은 포커스 대상이 아니며 배경으로 닫아도 단축키 호출 위치로 포커스를 돌린다', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    const trigger = await openFromTrigger(user);

    const input = screen.getByRole('textbox', { name: '글로벌 커맨드 센터 검색어 입력' });
    expect(input).toHaveFocus();

    const backdrop = screen.getByTestId('global-command-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).not.toHaveAttribute('role');
    expect(backdrop).not.toHaveAttribute('tabindex');

    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '글로벌 커맨드 센터' })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('Tab과 Shift+Tab을 대화상자 안에서 순환시키고 Escape로 닫은 뒤 포커스를 복귀시킨다', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    const trigger = await openFromTrigger(user);

    const input = screen.getByRole('textbox', { name: '글로벌 커맨드 센터 검색어 입력' });
    const lastButton = screen.getByRole('button', { name: /로그아웃/ });
    expect(input).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastButton).toHaveFocus();

    await user.tab();
    expect(input).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '글로벌 커맨드 센터' })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('열린 동안 AppShell sibling의 클릭과 포커스를 막고 닫을 때 기존 속성을 정확히 복원한다', async () => {
    const onBackgroundClick = vi.fn();
    const user = userEvent.setup();
    renderCommandCenter(onBackgroundClick);
    const trigger = screen.getByRole('button', { name: '커맨드 센터 호출 위치' });
    const preconfiguredBackground = screen.getByTestId('preconfigured-background');
    preconfiguredBackground.setAttribute('aria-hidden', 'false');
    preconfiguredBackground.setAttribute('inert', 'preserve-this-value');

    await openFromTrigger(user);
    const input = screen.getByRole('textbox', { name: '글로벌 커맨드 센터 검색어 입력' });

    expect(trigger).toHaveAttribute('aria-hidden', 'true');
    expect(trigger).toHaveAttribute('inert', '');
    expect(preconfiguredBackground).toHaveAttribute('aria-hidden', 'true');
    expect(preconfiguredBackground).toHaveAttribute('inert', '');

    fireEvent.click(trigger);
    expect(onBackgroundClick).not.toHaveBeenCalled();
    trigger.focus();
    expect(input).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '글로벌 커맨드 센터' })).not.toBeInTheDocument();
    });

    expect(trigger).not.toHaveAttribute('aria-hidden');
    expect(trigger).not.toHaveAttribute('inert');
    expect(preconfiguredBackground).toHaveAttribute('aria-hidden', 'false');
    expect(preconfiguredBackground).toHaveAttribute('inert', 'preserve-this-value');

    fireEvent.click(trigger);
    expect(onBackgroundClick).toHaveBeenCalledOnce();
  });

  it('열린 상태에서 컴포넌트가 언마운트되어도 sibling의 기존 속성과 상호작용을 복원한다', async () => {
    const onBackgroundClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = renderCommandCenter(onBackgroundClick);
    const trigger = screen.getByRole('button', { name: '커맨드 센터 호출 위치' });
    const preconfiguredBackground = screen.getByTestId('preconfigured-background');
    preconfiguredBackground.setAttribute('aria-hidden', 'false');
    preconfiguredBackground.setAttribute('inert', 'preexisting');

    await openFromTrigger(user);
    expect(trigger).toHaveAttribute('aria-hidden', 'true');
    expect(preconfiguredBackground).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <CommandCenterHarness
        isMounted={false}
        onBackgroundClick={onBackgroundClick}
      />
    );

    expect(trigger).not.toHaveAttribute('aria-hidden');
    expect(trigger).not.toHaveAttribute('inert');
    expect(preconfiguredBackground).toHaveAttribute('aria-hidden', 'false');
    expect(preconfiguredBackground).toHaveAttribute('inert', 'preexisting');

    fireEvent.click(trigger);
    expect(onBackgroundClick).toHaveBeenCalledOnce();
  });

  it('메뉴 조회 실패 시 오류 객체를 콘솔에 전달하지 않는다', async () => {
    const rawError = { response: { status: 500 }, request: { authorization: 'sensitive' } };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getHeadMenus.mockRejectedValue(rawError);
    const user = userEvent.setup();
    renderCommandCenter();

    await openFromTrigger(user);

    await waitFor(() => expect(mocks.getHeadMenus).toHaveBeenCalledOnce());
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.flat()).not.toContain(rawError);
    consoleError.mockRestore();
  });

  it('검증된 modernRoute 또는 legacy chkURL만 명령 항목으로 렌더하고 이동한다', async () => {
    const user = userEvent.setup();
    mocks.getHeadMenus.mockResolvedValue([
      {
        menuNo: 1,
        menuNm: '안전 modern 메뉴',
        modernRoute: '/admin/work-hub?tab=job#calendar',
        chkURL: '//ignored.example',
      },
      {
        menuNo: 2,
        menuNm: '위험 modern 메뉴',
        modernRoute: '//evil.example/phish',
        chkURL: '/must-not-silently-fallback',
      },
      {
        menuNo: 3,
        menuNm: '레거시 메뉴',
        modernRoute: '',
        chkURL: 'legacy/selectMenu.do?menuNo=3#result',
      },
    ]);
    mocks.getLeftMenus.mockImplementation(async (menuNo: number) => menuNo === 1 ? [
      {
        menuNo: 10,
        menuNm: '인코딩 우회 메뉴',
        modernRoute: '/%2e%2e//evil.example',
        chkURL: '/must-not-render',
      },
      {
        menuNo: 11,
        menuNm: '안전 하위',
        modernRoute: '/admin/work-hub/child?view=summary#result',
      },
    ] : []);
    renderCommandCenter();

    await openFromTrigger(user);

    const safeModern = await screen.findByRole('button', { name: '안전 modern 메뉴' });
    expect(screen.getByRole('button', { name: '레거시 메뉴' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '안전 modern 메뉴 > 안전 하위' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getLeftMenus).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('button', { name: '위험 modern 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /인코딩 우회 메뉴/ })).not.toBeInTheDocument();

    await user.click(safeModern);
    expect(mocks.push).toHaveBeenCalledWith('/admin/work-hub?tab=job#calendar');
    expect(mocks.push).not.toHaveBeenCalledWith('//evil.example/phish');
    expect(mocks.push).not.toHaveBeenCalledWith('/must-not-silently-fallback');
  });

  it('로그아웃 완료 후 현재 화면을 history에 남기지 않고 로그인으로 이동한다', async () => {
    const user = userEvent.setup();
    mocks.logout.mockResolvedValue(undefined);
    renderCommandCenter();

    await openFromTrigger(user);
    await user.click(screen.getByRole('button', { name: /로그아웃/ }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
    expect(mocks.push).not.toHaveBeenCalledWith('/login');
  });

  it('로그아웃 요청이 실패해도 민감 화면에서 로그인으로 이탈한다', async () => {
    const user = userEvent.setup();
    mocks.logout.mockRejectedValue(new Error('logout failed'));
    renderCommandCenter();

    await openFromTrigger(user);
    await user.click(screen.getByRole('button', { name: /로그아웃/ }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });
});
