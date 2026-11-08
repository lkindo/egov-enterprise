import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 스크랩 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total ?? 0` 으로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가 "총 0건" 을
 * 보였다(불러오는 중을 '데이터 없음' 으로 말한다). 받은 값이 없으면(조회 중·오프라인 멈춤·실패) 총 건수를 내지 않는다.
 */
const mocks = vi.hoisted(() => ({ getMyScraps: vi.fn() }));

vi.mock('@/services/business/user/ScrapService', () => ({
  scrapService: { getMyScraps: mocks.getMyScraps },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/collaboration/scraps/selectScrapList',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: React.PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
// 실패 상태에 닿은 뒤에 총 건수를 보도록 표는 오류 여부만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div data-testid="table-state">{error ? '오류' : ''}</div>,
}));

const { default: ScrapListClient } = await import('../selectScrapList/ScrapListClient');

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ScrapListClient />
    </QueryClientProvider>,
  );
}

describe('스크랩 목록 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getMyScraps.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getMyScraps).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getMyScraps.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getMyScraps).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getMyScraps.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getMyScraps.mockRejectedValue(new Error('스크랩 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-state')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });
});
