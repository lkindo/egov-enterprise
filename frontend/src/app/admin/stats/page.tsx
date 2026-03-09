import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { statsAdminService } from '@/services/admin/stats/StatsAdminService';
import AdminStatsClient from './AdminStatsClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '?명뀛由ъ쟾???듦퀎 ??쒕낫??| ?꾩옄?뺣? ?쒖??꾨젅?꾩썙??,
  description: '?쒖뒪???꾨컲???쒕룞 ?곗씠?곗? ?꾨찓??吏?쒕? ?ㅼ떆媛꾩쑝濡?遺꾩꽍?⑸땲??',
};

export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 蹂묐젹 ?곗씠???몄텧
  let initialSummary = null;
  let initialConnectData: any[] = [];
  let initialMenuData: any[] = [];

  try {
    const [sumRes, connRes, menuRes] = await Promise.all([
      statsAdminService.getSummary(axiosConfig).catch(() => ({ totalUsers: 0, totalPosts: 0, todayConnects: 0 })),
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
        {[1, 2, 3, 4].map(i => <div key={`stats-skeleton-${i}`} className="h-56 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[450px] bg-slate-50 rounded-[4rem]" />
        <div className="h-[450px] bg-slate-900/5 rounded-[4rem]" />
      </div>
      <div className="h-96 w-full bg-slate-100 rounded-[5rem]" />
    </div>
  );
}

