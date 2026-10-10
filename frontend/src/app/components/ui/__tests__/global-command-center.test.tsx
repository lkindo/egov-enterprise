import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCommandCenter } from '../global-command-center';
import { GlobalShortcutProvider } from '../global-shortcut-provider';
import { pageInProjection } from '@/test-utils/projection';

// 고정 메뉴의 경로 — 원본에서는 로그인만 요구하는 관리 화면이 게이트를 통과하는지를 함께 본다. 그 화면이 투영으로 빠진
//   생성물에는 그런 관리 화면이 없으므로 관리 밖 core 경로로 본다(page 파일이 원장에 있고 실제로 없을 때다).
const WORK_HUB_ROUTE = pageInProjection('/admin/work-hub') ? '/admin/work-hub' : '/smart-toolkit/dept-job';
const COLLABORATION_ROUTE = pageInProjection('/admin/collaboration') ? '/admin/collaboration' : '/search';
const HELP_ROUTE = pageInProjection('/admin/help') ? '/admin/help' : '/search';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  logout: vi.fn(),
  getHeadMenus: vi.fn(),
  getLeftMenus: vi.fn(),
  getMyBookmarks: vi.fn(),
  user: undefined as { id: string; esntlId?: string; authorizationVersion?: string } | undefined,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mocks.logout, user: mocks.user }),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getHeadMenus: (...args: unknown[]) => mocks.getHeadMenus(...args),
    getLeftMenus: (...args: unknown[]) => mocks.getLeftMenus(...args),
    getMyBookmarks: (...args: unknown[]) => mocks.getMyBookmarks(...args),
  },
}));

function CommandCenterHarness({
  isMounted = true,
  onBackgroundClick,
  queryClient: providedQueryClient,
}: {
  isMounted?: boolean;
  onBackgroundClick?: () => void;
  queryClient?: QueryClient;
}) {
  const [queryClient] = useState(() => providedQueryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
    <GlobalShortcutProvider>
      <button type="button" onClick={onBackgroundClick}>커맨드 센터 호출 위치</button>
      <div data-testid="preconfigured-background">기존 속성 보존 대상</div>
      {isMounted && <GlobalCommandCenter />}
    </GlobalShortcutProvider>
    </QueryClientProvider>
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
    mocks.getMyBookmarks.mockResolvedValue([]);
    mocks.user = { id: 'staff01', esntlId: 'internal-1', authorizationVersion: 'v1' };
    window.localStorage.clear();
  });

  it('헤더의 빠른 이동 버튼이 보낸 요청으로도 열린다 — 단축키를 몰라도 즐겨찾기에 닿는다 (2026-10-01)', async () => {
    renderCommandCenter();
    const { requestCommandCenter } = await import('@/lib/navigation/command-center-bridge');
    act(() => requestCommandCenter());
    expect(await screen.findByRole('dialog', { name: '글로벌 커맨드 센터' })).toBeInTheDocument();
  });

  it('열린 명령센터도 메뉴 무효화 시 과거 항목을 감추고 회수된 응답을 반영한다', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.getHeadMenus.mockResolvedValueOnce([{ menuNo: 88, menuNm: '회수될 메뉴', modernRoute: '/old-menu' }]);
    const user = userEvent.setup();
    render(<CommandCenterHarness queryClient={queryClient} />);
    await openFromTrigger(user);
    expect(await screen.findByRole('option', { name: '회수될 메뉴' })).toBeInTheDocument();

    let finishRefresh!: (menus: never[]) => void;
    mocks.getHeadMenus.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
    await act(async () => { void queryClient.invalidateQueries({ queryKey: ['menus'] }); });
    await waitFor(() => expect(screen.queryByRole('option', { name: '회수될 메뉴' })).not.toBeInTheDocument());
    await act(async () => { finishRefresh([]); });
    expect(screen.queryByRole('option', { name: '회수될 메뉴' })).not.toBeInTheDocument();
    expect(mocks.getHeadMenus).toHaveBeenCalledTimes(2);
  });

  it('🚨 검색어가 비면 즐겨찾기와 최근 방문을 먼저 보이고, 지금 볼 수 없는 메뉴는 뺀다 (DIP B5 F2)', async () => {
    const user = userEvent.setup();
    mocks.user = { id: 'staff01' };
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '업무', modernRoute: WORK_HUB_ROUTE, children: [
        { menuNo: 11, menuNm: '결재함', modernRoute: '/approvals' },
        { menuNo: 12, menuNm: '공지', modernRoute: HELP_ROUTE },
      ] },
    ]);
    mocks.getMyBookmarks.mockResolvedValue([{ menuNo: 11, menuNm: '결재함' }]);
    // 99 는 배정이 회수된 메뉴다 — 기록에 있어도 보이지 않아야 한다. 11 은 이미 즐겨찾기라 최근 방문에서 뺀다.
    window.localStorage.setItem('egov.recent-menus.v1:staff01', JSON.stringify([99, 11, 12]));

    renderCommandCenter();
    await openFromTrigger(user);

    const favorites = await screen.findByRole('group', { name: '즐겨찾기' });
    expect(within(favorites).getAllByRole('option').map((option) => option.getAttribute('aria-label'))).toEqual(['업무 > 결재함']);
    const recents = screen.getByRole('group', { name: '최근 방문' });
    expect(within(recents).getAllByRole('option').map((option) => option.getAttribute('aria-label'))).toEqual(['업무 > 공지']);

    await user.click(within(favorites).getByRole('option', { name: '업무 > 결재함' }));
    expect(mocks.push).toHaveBeenCalledWith('/approvals');
  });

  it('즐겨찾기를 못 읽어도 메뉴 검색은 그대로 쓴다 (DIP B5 F2)', async () => {
    const user = userEvent.setup();
    mocks.getMyBookmarks.mockRejectedValue(new Error('down'));
    renderCommandCenter();
    await openFromTrigger(user);
    expect(await screen.findByRole('option', { name: '로그아웃' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '즐겨찾기' })).toBeNull();
  });

  it('3·4단계 메뉴를 검색하고 즐겨찾기·최근 방문에서 같은 목적지로 이동한다', async () => {
    const user = userEvent.setup();
    mocks.user = { id: 'staff01' };
    mocks.getHeadMenus.mockResolvedValue([
      { menuNo: 1, menuNm: '업무', modernRoute: WORK_HUB_ROUTE, children: [
        { menuNo: 11, menuNm: '팀 업무', children: [
          { menuNo: 111, menuNm: '결재함', modernRoute: '/approvals?tab=received#list', children: [
            { menuNo: 1111, menuNm: '결재 이력', modernRoute: '/approvals?tab=archive#list' },
          ] },
        ] },
        { menuNo: 88, menuNm: '중지 분류', useYn: 'N', children: [
          { menuNo: 89, menuNm: '중지 결재 이력', modernRoute: '/approvals?tab=archive#list' },
        ] },
      ] },
    ]);
    mocks.getMyBookmarks.mockResolvedValue([{ menuNo: 111 }, { menuNo: 89 }, { menuNo: 99 }]);
    window.localStorage.setItem('egov.recent-menus.v1:staff01', JSON.stringify([99, 111, 1111, 89]));
    renderCommandCenter();
    await openFromTrigger(user);

    const favorites = await screen.findByRole('group', { name: '즐겨찾기' });
    expect(within(favorites).getAllByRole('option').map(option => option.getAttribute('aria-label')))
      .toEqual(['업무 > 팀 업무 > 결재함']);
    const recents = screen.getByRole('group', { name: '최근 방문' });
    expect(within(recents).getAllByRole('option').map(option => option.getAttribute('aria-label')))
      .toEqual(['업무 > 팀 업무 > 결재함 > 결재 이력']);
    expect(screen.getByRole('option', { name: '업무' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /중지/ })).toBeNull();

    await user.click(within(favorites).getByRole('option', { name: '업무 > 팀 업무 > 결재함' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/approvals?tab=received#list');
    await openFromTrigger(user);
    await user.click(within(await screen.findByRole('group', { name: '최근 방문' }))
      .getByRole('option', { name: '업무 > 팀 업무 > 결재함 > 결재 이력' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/approvals?tab=archive#list');
    await openFromTrigger(user);
    fireEvent.change(screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' }), { target: { value: '결재 이력' } });
    await user.click(await screen.findByRole('option', { name: '업무 > 팀 업무 > 결재함 > 결재 이력' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/approvals?tab=archive#list');
    expect(mocks.getHeadMenus).toHaveBeenCalledTimes(3);
    expect(mocks.getLeftMenus).not.toHaveBeenCalled();
  });

  it('권한 버전이 바뀌면 이전 메뉴를 즉시 숨기고 새 허용 목록을 읽는다', async () => {
    const user = userEvent.setup();
    mocks.getHeadMenus.mockResolvedValueOnce([{ menuNo: 1, menuNm: '회수할 메뉴', modernRoute: HELP_ROUTE }]);
    const { rerender } = renderCommandCenter();
    await openFromTrigger(user);
    expect(await screen.findByRole('option', { name: '회수할 메뉴' })).toBeInTheDocument();
    mocks.user = { ...mocks.user!, authorizationVersion: 'v2' };
    mocks.getHeadMenus.mockResolvedValueOnce([]);
    rerender(<CommandCenterHarness />);
    expect(screen.queryByRole('option', { name: '회수할 메뉴' })).toBeNull();
    await waitFor(() => expect(mocks.getHeadMenus).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('option', { name: '회수할 메뉴' })).toBeNull();
  });

  it('계정 전환 뒤 도착한 이전 메뉴·즐겨찾기 응답을 다시 표시하지 않는다', async () => {
    const user = userEvent.setup();
    let resolveOldMenu!: (value: unknown) => void;
    let resolveOldBookmarks!: (value: unknown) => void;
    mocks.getHeadMenus.mockReturnValueOnce(new Promise(resolve => { resolveOldMenu = resolve; }));
    mocks.getMyBookmarks.mockReturnValueOnce(new Promise(resolve => { resolveOldBookmarks = resolve; }));
    const { rerender } = renderCommandCenter();
    await openFromTrigger(user);
    mocks.user = { id: 'staff02', esntlId: 'internal-2', authorizationVersion: 'v1' };
    mocks.getHeadMenus.mockResolvedValueOnce([{ menuNo: 2, menuNm: '새 계정 메뉴', modernRoute: WORK_HUB_ROUTE }]);
    rerender(<CommandCenterHarness />);
    expect(await screen.findByRole('option', { name: '새 계정 메뉴' })).toBeInTheDocument();
    await act(async () => {
      resolveOldMenu([{ menuNo: 1, menuNm: '이전 계정 메뉴', modernRoute: HELP_ROUTE }]);
      resolveOldBookmarks([{ menuNo: 1 }]);
    });
    expect(screen.queryByRole('option', { name: '이전 계정 메뉴' })).toBeNull();
    expect(screen.queryByRole('group', { name: '즐겨찾기' })).toBeNull();
    expect(screen.getByRole('option', { name: '새 계정 메뉴' })).toBeInTheDocument();
  });

  it('같은 계정에서 다시 열어도 메뉴 변경과 빈 응답을 반영한다', async () => {
    const user = userEvent.setup();
    mocks.getHeadMenus.mockResolvedValueOnce([{ menuNo: 1, menuNm: '삭제할 메뉴', modernRoute: HELP_ROUTE }]);
    renderCommandCenter();
    await openFromTrigger(user);
    expect(await screen.findByRole('option', { name: '삭제할 메뉴' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    mocks.getHeadMenus.mockResolvedValueOnce([]);
    await openFromTrigger(user);
    await waitFor(() => expect(mocks.getHeadMenus).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('option', { name: '삭제할 메뉴' })).toBeNull();
  });

  it('광역 검색 제안은 선언된 q만 인코딩하여 기존 검색 주소로 이동한다', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    await openFromTrigger(user);
    const query = '홍 길동 + & #';
    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });
    fireEvent.change(input, { target: { value: query } });
    expect(input).toHaveAttribute('maxlength', '200');
    await user.click(await screen.findByRole('option', { name: `"${query}" 통합 검색 — 게시글 제목·임직원·메뉴` }));
    expect(mocks.push).toHaveBeenCalledWith('/search' + '?q=' + encodeURIComponent(query));
  });

  it('🚨 일치하는 항목이 있어도 통합 검색 제안을 마지막에 둔다 (DIP V9)', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    await openFromTrigger(user);

    fireEvent.change(screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' }), { target: { value: '로그' } });

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.getAttribute('aria-label'))).toEqual([
      '로그아웃',
      '"로그" 통합 검색 — 게시글 제목·임직원·메뉴',
    ]);
  });

  it('🚨 방향키로 고른 항목을 aria-activedescendant 와 aria-selected 로 알린다 (DIP V9)', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    await openFromTrigger(user);
    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });
    // 모든 생성물에 있는 두 항목(로그아웃·통합 검색 제안) 사이를 오간다 — 협업 허브 바로가기는 협업 팩 마커 안이다.
    fireEvent.change(input, { target: { value: '로그' } });
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);

    expect(input).toHaveAttribute('aria-controls', 'command-center-results');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  /*
   * [2026-10-10] 방향키가 고르는 순서는 화면에 보이는 순서다. 결과는 분류(메뉴·시스템…)별로 묶어 그리는데, 종전에는
   *   고르는 순서가 [빠른 이동…, 메뉴…] 그대로라 메뉴가 있으면 '협업 통합 허브' 에서 한 번 내릴 때 바로 아래 메뉴가 아니라
   *   맨 아래 '로그아웃' 이 골라졌다 — 그 상태로 Enter 를 누르면 로그아웃됐다.
   */
  it('메뉴가 있어도 방향키는 화면에 보이는 순서대로 고르고, Enter 는 보이는 선택 항목을 연다', async () => {
    mocks.getHeadMenus.mockResolvedValue([{ menuNo: 7, menuNm: '통합 검색 바로가기', modernRoute: '/search' }]);
    const user = userEvent.setup();
    renderCommandCenter();
    await openFromTrigger(user);
    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });
    await screen.findByRole('option', { name: '통합 검색 바로가기' });
    const options = screen.getAllByRole('option');
    expect(options.at(-1)).toHaveAccessibleName('로그아웃');

    for (const option of options) {
      expect(input).toHaveAttribute('aria-activedescendant', option.id);
      expect(option).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowDown}');
    }
    // 마지막에서 한 번 더 내리면 처음으로 돈다.
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    // 보이는 순서로 메뉴 항목까지 내려가 Enter 를 누르면 그 메뉴를 연다 — 로그아웃하지 않는다.
    while (input.getAttribute('aria-activedescendant') !== screen.getByRole('option', { name: '통합 검색 바로가기' }).id) {
      await user.keyboard('{ArrowDown}');
    }
    await user.keyboard('{Enter}');
    expect(mocks.push).toHaveBeenCalledWith('/search');
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('프로그램으로 주입된 길이 초과 검색어도 이동 제안으로 만들지 않는다', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    await openFromTrigger(user);
    fireEvent.change(screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' }), { target: { value: '한'.repeat(201) } });
    expect(screen.getByRole('alert')).toHaveTextContent('200자 이내');
    expect(screen.queryByRole('option', { name: /통합 검색/ })).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('배경은 포커스 대상이 아니며 배경으로 닫아도 단축키 호출 위치로 포커스를 돌린다', async () => {
    const user = userEvent.setup();
    renderCommandCenter();
    const trigger = await openFromTrigger(user);

    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });
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

    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });
    // [DIP V9] combobox 패턴 — 결과 항목은 Tab 순서가 아니라 방향키와 aria-activedescendant 로 고른다.
    //   그래서 대화상자 안의 Tab 순환은 입력칸 하나에 머문다(밖으로 새지 않는 것이 이 테스트의 요지다).
    expect(screen.getByRole('option', { name: /로그아웃/ })).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveFocus();

    await user.tab({ shift: true });
    expect(input).toHaveFocus();

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
    const input = screen.getByRole('combobox', { name: '글로벌 커맨드 센터 검색어 입력' });

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

  it('검증된 modernRoute(레거시 .do 경로 포함)만 명령 항목으로 렌더하고 이동한다 — chkURL 은 목적지가 아니다', async () => {
    const user = userEvent.setup();
    mocks.getHeadMenus.mockResolvedValue([
      {
        menuNo: 1,
        menuNm: '안전 modern 메뉴',
        modernRoute: `${WORK_HUB_ROUTE}?tab=job#calendar`,
        chkURL: '//ignored.example',
        // [DIP B5 F10] 하위 메뉴는 상위 메뉴 응답의 children 으로 온다 — 상위마다 다시 요청하지 않는다.
        children: [
          {
            menuNo: 10,
            menuNm: '인코딩 우회 메뉴',
            modernRoute: '/%2e%2e//evil.example',
            chkURL: '/must-not-render',
          },
          {
            menuNo: 11,
            menuNm: '안전 하위',
            // 등록된 화면이어야 한다 — 라우트 게이트가 거부할 메뉴는 제안하지 않는다(openableMenus).
            modernRoute: `${COLLABORATION_ROUTE}?view=summary#result`,
          },
        ],
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
        modernRoute: 'legacy/selectMenu.do?menuNo=3#result',
      },
      {
        // [2026-10-05] 경로가 없으면 chkURL 이 레거시 .do 여도 제안하지 않는다(서버는 '#' 만 보낸다).
        menuNo: 4,
        menuNm: '경로 없는 메뉴',
        modernRoute: '',
        chkURL: 'legacy/selectMenu.do?menuNo=4',
      },
    ]);
    renderCommandCenter();

    await openFromTrigger(user);

    const safeModern = await screen.findByRole('option', { name: '안전 modern 메뉴' });
    expect(screen.getByRole('option', { name: '레거시 메뉴' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '안전 modern 메뉴 > 안전 하위' })).toBeInTheDocument();
    expect(mocks.getHeadMenus).toHaveBeenCalledOnce();
    expect(mocks.getLeftMenus).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '위험 modern 메뉴' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /인코딩 우회 메뉴/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '경로 없는 메뉴' })).not.toBeInTheDocument();

    await user.click(safeModern);
    expect(mocks.push).toHaveBeenCalledWith(`${WORK_HUB_ROUTE}?tab=job#calendar`);
    expect(mocks.push).not.toHaveBeenCalledWith('//evil.example/phish');
    expect(mocks.push).not.toHaveBeenCalledWith('/must-not-silently-fallback');
  });

  it('로그아웃 완료 후 현재 화면을 history에 남기지 않고 로그인으로 이동한다', async () => {
    const user = userEvent.setup();
    mocks.logout.mockResolvedValue(undefined);
    renderCommandCenter();

    await openFromTrigger(user);
    await user.click(screen.getByRole('option', { name: /로그아웃/ }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
    expect(mocks.push).not.toHaveBeenCalledWith('/login');
  });

  it('로그아웃 요청이 실패해도 민감 화면에서 로그인으로 이탈한다', async () => {
    const user = userEvent.setup();
    mocks.logout.mockRejectedValue(new Error('logout failed'));
    renderCommandCenter();

    await openFromTrigger(user);
    await user.click(screen.getByRole('option', { name: /로그아웃/ }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });
});
