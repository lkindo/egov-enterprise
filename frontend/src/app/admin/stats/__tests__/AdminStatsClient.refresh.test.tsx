import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP V9] 새로고침 표시는 실제 재조회에 묶인다.
 *
 * 종전에는 router.refresh() 를 부른 뒤 800ms 타이머로 스피너를 껐다 — 재조회가 느리면 끝나기 전에
 * 멈춰 '완료' 로 보였고, 빠르면 이미 끝났는데도 돌았다. 표시는 전환(transition)의 대기 상태가 소유한다.
 */
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/stats',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/ui/standard-chart-wrapper', () => ({
  StandardChartWrapper: () => <div data-testid="connect-chart" />,
}));

import AdminStatsClient from '../AdminStatsClient';

describe('AdminStatsClient 새로고침', () => {
  afterEach(() => vi.useRealTimers());

  it('🚨 새로고침은 서버 재조회를 부르고 시간을 재는 가짜 타이머를 두지 않는다', () => {
    vi.useFakeTimers();
    render(<AdminStatsClient initialSummary={null} initialConnectData={[]} />);

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
