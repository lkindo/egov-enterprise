import { queryOptions } from '@tanstack/react-query';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { DashboardTask } from '@/types/foundation/dashboard';
import type { components } from '@/types/generated-api';
import { getDashboardDataOperation } from '@/types/generated-operations';

/**
 * 업무 홈의 게시판 조회(Phase 2 9단계 — 종전 app/dashboard-data.ts 의 응답 처리를 그대로 옮겼다). 게시판 기능 소유다.
 *
 * 서버 자식(app/home-data-boundary.tsx)이 첫 화면 전에 채우고, 게시판 홈 구역(app/components/dashboard/BoardHome.tsx)이 같은 키로
 * 읽는다. 'use client' 가 없는 모듈이라 서버와 브라우저가 같은 객체를 쓴다. 인증 토큰은 API 클라이언트가 붙인다(서버에서는 쿠키에서).
 *
 * - 권한 판정 403 만 '이 홈에서 게시판을 보지 않는다'(null)다. 그 밖의 실패는 던진다 — 서버에서는 라우트 오류 경계로 가고
 *   0건 홈으로 위장하지 않는다.
 * - 게시판 전체 글 수 null 은 조회 실패(또는 게시판 없음)이고 0 으로 바꾸지 않는다.
 * - 대시보드 응답의 결재 대기 수는 읽지 않는다 — 결재 대기 카드는 결재 기능이 자기 API 로 센다(approval-home-query.ts).
 */
type DashboardItem = components['schemas']['BoardDto'] & {
  id?: unknown;
  title?: unknown;
  isNew?: unknown;
};

export interface BoardHomeData {
  initialNotiList: DashboardTask[];
  initialTaskList: DashboardTask[];
  notiListTotal: number | null;
  taskListTotal: number | null;
}

/**
 * [2026-09-26 DIP V1] 날짜는 서버 BoardDto 의 `crtDt`(작성 일시)다. 종전에는 서버가 한 번도 싣지 않는
 * 레거시 필드(`frstRegisterPnttmStr`)를 읽어 목록 날짜가 늘 '-' 였다. 화면에는 날짜 부분만 보인다.
 */
function postDate(crtDt: string | undefined | null): string {
  return typeof crtDt === 'string' && crtDt.length >= 10 ? crtDt.slice(0, 10) : '';
}

function toDashboardTask(item: DashboardItem): DashboardTask {
  return {
    id: String(item.id || item.pstSn || ''),
    title: String(item.title || item.pstTtl || ''),
    date: postDate(item.crtDt),
    isNew: Boolean(item.isNew || false),
    ...(typeof item.bbsId === 'string' && item.bbsId.length > 0 && item.bbsId.length <= 20
      && typeof item.pstSn === 'number' && Number.isSafeInteger(item.pstSn) && item.pstSn > 0
      ? { bbsId: item.bbsId, pstSn: item.pstSn } : {}),
  };
}

/** Only an authoritative 403 becomes null. Other failures throw; none become an all-zero home. */
export async function loadBoardHome(): Promise<BoardHomeData | null> {
  const dashboardResponse = await executeGeneratedOperation(getDashboardDataOperation, {}).catch((error: unknown) => {
    const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
    if (status === 403) return null;
    throw error;
  });
  if (dashboardResponse === null) return null;

  return {
    initialNotiList: dashboardResponse.notiList.slice(0, 6).map(toDashboardTask),
    initialTaskList: dashboardResponse.taskList.slice(0, 6).map(toDashboardTask),
    // 게시판 전체 글 수. null 은 조회 실패(또는 게시판 없음)이며 0 으로 바꾸지 않는다.
    notiListTotal: dashboardResponse.notiListTotal ?? null,
    taskListTotal: dashboardResponse.taskListTotal ?? null,
  };
}

export const boardHomeQuery = queryOptions({
  queryKey: ['home', 'board'] as const,
  queryFn: loadBoardHome,
});
