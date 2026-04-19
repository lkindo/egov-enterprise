import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import client from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardNoti, DashboardTask } from '@/types/foundation/dashboard';

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
 */
async function getDashboardData() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const dashboardRes = await client.get<any>('/dashboard', axiosConfig);

    if (!dashboardRes) return { initialNotiList: [], initialTaskList: [], pendingApprovalCount: 0 };

    // Picking only necessary fields and slicing to minimize payload size
    const initialNotiList = (dashboardRes.notiList || [])
      .slice(0, 6)
      .map((item: any) => ({
        id: item.id || item.nttId,
        title: item.title || item.nttSj,
        date: item.frstRegisterPnttmStr || item.date || '',
        isNew: item.isNew || false
      }));

    const initialTaskList = (dashboardRes.taskList || [])
      .slice(0, 6)
      .map((item: any) => ({
        id: item.id || item.nttId,
        title: item.title || item.nttSj,
        date: item.frstRegisterPnttmStr || item.date || '',
        isNew: item.isNew || false
      }));

    return {
      initialNotiList,
      initialTaskList,
      pendingApprovalCount: dashboardRes.pendingApprovalCount || 0
    };
  } catch (err) {
    return { initialNotiList: [], initialTaskList: [], pendingApprovalCount: 0 };
  }
}

export default async function UnifiedDashboardPage() {
  const dataPromise = getDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UnifiedDashboardClient dataPromise={dataPromise} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-10 animate-pulse">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-12 w-64 rounded-[0.1rem]" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <Skeleton className="h-14 w-full lg:w-40 rounded-[0.1rem]" />
          <Skeleton className="h-14 w-full lg:w-40 rounded-[0.1rem]" />
        </div>
      </div>
      <Skeleton className="h-[200px] w-full rounded-[0.1rem]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={`page-skeleton-${i}`} className="h-48 rounded-[0.1rem]" />)}
      </div>
    </div>
  );
}
