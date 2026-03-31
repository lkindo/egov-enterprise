vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
 usePathname: () => '/smart-toolkit/schedule',
 useSearchParams: () => new URLSearchParams(),
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
  expect(await screen.findByText(/?…λ¬΄ λ°??Έν…”λ¦¬μ „??i)).toBeInTheDocument();
 });
});
