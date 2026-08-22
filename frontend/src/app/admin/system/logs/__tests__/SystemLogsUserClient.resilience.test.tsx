import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getUserLogs: vi.fn(),
  setPage: vi.fn(),
}));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: { getUserLogs: harness.getUserLogs },
}));

vi.mock('@/app/admin/system/logs/use-log-url-state', () => ({
  usePageParam: () => [1, harness.setPage],
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight }: { title: string; highlight?: string }) => (
    <header>{title} {highlight}</header>
  ),
}));

import SystemLogsUserClient from '../user/SystemLogsUserClient';

const FAILURE_PROBE = 'UI_BASELINE_FAILURE_PROBE';
let queryClient: QueryClient;
let failureProbeAttempts: number;

function pageResult(list: Array<Record<string, unknown>> = []) {
  return { list, total: list.length, page: 1, size: 10, totalPage: 1 };
}

function renderWithQueryClient(children: ReactNode) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: Number.POSITIVE_INFINITY,
        throwOnError: true,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('SystemLogsUserClient scoped error recovery', () => {
  beforeEach(() => {
    failureProbeAttempts = 0;
    harness.setPage.mockReset();
    harness.getUserLogs.mockReset();
    harness.getUserLogs.mockImplementation(async ({ searchKeyword }: { searchKeyword: string }) => {
      if (searchKeyword === FAILURE_PROBE) {
        failureProbeAttempts += 1;
        if (failureProbeAttempts === 1) {
          throw Object.assign(new Error('Synthetic scoped query failure'), {
            response: { status: 500 },
          });
        }
        return pageResult();
      }
      return pageResult([{
        ocrnYmd: '20260821',
        dmndUserId: 'synthetic-actor',
        userNm: 'Synthetic Actor',
        srvcNm: 'SyntheticService',
        mthdNm: 'observe',
      }]);
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('keeps the submitted filter and recovers through the table-scoped retry instead of the route boundary', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SystemLogsUserClient />);

    await screen.findAllByText('SyntheticService');
    const input = screen.getByRole('textbox', { name: '데이터 검색' });
    await user.type(input, FAILURE_PROBE);
    await user.click(screen.getByRole('button', { name: '검색' }));

    const retryButtons = await screen.findAllByRole('button', { name: '데이터 다시 불러오기' });
    expect(input).toHaveValue(FAILURE_PROBE);
    expect(screen.getAllByTestId('error-state-display')).toHaveLength(2);

    await user.click(retryButtons[0]);

    await waitFor(() => expect(failureProbeAttempts).toBe(2));
    await screen.findAllByText(`"${FAILURE_PROBE}"에 대한 검색 결과가 없습니다.`);
    expect(input).toHaveValue(FAILURE_PROBE);
    expect(screen.queryByTestId('error-state-display')).not.toBeInTheDocument();
  });
});
