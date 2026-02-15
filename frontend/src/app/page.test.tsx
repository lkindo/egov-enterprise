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
      if (url === '/uss/olp/opm/listOnlinePollManage.do') {
        const today = new Date().toISOString().slice(0, 10);
        return Promise.resolve({
          data: {
            resultList: [
              {
                pollId: 'POLL_001',
                pollNm: 'Active Poll',
                pollBeginDe: today,
                pollEndDe: today
              }
            ]
          }
        });
      }
      if (url.startsWith('/vacations/yearly-leaves/my')) {
        return Promise.resolve({
          data: {
            result: {
              occrrncYear: '2026',
              usid: 'TEST_USER',
              totalVacationDays: 15,
              usedVacationDays: 5,
              remainedVacationDays: 10
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<DashboardPage />);

    // Verify loading state (optional, might happen too fast)
    // await waitFor(() => expect(screen.getByText(/loading/i)).toBeInTheDocument());

    // Verify dashboard data is rendered
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Notice 1')).toBeInTheDocument();
      expect(screen.getByText('Active Poll')).toBeInTheDocument();
    });

    // Verify API calls
    expect(client.get).toHaveBeenCalledWith('/dashboard');
    expect(client.get).toHaveBeenCalledWith('/uss/olp/opm/listOnlinePollManage.do', expect.anything());
  });

  it('handles API errors gracefully', async () => {
    // Mock API failures
    (client.get as Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      // Should still render the static parts
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      // Should show empty states
      expect(screen.getByText('등록된 할일이 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('등록된 공지사항이 없습니다.')).toBeInTheDocument();
    });
  });
});
