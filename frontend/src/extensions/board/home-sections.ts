import { defineContributions } from '@/extensions/slots';
import { BoardHomeLists, BoardNewPostAction, BoardNoticeTotalCard, BoardTaskTotalCard } from '@/app/components/dashboard/BoardHome';
import { boardHomeQuery } from '@/queries/board-home-query';

/**
 * 게시판 → 업무 홈 기여(Phase 2 9단계). 업무게시판·공지사항 글 수 카드, 두 게시판의 최근 글 목록, 새 게시글 작성 단추다. 게시판이 빠진
 * 구성에서는 이 파일이 기능과 함께 직접 지워져 이 조각만 사라지고 업무 홈은 그대로다.
 *
 * 데이터는 종전과 같은 대시보드 API(/api/v1/dashboard)이고 노출도 그 권한(DASHBOARD_READ)이다. 서버 자식이 첫 화면 전에 채우며,
 * 전송 실패는 서버에서 오류 경계로 간다(boundary — 0건 홈으로 위장하지 않는다). 네 조각이 같은 조회라 요청은 한 번이다.
 */
export default defineContributions('home-sections', [
  {
    id: 'board-new-post',
    placement: 'actions',
    order: 10,
    Component: BoardNewPostAction,
    prefetch: [{ query: boardHomeQuery, failure: 'boundary' }],
    visibleWhen: { permissions: ['DASHBOARD_READ'] },
  },
  {
    id: 'board-task-total',
    placement: 'cards',
    order: 30,
    Component: BoardTaskTotalCard,
    prefetch: [{ query: boardHomeQuery, failure: 'boundary' }],
    visibleWhen: { permissions: ['DASHBOARD_READ'] },
  },
  {
    id: 'board-notice-total',
    placement: 'cards',
    order: 40,
    Component: BoardNoticeTotalCard,
    prefetch: [{ query: boardHomeQuery, failure: 'boundary' }],
    visibleWhen: { permissions: ['DASHBOARD_READ'] },
  },
  {
    id: 'board-lists',
    placement: 'main',
    order: 10,
    Component: BoardHomeLists,
    prefetch: [{ query: boardHomeQuery, failure: 'boundary' }],
    visibleWhen: { permissions: ['DASHBOARD_READ'] },
  },
]);
