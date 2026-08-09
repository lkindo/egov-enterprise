vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', userNm: '테스트' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
 usePathname: () => '/smart-toolkit/schedule',
 useSearchParams: () => ({ get: vi.fn().mockReturnValue('calendar') }),
 useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
 default: { get: vi.fn().mockResolvedValue({ resultList: [], totalCount: 0 }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import ScheduleListPage from '../../smart-toolkit/schedule/page';

describe('ScheduleListPage', () => {
 it('renders schedule list page structure', async () => {
  const queryClient = new QueryClient();
  render(
  <QueryClientProvider client={queryClient}>
  <ScheduleListPage />
  </QueryClientProvider>
  );
  expect(await screen.findByText(/허브/i)).toBeInTheDocument();
 });
});
