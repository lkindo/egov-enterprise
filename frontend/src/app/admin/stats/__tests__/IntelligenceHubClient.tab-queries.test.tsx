import { render, waitFor } from '@testing-library/react';
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
  getSurveyList: vi.fn(),
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
vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: { getSurveyList: services.getSurveyList },
}));
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
  });

  it('자료 이용 탭을 열면 자료 이용 통계를 부른다', async () => {
    renderHub('DATA_USAGE');
    await waitFor(() => expect(services.getDataUsageStats).toHaveBeenCalledTimes(1));
  });
});
