import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NOTICE_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';
import { boardHomeQuery, type BoardHomeData } from '@/queries/board-home-query';
import { BoardHomeLists, BoardNewPostAction, BoardNoticeTotalCard, BoardTaskTotalCard } from '../BoardHome';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
// 서버 자식이 미리 채우지 못해 브라우저가 직접 조회하는 경우만 이 대역을 탄다. 다른 시험은 캐시를 채워 조회하지 않는다.
vi.mock('@/lib/api/generated-api-client', () => ({ executeGeneratedOperation: mocks.execute }));

/**
 * 업무 홈의 게시판 조각(Phase 2 9단계 — 종전 UnifiedDashboardClient.totals 시험을 옮겼다). 조각은 서버 자식이 미리 채운 게시판 조회를
 * 읽는다 — 시험은 같은 키로 캐시를 채워 그린다. 응답 처리(날짜·식별자·null 건수)는 board-home-query 시험이 본다.
 *
 * - 카드는 목록 길이(최근 5건이라 늘 5 이하)가 아니라 서버가 준 게시판 전체 글 수를 보여 준다(DIP V1).
 * - 전체 글 수가 null 이면(조회 실패) '0건'·'글이 없습니다' 라고 말하지 않는다.
 * - 서버가 권한 판정(403)으로 게시판을 주지 않으면(null) 조각을 그리지 않는다 — 0건 목록으로 위장하지 않는다.
 */
function renderBoardHome(data: Partial<BoardHomeData> | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(boardHomeQuery.queryKey, data === null ? null : {
    initialNotiList: [], initialTaskList: [], notiListTotal: 0, taskListTotal: 0, ...data,
  });
  return act(async () => {
    render(
      <QueryClientProvider client={client}>
        <BoardNewPostAction />
        <ul><BoardTaskTotalCard /><BoardNoticeTotalCard /></ul>
        <BoardHomeLists />
      </QueryClientProvider>,
    );
  });
}

describe('업무 홈 게시판 조각 (DIP V1)', () => {
  it('🚨 카드는 목록 길이가 아니라 게시판 전체 글 수를 보여 준다', async () => {
    await renderBoardHome({
      initialTaskList: [{ id: '1', title: '최근 글', date: '2026-09-26', isNew: false }],
      taskListTotal: 37,
      notiListTotal: 12,
    });

    expect(screen.getByText('업무게시판 글').closest('li')).toHaveTextContent('37건');
    expect(screen.getByText('공지사항').closest('li')).toHaveTextContent('12건');
  });

  it('🚨 조회에 실패하면(전체 글 수 null) 0건·글 없음이라고 말하지 않는다', async () => {
    await renderBoardHome({ taskListTotal: null, notiListTotal: 3 });

    expect(screen.getByText('업무게시판 글').closest('li')).toHaveTextContent('조회 실패');
    expect(screen.getByText('목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText('업무게시판에 등록된 글이 없습니다.')).toBeNull();
    // 조회에 성공한 공지 목록은 종전대로 비어 있음을 말한다.
    expect(screen.getByText('새 공지사항이 없습니다.')).toBeInTheDocument();
  });

  it('목록 날짜와 상세·전체 보기 목적지를 그대로 보여 준다', async () => {
    await renderBoardHome({
      initialNotiList: [{ id: '5', bbsId: NOTICE_BOARD_ID, pstSn: 5, title: '공지', date: '2026-09-25', isNew: false }],
      notiListTotal: 1,
    });

    expect(screen.getByText('2026-09-25')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지' })).toHaveAttribute('href', `/admin/community/boards/detail?bbsId=${NOTICE_BOARD_ID}&pstSn=5`);
    expect(screen.getByRole('link', { name: '업무게시판 전체 보기' }))
      .toHaveAttribute('href', `/admin/community/boards/select-board-list?bbsId=${TASK_BOARD_ID}`);
    expect(screen.getByRole('link', { name: /새 게시글 작성/ }))
      .toHaveAttribute('href', `/admin/community/boards/insert-board-article?bbsId=${TASK_BOARD_ID}`);
  });

  it('🚨 브라우저 조회가 실패하면(404) 목록을 자리표시로 남기지 않고 조회 실패라고 말한다', async () => {
    mocks.execute.mockRejectedValue(Object.assign(new Error('Not Found'), { response: { status: 404 } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <ul><BoardTaskTotalCard /></ul>
        <BoardHomeLists />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getAllByText('목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.')).toHaveLength(2));
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.getByText('업무게시판 글').closest('li')).toHaveTextContent('조회 실패');
    expect(screen.queryByText('업무게시판에 등록된 글이 없습니다.')).toBeNull();
    expect(screen.queryByText('새 공지사항이 없습니다.')).toBeNull();
  });

  it('서버가 게시판을 주지 않으면(403) 카드·목록·단추를 그리지 않는다', async () => {
    await renderBoardHome(null);

    expect(screen.queryByText('업무게시판 글')).toBeNull();
    expect(screen.queryByText('업무게시판 최근 글')).toBeNull();
    expect(screen.queryByRole('link', { name: /새 게시글 작성/ })).toBeNull();
    expect(screen.queryByText('0건')).toBeNull();
  });
});
