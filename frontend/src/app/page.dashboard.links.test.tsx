
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './page';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className} data-testid="mock-link">
      {children}
    </a>
  ),
}));

// Mock useAuth to return a logged in user
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    loading: false,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

// Mock services
vi.mock('@/services/vacationService', () => ({
  vacationService: {
    getMyYearlyLeave: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  },
}));

// Mock other components
vi.mock('./components/dashboard/BannerSlider', () => ({
  BannerSlider: () => null,
}));
vi.mock('./components/dashboard/PopupManager', () => ({
  PopupManager: () => null,
}));
vi.mock('./components/ui/standard-chart-wrapper', () => ({
    StandardChartWrapper: () => null,
}));


describe('DashboardPage - Logged In Links', () => {
  beforeEach(() => {
    // Mock global fetch for health check
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as any;
  });

  it('renders "Vacation" and "Write Post" buttons as links', async () => {
    render(<DashboardPage />);

    // Wait for the dashboard to load
    await waitFor(() => {
        expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
    });

    // Check "Vacation" link
    const vacationLink = screen.getByRole('link', { name: /휴가 신청/i });
    expect(vacationLink).toHaveAttribute('href', '/cop/smt/vct');

    // Check "Write Post" link
    const writePostLink = screen.getByRole('link', { name: /게시글 작성/i });
    expect(writePostLink).toHaveAttribute('href', '/cop/bbs');

    // Ensure they are not buttons
    const vacationButton = screen.queryByRole('button', { name: /휴가 신청/i });
    expect(vacationButton).not.toBeInTheDocument();

    const writePostButton = screen.queryByRole('button', { name: /게시글 작성/i });
    expect(writePostButton).not.toBeInTheDocument();
  });
});
