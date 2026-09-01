import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { DashboardTask } from '@/types/foundation/dashboard';
import type { components } from '@/types/generated-api';
import { getDashboardDataOperation } from '@/types/generated-operations';

type DashboardItem = components['schemas']['BoardDto'] & {
  id?: unknown;
  title?: unknown;
  date?: unknown;
  frstRegisterPnttmStr?: unknown;
  isNew?: unknown;
};

function toDashboardTask(item: DashboardItem): DashboardTask {
  return {
    id: String(item.id || item.pstSn || ''),
    title: String(item.title || item.pstTtl || ''),
    date: String(item.frstRegisterPnttmStr || item.date || ''),
    isNew: Boolean(item.isNew || false),
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
    pendingApprovalCount: dashboardResponse.pendingApprovalCount,
  };
}
