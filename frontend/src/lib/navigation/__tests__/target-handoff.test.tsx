import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HANDOFF_TTL_MS, clearScreenHandoff, clearTargetHandoff, handOffScreen, handOffTarget, isHandOffScreenRoute,
  useScreenHandoff, useTargetHandoff,
} from '../target-handoff';

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
    'admin/system/menus', '//evil.invalid/admin', 'https://evil.invalid/admin', '/admin/system/menus?tab=GROUPS',
    '/admin/system/menus#top', '/smart-toolkit/dept-job/[id]', '/admin/../login', '/admin/system/menus ',
  ])('메뉴에 연결할 수 없는 경로(%s)는 넘기지도 받지도 않는다', (route) => {
    expect(isHandOffScreenRoute(route)).toBe(false);
    expect(handOffScreen({ route, label: '화면' })).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
    window.sessionStorage.setItem('egov.screen-handoff.v1:menu-add-screen', JSON.stringify({ route, label: '화면', at: Date.now() }));
    render(<ScreenProbe />);
    expect(screen.getByText('화면 없음')).toBeInTheDocument();
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
