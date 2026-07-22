import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';
import AdminStatsClient from './AdminStatsClient';
import { SummaryStats, ConnectPoint } from '@/types/foundation/stats';

export const metadata = {
  title: '인텔리전스 통계 대시보드 | 전자정부 프레임워크',
  description: '시스템 전반의 활동 데이터와 메트릭스를 실시간으로 분석합니다',
};

export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  // ⚠ 개별 호출을 `.catch(() => [])` 로 삼키지 않는다. 실패를 "데이터 0건"으로 위장하면
  //    화면이 정상처럼 보이면서 장애가 은폐된다(2026-07-22 감사 P0-22 / P1-1).
  let initialSummary: SummaryStats | null = null;
  let initialConnectData: ConnectPoint[] = [];
  let loadError: string | null = null;

  try {
    // 기간 파라미터는 넘기지 않는다 → 백엔드가 "최근 1개월"을 기본 적용한다.
    // (과거에는 20260201~20260312 하드코딩이라 시간이 지나면 항상 빈 결과였다.)
    const [sumRes, connRes] = await Promise.all([
      statsAdminService.getSummary(axiosConfig),
      statsAdminService.getConnectStats(undefined, axiosConfig),
    ]);

    initialSummary = sumRes as unknown as SummaryStats;

    // Transform connect data for area chart / table
    initialConnectData = (Array.isArray(connRes) ? connRes : []).map((item) => {
      const statsDate = typeof item.statsDate === 'string' ? item.statsDate : '';
      return {
        statsDate,
        name: statsDate.length === 8
          ? `${statsDate.substring(4, 6)}/${statsDate.substring(6, 8)}`
          : (statsDate || 'N/A'),
        statsCo: typeof item.statsCo === 'number' ? item.statsCo : 0,
      };
    });
  } catch (error) {
    console.error('[admin/stats] 통계 데이터 조회 실패', error);
    loadError = '통계 데이터를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 새로고침해 주세요.';
    initialSummary = null;
    initialConnectData = [];
  }

  return (
    <Suspense fallback={<AdminStatsLoading />}>
      <AdminStatsClient
        initialSummary={initialSummary}
        initialConnectData={initialConnectData}
        loadError={loadError}
      />
    </Suspense>
  );
}

function AdminStatsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 p-6">
      <div className="h-11 w-96 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={`stats-skeleton-${i}`} className="h-56 bg-muted rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 h-[450px] bg-muted rounded-lg" />
        <div className="h-[450px] bg-muted rounded-lg" />
      </div>
      <div className="h-96 w-full bg-muted rounded-lg" />
    </div>
  );
}
