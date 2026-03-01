import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { statsAdminService } from '@/services/admin/stats/StatsAdminService';
import AdminStatsClient from './AdminStatsClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '인텔리전스 통계 대시보드 | 전자정부 표준프레임워크',
  description: '시스템 전반의 활동 데이터와 도메인 지표를 실시간으로 분석합니다.',
};

export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  let initialSummary = null;
  let initialConnectData: any[] = [];
  let initialMenuData: any[] = [];

  try {
    const [sumRes, connRes, menuRes] = await Promise.all([
      statsAdminService.getSummary(axiosConfig).catch(() => ({ totalUsers: 0, totalPosts: 0, todayConnects: 0, pendingTroubles: 0 })),
      statsAdminService.getConnectStats({ startDate: '20260201', endDate: '20260214' }, axiosConfig).catch(() => []),
      statsAdminService.getMenuStats(axiosConfig).catch(() => [])
    ]);

    initialSummary = sumRes;

    // Transform connect data for area chart
    initialConnectData = Array.isArray(connRes) ? connRes.map((item: any) => ({
      name: item.date.substring(4, 6) + '/' + item.date.substring(6, 8),
      count: item.count
    })) : [];

    initialMenuData = Array.isArray(menuRes) ? menuRes : [];
  } catch (error) {
    console.error('Server-side fetch stats failed:', error);
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
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[450px] bg-slate-50 rounded-[4rem]" />
        <div className="h-[450px] bg-slate-900/5 rounded-[4rem]" />
      </div>
      <div className="h-96 w-full bg-slate-100 rounded-[5rem]" />
    </div>
  );
}
