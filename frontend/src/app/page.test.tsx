import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedDashboardClient from './UnifiedDashboardClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test', name: 'Test User', role: 'ROLE_USER' },
    loading: false,
    checkAuth: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    button: ({ children, className, ...props }: any) => <button className={className} {...props}>{children}</button>,
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...props}>{children}</h1>,
    h4: ({ children, className, ...props }: any) => <h4 className={className} {...props}>{children}</h4>,
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DashboardPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = (props: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedDashboardClient {...props} />
      </QueryClientProvider>
    );
  };

  it('renders dashboard data correctly', async () => {
    const props = {
      initialLeave: { remndrYrycCo: 12.5 },
      initialNotiList: [{ nttId: 1, nttSj: '공지사항 테스트' }],
      initialTaskList: [{ nttId: 2, nttSj: '할일 테스트' }],
      pendingApprovalCount: 5
    };

    renderDashboard(props);

    await waitFor(() => {
      expect(screen.getByText(/공지사항 테스트/)).toBeInTheDocument();
      expect(screen.getByText(/할일 테스트/)).toBeInTheDocument();
      expect(screen.getByText(/12.5/)).toBeInTheDocument();
    });
  });

  it('renders accessible elements', async () => {
    const props = {
      initialLeave: { remndrYrycCo: 10 },
      initialNotiList: [],
      initialTaskList: [],
      pendingApprovalCount: 0
    };

    renderDashboard(props);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/휴가 신청/)).toBeInTheDocument();
    });
  });

  it('handles empty states gracefully', async () => {
    const props = {
      initialLeave: null,
      initialNotiList: [],
      initialTaskList: [],
      pendingApprovalCount: 0
    };

    renderDashboard(props);

    await waitFor(() => {
      expect(screen.getAllByText(/No data available/i).length).toBeGreaterThan(0);
    });
  });
});
