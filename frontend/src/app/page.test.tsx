import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedDashboardClient from './UnifiedDashboardClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/services/admin/system/StatsAdminService', () => ({
  statsAdminService: {
    getConnectStats: vi.fn().mockResolvedValue([]),
    getBbsStats: vi.fn().mockResolvedValue([]),
    getUserStats: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
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

// Mock RealTimeDashboard
vi.mock('@/components/features/dashboard/RealTimeDashboard', () => ({
  RealTimeDashboard: () => <div data-testid="real-time-dashboard" />,
}));

// Mock BannerSlider
vi.mock('@/app/components/dashboard/BannerSlider', () => ({
  BannerSlider: () => <div data-testid="banner-slider" />,
}));

// Mock PopupManager
vi.mock('@/app/components/dashboard/PopupManager', () => ({
  PopupManager: () => null,
}));

// Mock ActivityFeed
vi.mock('@/app/components/dashboard/ActivityFeed', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

// Mock dynamic charts
vi.mock('@/app/components/dashboard/DashboardCharts', () => ({
  DashboardVisitorChart: () => <div data-testid="visitor-chart" />,
  DashboardPostChart: () => <div data-testid="post-chart" />,
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
      initialNotiList: [{ nttId: 1, nttSj: '공지사항 테스트' }],
      initialTaskList: [{ nttId: 2, nttSj: '할일 테스트' }],
      pendingApprovalCount: 5
    };

    renderDashboard(props);

    await waitFor(() => {
      expect(screen.getByText(/공지사항 테스트/)).toBeInTheDocument();
      expect(screen.getByText(/할일 테스트/)).toBeInTheDocument();
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
