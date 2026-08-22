import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './page';
import { loadDashboardData } from './dashboard-data';
import client from '@/lib/api/client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Mock Next.js navigation and headers
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
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
  default: ({ dataPromise }: any) => {
    // In Vitest tests, we need to handle the promise resolution for the mock
    const [data, setData] = React.useState<any>(null);
    
    React.useEffect(() => {
      dataPromise.then(setData);
    }, [dataPromise]);

    if (!data) return <div data-testid="loading">로딩 중...</div>;

    return (
      <div data-testid="dashboard-client">
        <div data-testid="noti-count">공지사항: {data.initialNotiList.length}개</div>
        <div data-testid="task-count">할일: {data.initialTaskList.length}개</div>
        <div>결재대기: {data.pendingApprovalCount}건</div>
        {data.initialTaskList.length > 0 && <div>할일 테스트</div>}
      </div>
    );
  }
}));

describe('DashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('토큰이 없는 경우 /login으로 리다이렉트됩니다.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as any);

    await expect(loadDashboardData()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('인증된 경우 데이터를 포함한 대시보드를 렌더링합니다.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);

    vi.mocked(client.get).mockResolvedValue({
      notiList: [{ pstSn: 1, pstTtl: '공지사항 테스트' }],
      taskList: [{ pstSn: 2, pstTtl: '할일 테스트' }],
      pendingApprovalCount: 10
    });

    const result = await DashboardPage();
    render(result);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
      expect(screen.getByText(/할일 테스트/)).toBeInTheDocument();
      expect(screen.getByText(/공지사항: 1개/)).toBeInTheDocument();
      expect(screen.getByText(/결재대기: 10건/)).toBeInTheDocument();
    });
  });

  it('대시보드 API 실패를 0건 데이터로 위장하지 않고 error boundary로 전파합니다.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);
    vi.mocked(client.get).mockRejectedValue(new Error('dashboard unavailable'));

    await expect(loadDashboardData()).rejects.toThrow('dashboard unavailable');
  });

  it('비어 있거나 잘못된 대시보드 응답도 0건으로 표시하지 않습니다.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);
    vi.mocked(client.get).mockResolvedValue(null as never);

    await expect(loadDashboardData()).rejects.toThrow(/dashboard response/i);
  });
});
