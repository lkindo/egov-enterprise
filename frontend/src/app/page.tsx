import { Suspense, cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import client from '@/lib/api/client';
import { DashboardTask } from '@/types/foundation/dashboard';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';

/**
 * P2: Dynamic Import for Heavy Dashboard Client
 * Reduces initial bundle size by lazy loading the heavy dashboard component.
 */
const UnifiedDashboardClient = dynamic(() => import('./UnifiedDashboardClient'), {
  loading: () => <DashboardSkeleton />
});

/**
 * P3: Server-side Data Refinement
 * Minifies the JSON payload sent to the client by picking only required fields.
 * cache() ensures that even if this is called multiple times in one request, only one API call is made.
 */
const getDashboardData = cache(async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const dashboardRes = await client.get<{
      notiList: Record<string, unknown>[];
      taskList: Record<string, unknown>[];
      pendingApprovalCount: number;
    }>('/dashboard', axiosConfig);

    if (!dashboardRes) return { initialNotiList: [], initialTaskList: [], pendingApprovalCount: 0 };

    // Picking only necessary fields and slicing to minimize payload size
    const initialNotiList: DashboardTask[] = (dashboardRes.notiList || [])
      .slice(0, 6)
      .map((item: Record<string, unknown>) => ({
        id: String(item.id || item.pstSn || ''),
        title: String(item.title || item.pstTtl || ''),
        date: String(item.frstRegisterPnttmStr || item.date || ''),
        isNew: Boolean(item.isNew || false)
      }));

    const initialTaskList: DashboardTask[] = (dashboardRes.taskList || [])
      .slice(0, 6)
      .map((item: Record<string, unknown>) => ({
        id: String(item.id || item.pstSn || ''),
        title: String(item.title || item.pstTtl || ''),
        date: String(item.frstRegisterPnttmStr || item.date || ''),
        isNew: Boolean(item.isNew || false)
      }));

    return {
      initialNotiList,
      initialTaskList,
      pendingApprovalCount: dashboardRes.pendingApprovalCount || 0
    };
  } catch {
    return { initialNotiList: [], initialTaskList: [], pendingApprovalCount: 0 };
  }
});

export default async function UnifiedDashboardPage() {
  const dataPromise = getDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UnifiedDashboardClient dataPromise={dataPromise} />
    </Suspense>
  );
}
