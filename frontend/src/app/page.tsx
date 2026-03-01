import { Suspense } from 'react';
import { cookies } from 'next/headers';
import UnifiedDashboardClient from './UnifiedDashboardClient';
import { vacationUserService } from '@/services/user/vacation/VacationUserService';
import client from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardResponse, DashboardNoti, DashboardTask } from '@/types/dashboard';

async function getDashboardData() {
  const currentYear = new Date().getFullYear().toString();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  try {
    const [leaveRes, dashboardRes] = await Promise.allSettled([
      vacationUserService.getMyYearlyLeave(currentYear),
      client.get<DashboardResponse>('/dashboard', axiosConfig)
    ]);

    let initialLeave = null;
    let initialNotiList: DashboardNoti[] = [];
    let initialTaskList: DashboardTask[] = [];

    if (leaveRes.status === 'fulfilled' && (leaveRes.value as any)?.success) {
      initialLeave = (leaveRes.value as any).data;
    }

    if (dashboardRes.status === 'fulfilled') {
      const dashboardData = dashboardRes.value;
      initialNotiList = (dashboardData.notiList || []).slice(0, 6);
      initialTaskList = (dashboardData.taskList || []).slice(0, 6);
    }

    return { initialLeave, initialNotiList, initialTaskList };
  } catch (err) {
    return { initialLeave: null, initialNotiList: [], initialTaskList: [] };
  }
}

export default async function UnifiedDashboardPage() {
  const data = await getDashboardData();
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UnifiedDashboardClient initialLeave={data.initialLeave} initialNotiList={data.initialNotiList} initialTaskList={data.initialTaskList} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-10 animate-pulse">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-12 w-64 rounded-xl" /><Skeleton className="h-4 w-96 rounded-lg" /></div>
        <div className="flex gap-3 w-full lg:w-auto"><Skeleton className="h-14 w-full lg:w-40 rounded-2xl" /><Skeleton className="h-14 w-full lg:w-40 rounded-2xl" /></div>
      </div>
      <Skeleton className="h-[200px] w-full rounded-[3rem]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={`page-skeleton-${i}`} className="h-48 rounded-[2.5rem]" />)}
      </div>
    </div>
  );
}
