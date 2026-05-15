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
  default: ({ dataPromise }: any) => {
    // In Vitest tests, we need to handle the promise resolution for the mock
    const [data, setData] = React.useState<any>(null);
    
    React.useEffect(() => {
      dataPromise.then(setData);
    }, [dataPromise]);

    if (!data) return <div data-testid="loading">Î°úÎî© Ï§?..</div>;

    return (
      <div data-testid="dashboard-client">
        <div data-testid="noti-count">Í≥µÏ??¨Ìï≠: {data.initialNotiList.length}Í∞?/div>
        <div data-testid="task-count">?†Ïùº: {data.initialTaskList.length}Í∞?/div>
        <div>Í≤∞Ïû¨?ÄÍ∏? {data.pendingApprovalCount}Í±?/div>
        {data.initialTaskList.length > 0 && <div>?†Ïùº ?åÏä§??/div>}
      </div>
    );
  }
}));

describe('DashboardPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('?†ÌÅ∞???ÜÎäî Í≤ΩÏö∞ /login?ºÎ°ú Î¶¨Îã§?¥Î†â?∏Îê©?àÎã§.', async () => {
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

  it('?∏Ï¶ù??Í≤ΩÏö∞ ?∞Ïù¥?∞Î? ?¨Ìï®???Ä?úÎ≥¥?úÎ? ?åÎçîÎßÅÌï©?àÎã§.', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'mock-token' }),
    } as any);

    vi.mocked(client.get).mockResolvedValue({
      notiList: [{ pstId: 1, pstTtl: 'Í≥µÏ??¨Ìï≠ ?åÏä§?? }],
      taskList: [{ pstId: 2, pstTtl: '?†Ïùº ?åÏä§?? }],
      pendingApprovalCount: 10
    });

    const result = await DashboardPage();
    render(result);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
      expect(screen.getByText(/?†Ïùº ?åÏä§??)).toBeInTheDocument();
      expect(screen.getByText(/Í≥µÏ??¨Ìï≠: 1Í∞?)).toBeInTheDocument();
      expect(screen.getByText(/Í≤∞Ïû¨?ÄÍ∏? 10Í±?)).toBeInTheDocument();
    });
  });
});
