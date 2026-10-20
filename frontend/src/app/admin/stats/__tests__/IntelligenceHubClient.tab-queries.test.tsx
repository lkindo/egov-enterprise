import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP B5 F10] 탭이 쓰지 않는 통계는 조회하지 않는다.
 *
 * [2026-10-20] 요약이 탭마다 그 탭의 계열이 되어(A7), 사용자·접속 통계도 그 탭이 열렸을 때만 부른다 — 종전에는 모든 탭의 요약
 * 카드가 둘을 늘 불렀다. 기간은 고르지 않으면 서버 기본값이고, 양쪽을 다 고른 올바른 기간만 보낸다.
 *
 * [허브 분해 H4] 셸 전용 시험이다 — 기능 레지스트리를 빈 배열로 대역한다. 기능 탭의 조회 조건은 게시판 기여 시험이 본다
 * (stats/board/__tests__/BoardStatsTabs.equivalence.test.tsx).
 */
const services = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getBbsStats: vi.fn(),
  getConnectStats: vi.fn(),
  getDataUsageStats: vi.fn(),
}));
const params = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/stats/screen',
  useSearchParams: () => params.value,
}));
vi.mock('@/services/foundation/system/StatsAdminService', () => ({
  statsAdminService: {
    getUserStats: services.getUserStats,
    getBbsStats: services.getBbsStats,
    getConnectStats: services.getConnectStats,
    getDataUsageStats: services.getDataUsageStats,
  },
}));
vi.mock('@/app/components/ui/observability-charts', () => ({
  SafeResponsiveContainer: () => <div data-testid="chart" />,
}));
vi.mock('@/extensions/generated-stats-panels', () => ({ statsPanels: [] }));

import IntelligenceHubClient from '../IntelligenceHubClient';

function renderHub(defaultTab: string | undefined, query = '') {
  params.value = new URLSearchParams(query);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><IntelligenceHubClient defaultTab={defaultTab} /></QueryClientProvider>);
}

describe('통계 허브 탭별 조회', () => {
  beforeEach(() => {
    Object.values(services).forEach(fn => fn.mockReset().mockResolvedValue([]));
    services.getUserStats.mockResolvedValue({ inqCnt: [], crtCnt: [], mdfcnCnt: [], delCnt: [] });
  });

  it('시스템 활성 탭은 성공 로그인만 부르고, 사용자 활동·기능 통계는 부르지 않는다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getConnectStats).toHaveBeenCalledWith(undefined));
    expect(services.getUserStats).not.toHaveBeenCalled();
    expect(services.getDataUsageStats).not.toHaveBeenCalled();
    expect(services.getBbsStats).not.toHaveBeenCalled();
  });

  it('사용자 통계 탭은 사용자 활동만 부른다', async () => {
    renderHub('USER_STATS');
    await waitFor(() => expect(services.getUserStats).toHaveBeenCalledWith(undefined));
    expect(services.getConnectStats).not.toHaveBeenCalled();
  });

  it('이 구성에 없는 탭 값(?tab=DATA_USAGE)은 무시하고 그 라우트의 탭을 열며 그 조회를 하지 않는다', async () => {
    renderHub('USER_STATS', 'tab=DATA_USAGE');
    await waitFor(() => expect(services.getUserStats).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('사용자 통계 분석');
    expect(services.getDataUsageStats).not.toHaveBeenCalled();
  });

  it('개요 자료 없이 통계 개요를 요청하면(하위 라우트) 성공 로그인 탭을 연다 — 개요는 서버가 읽은 값으로만 그린다', async () => {
    renderHub(undefined);
    await waitFor(() => expect(services.getConnectStats).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('시스템 활성 지표');
  });

  it('[DIP B5 F6] 기간 프리셋을 고르면 그 기간으로 다시 부르고 적용 구간을 보인다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getConnectStats).toHaveBeenCalledWith(undefined));

    fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));

    await waitFor(() => expect(services.getConnectStats).toHaveBeenLastCalledWith(
      { fromDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), toDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    const { fromDate, toDate } = services.getConnectStats.mock.lastCall![0];
    expect(fromDate <= toDate).toBe(true);
    expect(screen.getByTestId('report-basis')).toHaveTextContent(`집계 구간: ${fromDate} ~ ${toDate}`);
  });

  it('[DIP B5 F6] 한쪽만 고른 기간은 보내지 않고 서버 기본값을 집계한다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getConnectStats).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('집계 기간 시작일'), { target: { value: '2026-09-01' } });

    expect(await screen.findByText('시작일과 종료일을 모두 입력해야 기간이 적용됩니다.')).toBeInTheDocument();
    expect(services.getConnectStats).toHaveBeenLastCalledWith(undefined);
  });
});
