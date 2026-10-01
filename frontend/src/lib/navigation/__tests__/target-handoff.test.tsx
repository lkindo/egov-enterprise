import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HANDOFF_TTL_MS, clearTargetHandoff, handOffTarget, useTargetHandoff } from '../target-handoff';

function Probe() {
  const target = useTargetHandoff('authority-user');
  return <p>{target ? `${target.name}:${target.loginId}` : '없음'}</p>;
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
});
