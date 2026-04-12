import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';
import AdminStatsClient from './AdminStatsClient';
import { SummaryStats, MenuStats } from '@/types/foundation/stats';

export const metadata = {
  title: '인텔리전스 통계 대시보드 | 전자정부 프레임워크',
  description: '시스템 전반의 활동 데이터와 메트릭스를 실시간으로 분석합니다',
};

export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  let initialSummary: SummaryStats | null = null;
  let initialConnectData: any[] = [];
  let initialMenuData: MenuStats[] = [];

  try {
    const [sumRes, connRes, menuRes] = await Promise.all([
      statsAdminService.getSummary(axiosConfig).catch(() => ({ totalUsers: 0, totalPosts: 0, todayConnects: 0 })),
      statsAdminService.getConnectStats({ fromDate: '20260201', toDate: '20260312' }, axiosConfig).catch(() => []),
      statsAdminService.getMenuStats(axiosConfig).catch(() => [])
    ]);

    initialSummary = sumRes as SummaryStats;

    // Transform connect data for area chart
    initialConnectData = Array.isArray(connRes) ? connRes.map((item: any) => ({
      name: item.statsDate ? `${item.statsDate.substring(4, 6)}/${item.statsDate.substring(6, 8)}` : 'N/A',
      statsCo: item.statsCo || 0
    })) : [];

    initialMenuData = (Array.isArray(menuRes) ? menuRes : []) as any as MenuStats[];
  } catch (error) {
    console.error('Server-side fetch stats failed');
  }

  return (
    <Suspense fallback={<AdminStatsLoading />}>
      <AdminStatsClient
        initialSummary={initialSummary}
        initialConnectData={initialConnectData}
        initialMenuData={initialMenuData}
      />
    </Suspense>
  );
}

function AdminStatsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 p-6">
      <div className="h-14 w-96 bg-slate-100 rounded-[0.1rem]" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={`stats-skeleton-${i}`} className="h-56 bg-slate-50 rounded-[0.1rem]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[450px] bg-slate-50 rounded-[0.1rem]" />
        <div className="h-[450px] bg-slate-900/5 rounded-[0.1rem]" />
      </div>
      <div className="h-96 w-full bg-slate-100 rounded-[0.1rem]" />
    </div>
  );
}
