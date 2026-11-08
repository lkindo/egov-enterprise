import type { PropsWithChildren } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalHr } from '@/services/foundation/operation/ExternalHrAdminService';
import type { PageResponse } from '@/types/foundation/system';
import ExternalHrClient from '../ExternalHrClient';

/**
 * 외부인사 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total ?? 0` 으로 만들고 오류일 때만 비워, 서버 선조회가 없을 때(실패·검색·다른 페이지)
 * 첫 응답 전에는 툴바가 "총 0건" 을 보이고 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다). 받은 값이 없으면 비우고,
 * 서버가 미리 채운 값은 그대로 보인다.
 */
const mocks = vi.hoisted(() => ({ getExternalHrList: vi.fn(), getEvents: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['EXT_HR_READ'], authorizationVersion: 'v1' } }) }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/external-hr',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/foundation/operation/eventService', () => ({ eventService: { getEvents: mocks.getEvents } }));
vi.mock('@/services/foundation/operation/ExternalHrAdminService', () => ({
  externalHrAdminService: { getExternalHrList: mocks.getExternalHrList },
}));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => null }));
// 실패 시험이 실패 상태에 닿은 뒤에 보게, 표가 받은 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div data-testid="table-error">{error ? '조회 실패' : ''}</div>,
}));

const HR: ExternalHr = { evntSn: 1, otsdHrId: 'HR-001', otsdHrNm: '홍길동' };

function renderList(initialPage: PageResponse<ExternalHr> | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExternalHrClient initialPage={initialPage} />
    </QueryClientProvider>,
  );
}

describe('외부인사 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getEvents.mockResolvedValue({ list: [], total: 0, page: 1, size: 100, totalPage: 0 });
  });

  it('서버 선조회가 없고 조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getExternalHrList.mockReturnValue(new Promise(() => undefined));
    renderList(null);

    await waitFor(() => expect(mocks.getExternalHrList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getExternalHrList.mockResolvedValue({ list: [HR], total: 7, page: 1, size: 10, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList(null);
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getExternalHrList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getExternalHrList.mockResolvedValue({ list: [HR], total: 7, page: 1, size: 10, totalPage: 1 });
    renderList(null);

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getExternalHrList.mockRejectedValue(new Error('외부인사 조회 실패'));
    renderList(null);

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('조회 실패'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('서버가 미리 채운 1페이지는 다시 조회하는 동안에도 그 총 건수를 낸다 — 받은 값을 감추지 않는다', async () => {
    mocks.getExternalHrList.mockReturnValue(new Promise(() => undefined));
    renderList({ list: [HR], total: 12, page: 1, size: 10, totalPage: 2 });

    await waitFor(() => expect(mocks.getExternalHrList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12');
  });
});
