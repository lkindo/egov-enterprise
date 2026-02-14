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
      // Allow other URLs to fail gracefully or return mock data
      return Promise.resolve({ data: { success: false } });
    });

    render(<DashboardPage />);

    // Verify dashboard data is rendered
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Notice 1')).toBeInTheDocument();
    });

    // Verify API calls
    expect(client.get).toHaveBeenCalledWith('/dashboard');

    // Check that QuickLinks are rendered as links
    const quickLinks = screen.getAllByRole('link', { name: /사용자 관리|공지사항|부서일정|시스템 설정/ });
    expect(quickLinks.length).toBeGreaterThan(0);
    expect(quickLinks[0]).toHaveAttribute('href');
  });

  it('handles API errors gracefully', async () => {
    // Mock API failures
    (client.get as Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      // Should still render the static parts
      expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
      // Should show empty states (DashboardListCard renders '데이터가 없습니다.')
      const emptyStates = screen.getAllByText('데이터가 없습니다.');
      expect(emptyStates.length).toBeGreaterThanOrEqual(2);
    });
  });
});
