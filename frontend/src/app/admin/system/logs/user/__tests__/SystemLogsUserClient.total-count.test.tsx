import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 사용자 로그 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-07 화면 용어 원장 검토] 총계를 `Number(data?.total || 0)` 로 만들고 오류일 때만 비워, 조회가 끝나기 전에는
 * 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다 — loading 의 mustNotImply,
 * formatRules.number.unknownAsZero). 같은 묶음의 로그 대시보드(LogDashboardClient)는 이미 조회 중에도 비운다.
 */
const mocks = vi.hoisted(() => ({ getUserLogs: vi.fn() }));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: { getUserLogs: mocks.getUserLogs },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system/logs/user',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: React.PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

const { default: SystemLogsUserClient } = await import('../SystemLogsUserClient');

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SystemLogsUserClient />
    </QueryClientProvider>,
  );
}

describe('사용자 로그 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getUserLogs.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getUserLogs).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 독립 검토 반례: 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getUserLogs.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getUserLogs).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getUserLogs.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getUserLogs.mockRejectedValue(new Error('로그 조회 실패'));
    renderList();

    await waitFor(() => expect(mocks.getUserLogs).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
  });
});
