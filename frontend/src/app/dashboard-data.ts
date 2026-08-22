import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import client from '@/lib/api/client';
import type { DashboardTask } from '@/types/foundation/dashboard';

interface DashboardResponse {
  notiList: Record<string, unknown>[];
  taskList: Record<string, unknown>[];
  pendingApprovalCount: number;
}

function toDashboardTask(item: Record<string, unknown>): DashboardTask {
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

  const dashboardResponse = await client.get<DashboardResponse>('/dashboard', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (
    !dashboardResponse
    || !Array.isArray(dashboardResponse.notiList)
    || !Array.isArray(dashboardResponse.taskList)
    || typeof dashboardResponse.pendingApprovalCount !== 'number'
    || !Number.isFinite(dashboardResponse.pendingApprovalCount)
    || dashboardResponse.pendingApprovalCount < 0
  ) {
    throw new Error('Invalid dashboard response');
  }

  return {
    initialNotiList: dashboardResponse.notiList.slice(0, 6).map(toDashboardTask),
    initialTaskList: dashboardResponse.taskList.slice(0, 6).map(toDashboardTask),
    pendingApprovalCount: dashboardResponse.pendingApprovalCount,
  };
}
