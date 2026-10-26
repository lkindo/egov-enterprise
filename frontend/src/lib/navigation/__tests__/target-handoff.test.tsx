import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HANDOFF_TTL_MS, clearMenuFocusHandoff, clearScreenHandoff, clearTargetHandoff, handOffMenuFocus, handOffScreen,
  handOffTarget, isHandOffMenuRoute, isHandOffReturnRoute, isHandOffScreenRoute, useMenuFocusHandoff, useScreenHandoff,
  useTargetHandoff,
} from '../target-handoff';

function MenuFocusProbe() {
  const focus = useMenuFocusHandoff();
  return <p>{focus ? `메뉴:${focus.menuSn}${focus.returnTo ? ` 돌아갈 곳:${focus.returnTo.label}@${focus.returnTo.route}` : ''}` : '메뉴 없음'}</p>;
}

function ScreenReturnProbe() {
  const screen = useScreenHandoff();
  return <p>{screen ? `${screen.route} 돌아갈 곳:${screen.returnTo ? `${screen.returnTo.label}@${screen.returnTo.route}` : '없음'}` : '화면 없음'}</p>;
}

function Probe() {
  const target = useTargetHandoff('authority-user');
  return <p>{target ? `${target.name}:${target.loginId}` : '없음'}</p>;
}

function ScreenProbe() {
  const screen = useScreenHandoff();
  return <p>{screen ? `${screen.label ?? '이름 미확인'}:${screen.route}` : '화면 없음'}</p>;
}

describe('대상 인계(target-handoff)', () => {
  afterEach(() => { vi.useRealTimers(); window.sessionStorage.clear(); });

  it('넘긴 대상을 받고, 지우면 사라진다 — URL 은 건드리지 않는다', () => {
    const before = window.location.href;
    handOffTarget('authority-user', { id: 'E1', loginId: 'kim', name: '김' });
    render(<Probe />);
    expect(screen.getByText('김:kim')).toBeInTheDocument();
    act(() => clearTargetHandoff('authority-user'));
    expect(screen.getByText('없음')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('유효 시간이 지난 인계는 받지 않는다 — 한참 뒤 연 화면이 옛 대상을 다시 열지 않는다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
    handOffTarget('authority-user', { id: 'E1', loginId: 'kim', name: '김' });
    vi.setSystemTime(new Date(Date.now() + HANDOFF_TTL_MS + 1));
    render(<Probe />);
    expect(screen.getByText('없음')).toBeInTheDocument();
  });

  it('다른 슬롯이나 형식이 틀린 값은 받지 않는다', () => {
    handOffTarget('login-log-user', { id: 'E1', loginId: 'kim', name: '김' });
    window.sessionStorage.setItem('egov.target-handoff.v1:authority-user', '{"id":1}');
    render(<Probe />);
    expect(screen.getByText('없음')).toBeInTheDocument();
  });

  it('저장소에 쓰지 못하면 같은 슬롯의 이전 대상도 지운다 — 다음 화면이 직전의 다른 사람을 열지 않는다', () => {
    handOffTarget('authority-user', { id: 'E1', loginId: 'kim', name: '김' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    try {
      handOffTarget('authority-user', { id: 'E2', loginId: 'lee', name: '이' });
    } finally {
      setItem.mockRestore();
    }
    render(<Probe />);
    expect(screen.getByText('없음')).toBeInTheDocument();
  });
});

/** [2026-10-02 D3] 화면 관리의 '메뉴에 추가' → 메뉴 관리의 새 메뉴. 사용자 인계와 같은 원칙이고 저장 키는 따로다. */
describe('화면 인계(screen handoff)', () => {
  afterEach(() => { vi.useRealTimers(); window.sessionStorage.clear(); });

  it('넘긴 화면의 경로·이름을 받고, 받은 화면이 지우면 사라진다 — URL 은 건드리지 않는다', () => {
    const before = window.location.href;
    expect(handOffScreen({ route: '/admin/system/programs', label: '화면 관리' })).toBe(true);
    render(<ScreenProbe />);
    expect(screen.getByText('화면 관리:/admin/system/programs')).toBeInTheDocument();
    act(() => clearScreenHandoff());
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('저장소에 쓰지 못하면 false 다 — 호출부가 이동하지 않게 하고, 이전 화면 인계도 남기지 않는다', () => {
    expect(handOffScreen({ route: '/note', label: '쪽지' })).toBe(true);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    let handedOff: boolean;
    try {
      handedOff = handOffScreen({ route: '/approvals', label: '결재함' });
    } finally {
      setItem.mockRestore();
    }
    expect(handedOff).toBe(false);
    render(<ScreenProbe />);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
  });

  it('이름이 없는 화면은 이름 없이 넘긴다 — 받는 화면이 이름을 묻는다', () => {
    handOffScreen({ route: '/note', label: null });
    render(<ScreenProbe />);
    expect(screen.getByText('이름 미확인:/note')).toBeInTheDocument();
  });

  it('유효 시간이 지난 화면 인계는 받지 않는다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'));
    handOffScreen({ route: '/note', label: '쪽지' });
    vi.setSystemTime(new Date(Date.now() + HANDOFF_TTL_MS + 1));
    render(<ScreenProbe />);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
  });

  it.each([
    'admin/system/menus', '//evil.invalid/admin', 'https://evil.invalid/admin',
    '/admin/system/menus#top', '/smart-toolkit/dept-job/[id]', '/admin/../login', '/admin/system/menus ',
  ])('메뉴에 연결할 수 없는 경로(%s)는 넘기지도 받지도 않는다', (route) => {
    expect(isHandOffScreenRoute(route)).toBe(false);
    expect(handOffScreen({ route, label: '화면' })).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
    window.sessionStorage.setItem('egov.screen-handoff.v1:menu-add-screen', JSON.stringify({ route, label: '화면', at: Date.now() }));
    render(<ScreenProbe />);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
  });

  /*
    [2026-10-26 ADR-0043 결정 1] 메뉴 경로 인계는 식별자 쿼리(이름=값, 셋까지)를 받는다 — 게시판 이용 화면처럼 쿼리가 붙은 주소를
    메뉴에 붙인다. 화면 경로 검사(isHandOffScreenRoute)는 그대로 쿼리를 거부한다(화면 관리의 '메뉴에 추가' 판정).
  */
  it.each([
    '/admin/community/boards/select-board-list?bbsId=BBSMSTR_000000000001',
    '/admin/system/menus?tab=GROUPS',
    '/admin/help?tab=FAQ&bbsId=BBSMSTR_AAAAAAAAAAAA',
  ])('식별자 쿼리가 붙은 메뉴 경로(%s)는 넘기고 받는다', (route) => {
    expect(isHandOffScreenRoute(route)).toBe(false);
    expect(isHandOffMenuRoute(route)).toBe(true);
    expect(handOffScreen({ route, label: '게시판' })).toBe(true);
    render(<ScreenProbe />);
    expect(screen.getByText(`게시판:${route}`)).toBeInTheDocument();
  });

  it.each([
    '/admin/community/boards/select-board-list?searchWrd=%EA%B9%80', '/admin/help?keyword=a b', '/admin/help?keyword=김철수',
    '/admin/help?tab=FAQ&tab=QNA', '/admin/help?a=1&b=2&c=3&d=4', '/admin/help?=x', '/admin/help?tab=', '/admin/help?tab=a=b',
    '/admin/help?tab', '/admin/help?', '//evil.invalid/x?tab=FAQ', '/admin/help?tab=FAQ#top', '/admin/x/[id]?tab=FAQ',
    '/admin/help?1tab=FAQ',
  ])('자유 입력·겹친 이름·형식이 틀린 쿼리(%s)는 메뉴 경로로 넘기지도 받지도 않는다', (route) => {
    expect(isHandOffMenuRoute(route)).toBe(false);
    expect(handOffScreen({ route, label: '화면' })).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
    window.sessionStorage.setItem('egov.screen-handoff.v1:menu-add-screen', JSON.stringify({ route, label: '화면', at: Date.now() }));
    render(<ScreenProbe />);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
  });

  it('돌아갈 곳을 함께 넘기고 받는다 — 쿼리가 붙은 내부 경로도 받는다', () => {
    const returnTo = { route: '/admin/community/boards/master/BBSMSTR_000000000001?tab=access', label: '게시판 공개 준비로 돌아가기' };
    expect(isHandOffReturnRoute(returnTo.route)).toBe(true);
    expect(handOffScreen({ route: '/admin/community/boards/select-board-list?bbsId=BBSMSTR_000000000001', label: '자료실', returnTo })).toBe(true);
    render(<ScreenReturnProbe />);
    expect(screen.getByText(`/admin/community/boards/select-board-list?bbsId=BBSMSTR_000000000001 돌아갈 곳:${returnTo.label}@${returnTo.route}`)).toBeInTheDocument();
  });

  it.each([
    { route: '//evil.invalid/x', label: '돌아가기' },
    { route: 'https://evil.invalid/x', label: '돌아가기' },
    { route: '/admin/x#top', label: '돌아가기' },
    { route: '/admin/../login', label: '돌아가기' },
    { route: '/admin/x', label: '' },
    { route: '/admin/x', label: '가'.repeat(41) },
  ])('형식이 틀린 돌아갈 곳(%o)은 넘기지 않는다', (returnTo) => {
    expect(handOffScreen({ route: '/note', label: '쪽지', returnTo })).toBe(false);
    expect(handOffMenuFocus({ menuSn: 2040000, returnTo })).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('저장된 돌아갈 곳이 틀리면 인계는 받되 돌아갈 곳은 버린다', () => {
    window.sessionStorage.setItem('egov.screen-handoff.v1:menu-add-screen',
      JSON.stringify({ route: '/note', label: '쪽지', returnTo: { route: '//evil.invalid', label: '돌아가기' }, at: Date.now() }));
    render(<ScreenReturnProbe />);
    expect(screen.getByText('/note 돌아갈 곳:없음')).toBeInTheDocument();
  });

  it('형식이 틀린 값과 사용자 인계는 화면 인계로 받지 않는다 — 두 인계는 서로 덮지 않는다', () => {
    handOffTarget('authority-user', { id: 'E1', loginId: 'kim', name: '김' });
    window.sessionStorage.setItem('egov.screen-handoff.v1:menu-add-screen', JSON.stringify({ route: '/note', label: 3, at: Date.now() }));
    render(<><ScreenProbe /><Probe /></>);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
    expect(screen.getByText('김:kim')).toBeInTheDocument();
    act(() => { handOffScreen({ route: '/note', label: '쪽지' }); });
    expect(screen.getByText('쪽지:/note')).toBeInTheDocument();
    act(() => clearTargetHandoff('authority-user'));
    expect(screen.getByText('쪽지:/note')).toBeInTheDocument();
  });
});

/** [2026-10-23 ADR-0040 결정 8] 게시판 운영 화면 → 메뉴 관리. 연결된 메뉴를 고른 상태로 연다. 저장 키·형식 검사는 따로다. */
describe('메뉴 인계(menu-focus)', () => {
  afterEach(() => { vi.useRealTimers(); window.sessionStorage.clear(); });

  it('넘긴 메뉴 번호를 받고, 받은 화면이 지우면 사라진다 — URL 은 건드리지 않는다', () => {
    const before = window.location.href;
    expect(handOffMenuFocus({ menuSn: 2040000 })).toBe(true);
    render(<MenuFocusProbe />);
    expect(screen.getByText('메뉴:2040000')).toBeInTheDocument();
    act(() => clearMenuFocusHandoff());
    expect(screen.getByText('메뉴 없음')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('유효 시간이 지난 메뉴 인계는 받지 않는다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'));
    handOffMenuFocus({ menuSn: 2040000 });
    vi.setSystemTime(new Date(Date.now() + HANDOFF_TTL_MS + 1));
    render(<MenuFocusProbe />);
    expect(screen.getByText('메뉴 없음')).toBeInTheDocument();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('양의 정수가 아닌 메뉴 번호(%s)는 넘기지 않는다', (menuSn) => {
    expect(handOffMenuFocus({ menuSn })).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
  });

  it.each([
    { menuSn: '12', at: 1 }, { menuSn: 0, at: 1 }, { menuSn: -1, at: 1 }, { menuSn: 1.5, at: 1 }, { menuSn: 12 }, { at: 1 },
  ])('형식이 틀린 값(%o)은 받지 않는다', (value) => {
    window.sessionStorage.setItem('egov.menu-focus-handoff.v1:menu-focus', JSON.stringify({ ...value, at: 'at' in value ? Date.now() : undefined }));
    render(<MenuFocusProbe />);
    expect(screen.getByText('메뉴 없음')).toBeInTheDocument();
  });

  it('저장소에 쓰지 못하면 false 이고 이전 메뉴 인계도 남기지 않는다', () => {
    expect(handOffMenuFocus({ menuSn: 9030140 })).toBe(true);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    let handedOff: boolean;
    try {
      handedOff = handOffMenuFocus({ menuSn: 2040000 });
    } finally {
      setItem.mockRestore();
    }
    expect(handedOff).toBe(false);
    render(<MenuFocusProbe />);
    expect(screen.getByText('메뉴 없음')).toBeInTheDocument();
  });

  it('돌아갈 곳을 함께 넘기고 받는다(ADR-0043)', () => {
    const returnTo = { route: '/admin/community/boards/master/BBSMSTR_000000000001?tab=access', label: '게시판 공개 준비로 돌아가기' };
    expect(handOffMenuFocus({ menuSn: 2040000, returnTo })).toBe(true);
    render(<MenuFocusProbe />);
    expect(screen.getByText(`메뉴:2040000 돌아갈 곳:${returnTo.label}@${returnTo.route}`)).toBeInTheDocument();
  });

  it('사용자·화면 인계와 서로 덮지 않는다', () => {
    handOffTarget('authority-user', { id: 'E1', loginId: 'kim', name: '김' });
    handOffScreen({ route: '/note', label: '쪽지' });
    handOffMenuFocus({ menuSn: 2040000 });
    render(<><MenuFocusProbe /><ScreenProbe /><Probe /></>);
    expect(screen.getByText('메뉴:2040000')).toBeInTheDocument();
    expect(screen.getByText('쪽지:/note')).toBeInTheDocument();
    expect(screen.getByText('김:kim')).toBeInTheDocument();
    act(() => clearMenuFocusHandoff());
    expect(screen.getByText('쪽지:/note')).toBeInTheDocument();
    expect(screen.getByText('김:kim')).toBeInTheDocument();
  });
});
