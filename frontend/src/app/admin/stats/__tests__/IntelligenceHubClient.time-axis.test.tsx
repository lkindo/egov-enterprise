import type React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 통계 차트의 시간축은 왼쪽(과거)에서 오른쪽(최근)으로 흐르고, 차트·원본 표·반출이 같은 순서다.
 *
 * [2026-10-20] 순서는 서버가 소유한다 — 모든 시계열을 `{date, value}` 날짜 오름차순으로 내고 측정하는 계열은 빈 날을 0 으로 채운다
 * (ReportStatsServiceTest·StatisticsCompositionEquivalenceTest 가 본다). 종전에는 게시물 집계가 최신순으로 와서 셸이 그리기 전에
 * 정렬했다(2026-10-19). 이제 셸은 받은 순서 그대로 그리고, 축 눈금은 'MM-DD' 다(연도는 집계 구간이 소유한다). 셸 전용 시험이다 —
 * 기능 기여는 빈 배열로 대역하고 성공 로그인 계열로 본다.
 */
const services = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getConnectStats: vi.fn(),
}));
const exported = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/stats/screen',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/services/foundation/system/StatsAdminService', () => ({
  statsAdminService: { getUserStats: services.getUserStats, getConnectStats: services.getConnectStats },
}));
vi.mock('@/extensions/generated-stats-panels', () => ({ statsPanels: [] }));
// 크기를 재는 컨테이너 대신 차트를 그대로 그린다. AreaChart 는 받은 순서대로 점을 놓으므로 그 순서를 목록으로 보인다.
vi.mock('@/app/components/ui/observability-charts', () => ({
  SafeResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
}));
vi.mock('recharts', () => {
  const Nothing = () => null;
  return {
    AreaChart: ({ data }: { data: { name?: string }[] }) => (
      <ol aria-label="차트 X축 순서">{data.map((row, index) => <li key={index}>{row.name}</li>)}</ol>
    ),
    Area: Nothing, XAxis: Nothing, YAxis: Nothing, CartesianGrid: Nothing, Tooltip: Nothing, Legend: Nothing,
    BarChart: Nothing, Bar: Nothing, LineChart: Nothing, Line: Nothing, PieChart: Nothing, Pie: Nothing, Cell: Nothing,
  };
});
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: ({ data }: { data: unknown }) => {
    exported.data = data;
    return <button type="button">엑셀 다운로드</button>;
  },
}));

import IntelligenceHubClient from '../IntelligenceHubClient';

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><IntelligenceHubClient defaultTab="SYSTEM_STATS" /></QueryClientProvider>);
}

describe('통계 차트 시간축', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exported.data = undefined;
  });

  it('서버의 오름차순을 그대로 그리고 축 눈금은 MM-DD 이며, 원본 표·반출도 같은 순서다', async () => {
    services.getConnectStats.mockResolvedValue([
      { date: '2026-09-30', value: 1 },
      { date: '2026-10-01', value: 0 },
      { date: '2026-10-02', value: 2 },
    ]);
    renderHub();

    const axis = await screen.findByRole('list', { name: '차트 X축 순서' });
    expect(within(axis).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['09-30', '10-01', '10-02']);
    const table = within(screen.getByTestId('report-source-table')).getByRole('table');
    const dates = within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]?.textContent);
    expect(dates).toEqual(['2026-09-30', '2026-10-01', '2026-10-02']);
    await waitFor(() => expect(exported.data).toEqual([
      { date: '2026-09-30', value: 1 },
      { date: '2026-10-01', value: 0 },
      { date: '2026-10-02', value: 2 },
    ]));
  });

  it('계열이 비면 차트를 그리지 않고 표가 빈 결과를 말한다', async () => {
    services.getConnectStats.mockResolvedValue([]);
    renderHub();

    expect(await screen.findByText('선택한 기간에 집계된 통계가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '차트 X축 순서' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '일자별 추이' })).not.toBeInTheDocument();
  });
});
