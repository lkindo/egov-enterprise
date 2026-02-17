
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

// Mock useAuth to return null user
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null, // Simulate logged out state
    loading: false,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock other components to avoid rendering issues
vi.mock('./components/dashboard/BannerSlider', () => ({
  BannerSlider: () => null,
}));
vi.mock('./components/dashboard/PopupManager', () => ({
  PopupManager: () => null,
}));

describe('DashboardPage - Welcome Screen', () => {
  beforeEach(() => {
    // Mock global fetch for health check
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as any;
  });

  it('renders "Login" button as a link when user is not logged in', async () => {
    render(<DashboardPage />);

    // Wait for the API check to complete and the welcome screen to appear
    await waitFor(() => {
        expect(screen.getByText('전자정부 현대화 플랫폼')).toBeInTheDocument();
    });

    // Check for "Login" link
    const loginLink = screen.getByRole('link', { name: /로그인 하기/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');

    // Ensure it's not a button
    const loginButton = screen.queryByRole('button', { name: /로그인 하기/i });
    expect(loginButton).not.toBeInTheDocument();
  });
});
