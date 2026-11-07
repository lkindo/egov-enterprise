import type { PropsWithChildren } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reward } from '@/services/foundation/operation/RewardAdminService';
import type { PageResponse } from '@/types/foundation/system';
import RewardManageClient from '../RewardManageClient';

/**
 * 포상 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total || 0` 으로 만들고 오류일 때만 비워, 서버가 미리 채운 1페이지 밖
 * (다른 페이지·검색어)의 첫 응답 전에는 툴바가 "총 0건" 을 보이고 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다).
 * 받은 값이 없으면 비우고, 서버가 미리 채운 값은 그대로 보인다.
 */
type Pagination = { onPageChange: (page: number) => void };
const mocks = vi.hoisted(() => ({
  getRewardList: vi.fn(),
  pagination: undefined as Pagination | undefined,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['REWARD_READ'], authorizationVersion: 'v1' } }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/ui/user-picker', () => ({ UserPicker: () => null }));
vi.mock('@/services/foundation/operation/RewardAdminService', () => ({
  rewardAdminService: { getRewardList: mocks.getRewardList },
}));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다(페이지 이동은 표의 pagination 으로 부른다).
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => null }));
// 실패 시험이 실패 상태에 닿은 뒤에 보게, 표가 받은 오류도 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ pagination, error }: { pagination: Pagination; error?: unknown }) => {
    mocks.pagination = pagination;
    return <div data-testid="table-error">{error ? '조회 실패' : ''}</div>;
  },
}));

const REWARD: Reward = { rwrdSn: 7, rwardNm: '모범 사원상', rwardwnrId: 'USR_1', rwardCode: 'R01' };
const PREFILLED: PageResponse<Reward> = { list: [REWARD], total: 12, page: 1, size: 10, totalPage: 2 };

function renderList(initialPage: PageResponse<Reward> | null = PREFILLED) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RewardManageClient initialPage={initialPage} />
    </QueryClientProvider>,
  );
}

/** 1페이지 재조회는 미리 채운 값과 같게 끝나고, 2페이지는 시험마다 정한다. */
function listByPage(secondPage: () => Promise<PageResponse<Reward>>) {
  mocks.getRewardList.mockImplementation(({ page }: { page: number }) => (page === 1 ? Promise.resolve(PREFILLED) : secondPage()));
}

async function goToSecondPage() {
  await waitFor(() => expect(mocks.pagination).toBeDefined());
  act(() => mocks.pagination?.onPageChange(2));
}

describe('포상 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pagination = undefined;
    window.localStorage.clear();
  });

  it('서버가 미리 채운 1페이지는 다시 조회하는 동안에도 그 총 건수를 낸다 — 받은 값을 감추지 않는다', async () => {
    mocks.getRewardList.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getRewardList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12');
  });

  it('다른 페이지의 조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    listByPage(() => new Promise(() => undefined));
    renderList();
    await goToSecondPage();

    await waitFor(() => expect(mocks.getRewardList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 다른 페이지의 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    listByPage(() => Promise.resolve({ ...PREFILLED, list: [], page: 2 }));
    onlineManager.setOnline(false);
    try {
      renderList();
      // 미리 채운 1페이지는 오프라인이어도 받은 값이다.
      expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12');
      await goToSecondPage();

      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getRewardList).not.toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('다른 페이지의 조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    listByPage(() => Promise.resolve({ list: [REWARD], total: 15, page: 2, size: 10, totalPage: 2 }));
    renderList();
    await goToSecondPage();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('15'));
  });

  // 서버 선조회가 실패하면 page.tsx 는 null 을 넘긴다. 예전에는 빈 페이지(total 0)를 받은 값으로 넘겨 "총 0건" 이 됐고 오프라인이면 그대로 남았다.
  it('서버 선조회가 실패해 미리 채운 값이 없으면 1페이지도 받기 전에는 총 건수를 내지 않고, 받으면 낸다', async () => {
    let resolveFirst: (page: PageResponse<Reward>) => void = () => undefined;
    mocks.getRewardList.mockReturnValue(new Promise<PageResponse<Reward>>((resolve) => { resolveFirst = resolve; }));
    renderList(null);

    await waitFor(() => expect(mocks.getRewardList).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    act(() => resolveFirst(PREFILLED));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12'));
  });

  it('서버 선조회가 실패하고 오프라인이면 1페이지 조회가 멈춰도 총 건수를 내지 않는다', async () => {
    mocks.getRewardList.mockResolvedValue(PREFILLED);
    onlineManager.setOnline(false);
    try {
      renderList(null);
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getRewardList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    listByPage(() => Promise.reject(new Error('포상 조회 실패')));
    renderList();
    await goToSecondPage();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('조회 실패'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });
});
