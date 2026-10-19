import type React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-19] 통계 차트의 시간축은 왼쪽(과거)에서 오른쪽(최근)으로 흐른다.
 *
 * 차트는 받은 배열 순서대로 X축을 놓는다. 게시물·자료 이용 집계(게시판 기여)는 서버가 최신순으로 줘서 '콘텐츠 지표' 탭의 시간이
 * 거꾸로 흘렀다. 셸이 그리기 전에 날짜 오름차순으로 맞추므로, 계열이 어느 순서로 오든 차트와 내보내기가 같은 시간 순서다.
 * 셸 전용 시험이다 — 기능 기여는 빈 배열로 대역하고, 성공 로그인 계열에 최신순 응답을 넣어 그 불변식을 본다.
 */
const services = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getConnectStats: vi.fn(),
}));
const exported = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/stats',
  useSearchParams: () => new URLSearchParams('tab=SYSTEM_STATS'),
}));
vi.mock('@/services/foundation/system/StatsAdminService', () => ({
  statsAdminService: { getUserStats: services.getUserStats, getConnectStats: services.getConnectStats },
}));
vi.mock('@/extensions/generated-stats-panels', () => ({ statsPanels: [] }));
// 크기를 재는 컨테이너 대신 차트를 그대로 그린다. AreaChart 는 받은 순서대로 점을 놓으므로 그 순서를 목록으로 보인다.
vi.mock('@/app/components/ui/observability-charts', () => ({
  SafeResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
}));
vi.mock('recharts', () => ({
  AreaChart: ({ data }: { data: { statsDate?: string }[] }) => (
    <ol aria-label="차트 X축 순서">{data.map((row, index) => <li key={index}>{row.statsDate}</li>)}</ol>
  ),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: ({ data }: { data: unknown }) => {
    exported.data = data;
    return <button type="button">엑셀 다운로드</button>;
  },
}));

import IntelligenceHubClient from '../IntelligenceHubClient';

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><IntelligenceHubClient /></QueryClientProvider>);
}

describe('통계 차트 시간축', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exported.data = undefined;
    services.getUserStats.mockResolvedValue([]);
  });

  it('최신순으로 온 계열도 과거에서 최근 순서로 그리고 같은 순서로 내보낸다', async () => {
    services.getConnectStats.mockResolvedValue([
      { statsDate: '2026-10-03', statsCo: 3 },
      { statsDate: '2026-10-01', statsCo: 1 },
      { statsDate: '2026-10-02', statsCo: 2 },
    ]);
    renderHub();

    const axis = await screen.findByRole('list', { name: '차트 X축 순서' });
    expect(within(axis).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    await waitFor(() => expect(exported.data).toEqual([
      { statsDate: '2026-10-01', statsCo: 1 },
      { statsDate: '2026-10-02', statsCo: 2 },
      { statsDate: '2026-10-03', statsCo: 3 },
    ]));
  });

  it('저장 형식(yyyyMMdd) 날짜도 같은 규칙으로 줄 세우고, 날짜 없는 행은 뒤에 둔다', async () => {
    services.getConnectStats.mockResolvedValue([
      { statsCo: 9 },
      { statsDate: '20261102', statsCo: 2 },
      { statsDate: '20261031', statsCo: 1 },
    ]);
    renderHub();

    const axis = await screen.findByRole('list', { name: '차트 X축 순서' });
    expect(within(axis).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['20261031', '20261102', '']);
  });
});
