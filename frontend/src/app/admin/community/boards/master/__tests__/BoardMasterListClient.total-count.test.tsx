import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 게시판 관리 목록이 셸에 넘기는 총 건수와, 같은 응답에서 세는 '이 페이지' 사용·사용 안 함 수·메뉴 연결 조건 범위 고지.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `boardData?.total ?? boardList.length` 로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가
 * "총 0건" 을 보였다. 이 페이지 수는 `isLoading` 으로만 가려, 오프라인 멈춤(isLoading=false, 받은 값 없음)에서 "사용 0건" 이었다.
 * 받은 목록이 없으면(조회 중·오프라인 멈춤·실패) 셋 모두 수를 내지 않는다.
 */
const mocks = vi.hoisted(() => ({
  getBoardMasterList: vi.fn(),
  // 메뉴 원장·그룹을 모두 읽은 상태 — 범위 고지가 '확인하는 중' 이 아니라 건수를 말하는 경로다.
  access: {
    menuSource: { status: 'ready', menus: [] },
    groupSource: { status: 'ready', groups: [] },
    retry: () => undefined,
  },
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { getBoardMasterList: mocks.getBoardMasterList, batchUpdateBoardMasterStatus: vi.fn() },
}));
vi.mock('../useBoardAccessSources', () => ({ useBoardAccessSources: () => mocks.access }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/community/boards/master',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['BBS_MST_READ'], authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수·툴바·조회 조건만 그린다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, filter, toolbarActions, children }: React.PropsWithChildren<{
    totalCount?: number; filter?: React.ReactNode; toolbarActions?: React.ReactNode;
  }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      <div data-testid="shell-toolbar">{toolbarActions}</div>
      {filter}
      {children}
    </main>
  ),
}));
// 실패 상태에 닿은 뒤에 수를 보도록 표는 오류 여부만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div data-testid="table-state">{error ? '오류' : ''}</div>,
}));

const { BoardMasterListClient } = await import('../BoardMasterListClient');

const BOARDS = [
  { bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST', useYn: 'Y', designations: [] },
  { bbsId: 'BBSMSTR_EEEEEEEEEEEE', bbsTtl: '일정 게시판', bbsTypeCd: 'BBST03', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_CALENDAR', useYn: 'N', designations: [] },
];
const PAGE_UNKNOWN = /이 페이지: 사용 —건 · 사용 안 함 —건/;

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardMasterListClient />
    </QueryClientProvider>,
  );
}

describe('게시판 관리 — 셸 툴바의 총 건수와 이 페이지 수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회가 끝나기 전에는 총 건수와 이 페이지 수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getBoardMasterList.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getBoardMasterList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar')).toHaveTextContent(PAGE_UNKNOWN);
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수와 이 페이지 수를 내지 않는다', async () => {
    mocks.getBoardMasterList.mockResolvedValue({ list: BOARDS, total: 25, totalPage: 3 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(screen.getByTestId('shell-toolbar')).toHaveTextContent(PAGE_UNKNOWN);
      expect(mocks.getBoardMasterList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  // 메뉴 연결 조건의 범위 고지도 같은 응답의 행 수를 말한다 — 받은 행이 없으면 "이 페이지 0건 가운데" 라고 말하지 않는다.
  it('오프라인으로 멈춘 동안 메뉴 연결 조건을 적용해도 범위 고지에 0건을 말하지 않고, 응답을 받으면 그 수를 말한다', async () => {
    mocks.getBoardMasterList.mockResolvedValue({ list: BOARDS, total: 25, totalPage: 3 });
    onlineManager.setOnline(false);
    try {
      renderList();
      fireEvent.change(screen.getByRole('combobox', { name: '메뉴 연결' }), { target: { value: 'none' } });
      fireEvent.click(screen.getByRole('button', { name: '조회' }));
      await waitFor(() => expect(screen.getByRole('combobox', { name: '메뉴 연결' })).toHaveValue('none'));
      expect(screen.queryByText(/메뉴 연결 조건은 이 페이지/)).toBeNull();
      expect(mocks.getBoardMasterList).not.toHaveBeenCalled();

      act(() => { onlineManager.setOnline(true); });
      expect(await screen.findByText(/메뉴 연결 조건은 이 페이지 2건 가운데에서만 거릅니다 — 2건이 맞습니다\./)).toBeInTheDocument();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수와 이 페이지의 사용·사용 안 함 수를 낸다', async () => {
    mocks.getBoardMasterList.mockResolvedValue({ list: BOARDS, total: 25, totalPage: 3 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('25'));
    expect(screen.getByTestId('shell-toolbar')).toHaveTextContent(/이 페이지: 사용 1건 · 사용 안 함 1건/);
  });

  it('조회가 실패하면 총 건수와 이 페이지 수를 내지 않는다', async () => {
    mocks.getBoardMasterList.mockRejectedValue(new Error('게시판 목록 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-state')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar')).toHaveTextContent(PAGE_UNKNOWN);
  });
});
