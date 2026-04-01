import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './page';
import client from '@/lib/api/client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Mock Next.js navigation and headers
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock API client
vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock UnifiedDashboardClient
vi.mock('./UnifiedDashboardClient', () => ({
  default: ({ initialNotiList, pendingApprovalCount }: any) => (
    <div data-testid="dashboard-client">
      <div>Notis: {initialNotiList.length}</div>
      <div>Pending: {pendingApprovalCount}</div>
    </div>
  )
}));

describe('DashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login if no access token', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as any);

    try {
      await DashboardPage();
    } catch (e) {
      // Catch redirect throw
    }

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('renders dashboard with data if authenticated', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);

    vi.mocked(client.get).mockResolvedValue({
      notiList: [{ nttId: 1, nttSj: 'Mock Noti' }],
      taskList: [],
      pendingApprovalCount: 10
    });

    const result = await DashboardPage();
    render(result);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText('Notis: 1')).toBeInTheDocument();
    expect(screen.getByText('Pending: 10')).toBeInTheDocument();
  });
});
