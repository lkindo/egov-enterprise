import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { DashboardTask } from '@/types/foundation/dashboard';
import type { components } from '@/types/generated-api';
import { getDashboardDataOperation } from '@/types/generated-operations';

type DashboardItem = components['schemas']['BoardDto'] & {
  id?: unknown;
  title?: unknown;
  isNew?: unknown;
};

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

/**
 * Dashboard failures must reach the route error boundary. Returning an all-zero
 * object here would turn an outage or contract drift into a false "nothing to do" state.
 */
export async function loadDashboardData() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) redirect('/login');

  const dashboardResponse = await executeGeneratedOperation(getDashboardDataOperation, {
    config: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  return {
    initialNotiList: dashboardResponse.notiList.slice(0, 6).map(toDashboardTask),
    initialTaskList: dashboardResponse.taskList.slice(0, 6).map(toDashboardTask),
    // 게시판 전체 글 수. null 은 조회 실패(또는 게시판 없음)이며 0 으로 바꾸지 않는다.
    notiListTotal: dashboardResponse.notiListTotal ?? null,
    taskListTotal: dashboardResponse.taskListTotal ?? null,
    pendingApprovalCount: dashboardResponse.pendingApprovalCount,
  };
}
