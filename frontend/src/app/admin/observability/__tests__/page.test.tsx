import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import { server } from '@/mocks/server';
import ObservabilityPage from '../page';

// Mock dynamic import
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-topology">Mock Topology</div>
}));

vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: ({ data }: { data: Array<{ live: string }> }) => (
    <output data-testid="export-live-state">{data[0]?.live}</output>
  ),
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

/**
 * 액추에이터 폴링이 수기 setInterval → TanStack Query 로 이관되면서
 * 이 화면은 QueryClientProvider 하위에서만 렌더된다(실제 앱은 app/providers.tsx 가 제공).
 */
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ObservabilityPage', () => {
  it('renders correctly with premium elements', async () => {
    server.use(
      http.get('*/actuator/health', () => new HttpResponse(null, { status: 503 })),
      http.get('*/actuator/metrics/:name', () => new HttpResponse(null, { status: 503 })),
    );

    renderWithQueryClient(<ObservabilityPage />);

    expect(screen.getByText(/시스템 통합 관제/)).toBeInTheDocument();
    expect(screen.getByText(/글로벌 트래픽/)).toBeInTheDocument();
    expect(screen.getByText(/시스템 지연시간/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-topology')).toBeInTheDocument();
    expect(await screen.findByTestId('export-live-state')).toHaveTextContent('미가용');
  });

  it('403 health 응답을 live 실측으로 오인하지 않는다', async () => {
    const healthRequest = vi.fn(() => HttpResponse.json(
      { status: 'DOWN', message: 'Access denied' },
      { status: 403 },
    ));
    server.use(
      http.get('*/actuator/health', healthRequest),
      http.get('*/actuator/metrics/:name', () => HttpResponse.json(
        { status: 403, message: 'Access denied' },
        { status: 403 },
      )),
    );

    renderWithQueryClient(<ObservabilityPage />);

    const refresh = screen.getByRole('button', { name: /지표 새로고침/ });
    await waitFor(() => {
      expect(healthRequest).toHaveBeenCalled();
      expect(refresh).toBeEnabled();
      expect(screen.getByTestId('export-live-state')).toHaveTextContent('미가용');
    });
  });

  it('정상 actuator 응답은 계산된 지표와 live 실측 상태를 보존한다', async () => {
    server.use(
      http.get('*/actuator/health', () => HttpResponse.json({ status: 'UP' })),
      http.get('*/actuator/metrics/system.cpu.usage', () => HttpResponse.json({
        name: 'system.cpu.usage',
        measurements: [{ statistic: 'VALUE', value: 0.125 }],
      })),
      http.get('*/actuator/metrics/process.uptime', () => HttpResponse.json({
        name: 'process.uptime',
        measurements: [{ statistic: 'VALUE', value: 50 }],
      })),
      http.get('*/actuator/metrics/http.server.requests', ({ request }) => {
        const isErrorMetric = new URL(request.url).searchParams.has('tag');
        return HttpResponse.json({
          name: 'http.server.requests',
          measurements: isErrorMetric
            ? [{ statistic: 'COUNT', value: 5 }]
            : [
                { statistic: 'COUNT', value: 100 },
                { statistic: 'TOTAL_TIME', value: 20 },
              ],
        });
      }),
    );

    renderWithQueryClient(<ObservabilityPage />);

    await waitFor(() => {
      expect(screen.getByTestId('export-live-state')).toHaveTextContent('실측');
      expect(screen.getByText('2.00')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('5.00')).toBeInTheDocument();
      expect(screen.getByText('12.5')).toBeInTheDocument();
    });
  });
});
