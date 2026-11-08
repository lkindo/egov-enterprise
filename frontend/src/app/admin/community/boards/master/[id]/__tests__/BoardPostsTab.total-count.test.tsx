import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 운영 화면 게시물 탭이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `posts.data?.total ?? rows.length` 로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가
 * "총 0건" 을 보였다. 받은 값이 없으면(조회 중·오프라인 멈춤·실패) 총 건수를 내지 않고, 다른 쪽을 읽는 동안에는 이전 쪽(keepPreviousData)의
 * 받은 총계를 유지한다.
 */
const mocks = vi.hoisted(() => ({ getPosts: vi.fn(), getBoardMeta: vi.fn(), listPage: vi.fn() }));

vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getPosts: mocks.getPosts, getBoardMeta: mocks.getBoardMeta },
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({ boardAdminService: {} }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=posts'),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['BBS_MST_READ', 'BOARD_READ_ALL'], authorizationVersion: 'v1' } }),
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
// 표는 오류 여부와 다음 쪽 이동만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error, pagination }: { error?: unknown; pagination: { currentPage: number; onPageChange: (page: number) => void } }) => (
    <div>
      <div data-testid="table-state">{error ? '오류' : ''}</div>
      <button type="button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)}>다음 쪽</button>
    </div>
  ),
}));

const { BoardPostsTab } = await import('../BoardPostsTab');

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';
const DETAIL = {
  bbsId: BBS_ID, bbsTtl: '공지사항', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST', ansPsbltyYn: 'N',
  fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, useYn: 'Y', version: 4, designations: [], rsvtPstgPsbltyYn: 'Y',
  upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30,
};
/** 유효 고정 수 조회(같은 목록 API 의 pinned=true·크기 1) — 목록 조회와 나눠 답한다. */
const isPinCountCall = (params: Record<string, unknown>) => params.size === 1 && params.pinned === true;

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardPostsTab detail={DETAIL as never} />
    </QueryClientProvider>,
  );
}

describe('게시물 탭 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 조회 조건·쪽은 세션 목록 상태에 남는다 — 시험끼리 섞이지 않게 비운다.
    window.sessionStorage.clear();
    mocks.getBoardMeta.mockResolvedValue({ requiredEditPermissions: [] });
    mocks.getPosts.mockImplementation((_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? Promise.resolve({ list: [], total: 0, totalPage: 1 })
      : mocks.listPage(params)));
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.listPage.mockReturnValue(new Promise(() => undefined));
    renderTab();

    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.listPage.mockResolvedValue({ list: [], total: 42, totalPage: 3 });
    onlineManager.setOnline(false);
    try {
      renderTab();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.listPage).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.listPage.mockResolvedValue({ list: [], total: 42, totalPage: 3 });
    renderTab();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('42'));
  });

  it('다음 쪽을 읽는 동안에는 이전 쪽의 받은 총 건수를 유지한다', async () => {
    mocks.listPage.mockResolvedValueOnce({ list: [], total: 42, totalPage: 3 });
    mocks.listPage.mockReturnValue(new Promise(() => undefined));
    renderTab();
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('42'));

    fireEvent.click(screen.getByRole('button', { name: '다음 쪽' }));
    await waitFor(() => expect(mocks.listPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('42');
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.listPage.mockRejectedValue(new Error('게시물 조회 실패'));
    renderTab();

    await waitFor(() => expect(screen.getByTestId('table-state')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });
});
