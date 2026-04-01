import React from 'react';
import { render, screen } from '@testing-library/react';
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
  default: ({ initialNotiList, initialTaskList, pendingApprovalCount }: any) => (
    <div data-testid="dashboard-client">
      <div data-testid="noti-count">공지사항: {initialNotiList.length}개</div>
      <div data-testid="task-count">할일: {initialTaskList.length}개</div>
      <div>결재대기: {pendingApprovalCount}건</div>
      {initialTaskList.length > 0 && <div>할일 테스트</div>}
    </div>
  )
}));

describe('DashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('토큰이 없는 경우 /login으로 리다이렉트됩니다.', async () => {
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

  it('인증된 경우 데이터를 포함한 대시보드를 렌더링합니다.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);

    vi.mocked(client.get).mockResolvedValue({
      notiList: [{ nttId: 1, nttSj: '공지사항 테스트' }],
      taskList: [{ nttId: 2, nttSj: '할일 테스트' }],
      pendingApprovalCount: 10
    });

    const result = await DashboardPage();
    render(result);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText(/할일 테스트/)).toBeInTheDocument();
    expect(screen.getByText(/공지사항: 1개/)).toBeInTheDocument();
    expect(screen.getByText(/결재대기: 10건/)).toBeInTheDocument();
  });
});
