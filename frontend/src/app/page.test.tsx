import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { vi, type Mock } from 'vitest';
import client from '@/lib/api/client';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
  }),
}));

// Mock the API client
vi.mock('@/lib/api/client', () => {
  const mockClient = {
    get: vi.fn(),
    interceptors: {
      response: { use: vi.fn() }
    }
  };
  return { default: mockClient };
});

// Mock useToast
vi.mock('./components/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard data correctly', async () => {
    // Mock API responses
    (client.get as Mock).mockImplementation((url: string) => {
      if (url === '/dashboard') {
        return Promise.resolve({
          data: {
            success: true,
            taskList: [
              { nttId: 1, nttSj: 'Task 1', frstRegisterNm: 'User A', frstRegisterPnttmStr: '2023-01-01' }
            ],
            notiList: [
              { nttId: 2, nttSj: 'Notice 1', frstRegisterNm: 'Admin', frstRegisterPnttmStr: '2023-01-01' }
            ]
          }
        });
      }
      if (url.includes('/vacations/yearly-leaves/my')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              remndrYrycCo: 15
            }
          }
        });
      }
      // Also mock health check which is called first
      if (url === '/auth/me') {
          return Promise.resolve({});
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    // We need to mock fetch for /api/v1/health call inside useEffect
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })
    ) as Mock;

    render(<DashboardPage />);

    // Verify dashboard data is rendered
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Notice 1')).toBeInTheDocument();
      // Verify remaining leave is rendered (15 days)
      expect(screen.getByText(/15 일/)).toBeInTheDocument();
    });

    // Verify API calls
    expect(client.get).toHaveBeenCalledWith('/dashboard');
    // We can't easily verify the vacation call arguments because of dynamic year,
    // but checking that '15 일' is rendered proves it was called and worked.
  });

  it('handles API errors gracefully', async () => {
    // Mock API failures
    (client.get as Mock).mockRejectedValue(new Error('API Error'));

    // Also mock fetch for health check
    global.fetch = vi.fn(() => Promise.reject('Network Error')) as Mock;

    render(<DashboardPage />);

    await waitFor(() => {
       // Should show error state because API status check failed or dashboard load failed
       // The component shows "서버 연결에 실패했습니다" if health check fails
       // Or "대시보드 데이터를 불러올 수 없습니다" if dashboard load fails.

       // Since we mocked fetch to reject, apiStatus will be 'error'.
       // But wait, checkApiStatus tries client.get('/auth/me') if fetch fails.
       // And client.get is mocked to reject.
       // So apiStatus will be 'error'.
       expect(screen.getByText(/서버 연결에 실패했습니다/)).toBeInTheDocument();
    });
  });
});
