import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ObservabilityPage from '../page';

// Mock dynamic import
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-topology">Mock Topology</div>
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
  it('renders correctly with premium elements', () => {
    renderWithQueryClient(<ObservabilityPage />);

    expect(screen.getByText(/시스템 통합 관제/)).toBeInTheDocument();
    expect(screen.getByText(/글로벌 트래픽/)).toBeInTheDocument();
    expect(screen.getByText(/시스템 지연시간/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-topology')).toBeInTheDocument();
  });
});
