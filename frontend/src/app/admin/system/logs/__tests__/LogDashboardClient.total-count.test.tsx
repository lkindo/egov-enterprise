import React, { Suspense } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SysLog } from '@/types/foundation/system';
import type { InitialSystemLogs } from '../LogDashboardClient';

/**
 * 로그 통합 조회가 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `error || isLoading` 일 때만 비웠다. 오프라인이면 TanStack v5 는 조회를 멈추고
 * (fetchStatus 'paused') isLoading 이 false 라, 받은 값이 없는데도 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다.
 * 서버가 미리 채운 첫 쪽(initialData)은 받은 값이므로 다시 조회하는 동안에도 그대로 둔다.
 */
const mocks = vi.hoisted(() => ({ getSystemLogs: vi.fn() }));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: {
    getSystemLogs: mocks.getSystemLogs,
    getLoginLogs: vi.fn(),
    getUserLogs: vi.fn(),
    getWebLogs: vi.fn(),
  },
}));
vi.mock('@/app/admin/system/logs/use-log-url-state', () => ({
  usePageParam: () => [1, vi.fn()],
  useTabParam: () => ['SYS', vi.fn()],
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: [], authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/patterns/full-result-export', () => ({ requestFullExport: vi.fn() }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: () => null }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: React.PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
// 오류 상태에 실제로 닿았는지 기다릴 수 있게 표에 넘긴 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: Error | null }) => <div data-testid="table-error">{error ? '오류' : ''}</div>,
}));

const { default: LogDashboardClient } = await import('../LogDashboardClient');

function pageOf(total: number): PageResponse<SysLog> {
  return { list: [], total, page: 1, size: 10, totalPage: 1 };
}

/** 서버 프리페치 실패가 기본이다 — 그때는 initialData 없이 클라이언트가 다시 조회한다. */
async function renderDashboard(initial: InitialSystemLogs = { ok: false, message: '프리페치 실패' }) {
  const systemLogsPromise = Promise.resolve(initial);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <Suspense fallback={<div>loading</div>}>
          <LogDashboardClient systemLogsPromise={systemLogsPromise} />
        </Suspense>
      </QueryClientProvider>,
    );
    await systemLogsPromise;
  });
}

describe('로그 통합 조회 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getSystemLogs.mockReturnValue(new Promise(() => undefined));
    await renderDashboard();

    await waitFor(() => expect(mocks.getSystemLogs).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getSystemLogs.mockResolvedValue(pageOf(7));
    onlineManager.setOnline(false);
    try {
      await renderDashboard();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getSystemLogs).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getSystemLogs.mockResolvedValue(pageOf(7));
    await renderDashboard();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getSystemLogs.mockRejectedValue(new Error('로그 조회 실패'));
    await renderDashboard();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('서버가 미리 채운 첫 쪽의 총 건수는 다시 조회하는 동안에도 그대로 보인다', async () => {
    mocks.getSystemLogs.mockReturnValue(new Promise(() => undefined));
    await renderDashboard({ ok: true, data: pageOf(12) });

    await waitFor(() => expect(mocks.getSystemLogs).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12');
  });
});
