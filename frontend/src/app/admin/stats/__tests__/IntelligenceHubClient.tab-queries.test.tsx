import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP B5 F10] 탭이 쓰지 않는 통계는 조회하지 않는다.
 *
 * 자료 이용 통계는 요약 카드가 쓰지 않는 미수집 축인데 어느 탭을 열어도 불렀다. 요약 카드가 쓰는 사용자·접속
 * 통계는 탭과 무관하게 계속 조회해야 한다(비활성 탭에서 값이 비어 '0' 으로 보이는 것을 막는다).
 */
const services = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getBbsStats: vi.fn(),
  getConnectStats: vi.fn(),
  getDataUsageStats: vi.fn(),
  getReportStats: vi.fn(),
  /* reusable-base:survey:start */
  getSurveyList: vi.fn(),
  /* reusable-base:survey:end */
}));
const params = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/stats',
  useSearchParams: () => params.value,
}));
vi.mock('@/services/foundation/system/StatsAdminService', () => ({
  statsAdminService: {
    getUserStats: services.getUserStats,
    getBbsStats: services.getBbsStats,
    getConnectStats: services.getConnectStats,
    getDataUsageStats: services.getDataUsageStats,
    getReportStats: services.getReportStats,
  },
}));
/* reusable-base:survey:start */
vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: { getSurveyList: services.getSurveyList },
}));
/* reusable-base:survey:end */
vi.mock('@/app/components/ui/observability-charts', () => ({
  SafeResponsiveContainer: () => <div data-testid="chart" />,
}));

import IntelligenceHubClient from '../IntelligenceHubClient';

function renderHub(tab: string) {
  params.value = new URLSearchParams(`tab=${tab}`);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><IntelligenceHubClient /></QueryClientProvider>);
}

describe('통계 허브 탭별 조회', () => {
  beforeEach(() => {
    Object.values(services).forEach(fn => fn.mockReset().mockResolvedValue([]));
  });

  it('요약 카드용 사용자·접속 통계는 늘 부르고, 자료 이용 통계는 그 탭에서만 부른다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getConnectStats).toHaveBeenCalled());
    expect(services.getUserStats).toHaveBeenCalled();
    expect(services.getDataUsageStats).not.toHaveBeenCalled();
    expect(screen.getByText('최근 1개월 성공 로그인 합계')).toBeInTheDocument();
  });

  /* reusable-base:collaboration:start */
  it('자료 이용 탭을 열면 자료 이용 통계를 부른다', async () => {
    renderHub('DATA_USAGE');
    await waitFor(() => expect(services.getDataUsageStats).toHaveBeenCalledTimes(1));
  });
  /* reusable-base:collaboration:end */

  it('[DIP B5 F6] 기간을 고르지 않으면 서버 기본값으로 부르고 그 사실을 말한다 — 전체 프리셋은 없다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getUserStats).toHaveBeenCalledWith(undefined));
    expect(services.getConnectStats).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('집계 구간: 최근 1개월(기간을 고르지 않으면 서버 기본값)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
  });

  it('[DIP B5 F6] 기간 프리셋을 고르면 그 기간으로 다시 부르고 적용 구간을 보인다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getUserStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));

    await waitFor(() => expect(services.getUserStats).toHaveBeenLastCalledWith(
      { fromDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), toDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    const { fromDate, toDate } = services.getUserStats.mock.lastCall![0];
    expect(fromDate <= toDate).toBe(true);
    expect(services.getConnectStats).toHaveBeenLastCalledWith({ fromDate, toDate });
    expect(screen.getByText(`집계 구간: ${fromDate} ~ ${toDate}`)).toBeInTheDocument();
    expect(screen.getByText('선택 기간 성공 로그인 합계')).toBeInTheDocument();
    expect(screen.queryByText('최근 1개월 성공 로그인 합계')).not.toBeInTheDocument();
  });

  it('[DIP B5 F6] 한쪽만 고른 기간은 보내지 않고 서버 기본값을 집계한다', async () => {
    renderHub('SYSTEM_STATS');
    await waitFor(() => expect(services.getUserStats).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('집계 기간 시작일'), { target: { value: '2026-09-01' } });

    expect(await screen.findByText('시작일과 종료일을 모두 입력해야 기간이 적용됩니다.')).toBeInTheDocument();
    expect(services.getUserStats).toHaveBeenLastCalledWith(undefined);
  });
});
