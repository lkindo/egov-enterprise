import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { statsAdminService, type StatsPoint } from '@/services/foundation/system/StatsAdminService';
import IntelligenceHubClient from './IntelligenceHubClient';
import AdminStatsClient from './AdminStatsClient';
import { SummaryStats } from '@/types/foundation/stats';

export const metadata = {
  title: '관리자 통계 | 전자정부 프레임워크',
  description: '최근 1개월 접속 집계와 누적 현황을 확인합니다',
};

/**
 * 집계 수치 정규화 — 숫자가 아니면 null. (문자열 숫자도 허용)
 * [2026-09-15 DEC-OPS-100] 종전에는 0 을 돌려줘, 응답 형태가 어긋나면 "누적 사용자 0" 처럼 사실이 아닌 값을 보였다.
 */
function toCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * 통계 요약(/admin/stats). 요약·접속 집계는 서버에서 미리 읽고, 화면은 통계 셸이 그린다.
 *
 * [2026-10-20] 종전에는 이 라우트가 요약 화면(AdminStatsClient)만 그려 통계 하위 화면으로 가는 내비게이션이 없었다 — 셸의 '통계
 * 개요' 탭을 누르면 되돌아갈 길 없는 다른 화면으로 떨어졌다. 이제 요약 화면을 셸에 넘겨 셸이 같은 내비게이션과 함께 그리고, 이 경로의
 * `?tab=` 이 고르는 기능 탭(전용 라우트 없는 본문 탭)도 같은 셸이 그린다.
 */
export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  // ⚠ 개별 호출을 `.catch(() => [])` 로 삼키지 않는다. 실패를 "데이터 0건"으로 위장하면
  //    화면이 정상처럼 보이면서 장애가 은폐된다(2026-07-22 감사 P0-22 / P1-1).
  let initialSummary: SummaryStats | null = null;
  let initialConnectData: StatsPoint[] = [];
  let loadError: string | null = null;

  try {
    // 기간 파라미터는 넘기지 않는다 → 백엔드가 "오늘까지 최근 1개월"을 기본 적용한다.
    // (과거에는 20260201~20260312 하드코딩이라 시간이 지나면 항상 빈 결과였다.)
    const [sumRes, connRes] = await Promise.all([
      statsAdminService.getSummary(axiosConfig),
      statsAdminService.getConnectStats(undefined, axiosConfig),
    ]);

    // `getSummary()` 의 반환 타입은 `Record<string, unknown>` 이다(서비스 계약).
    // 이중 캐스팅(`as unknown as SummaryStats`)으로 덮지 않고 실제 값 형태를 검사해 정규화한다.
    // 백엔드 SummaryStatsDto 는 {totalUsers, totalPosts, todayConnects} 3개 long 필드다.
    initialSummary = {
      totalUsers: toCount(sumRes?.totalUsers),
      totalPosts: toCount(sumRes?.totalPosts),
      todayConnects: toCount(sumRes?.todayConnects),
    };

    // [2026-10-20] 접속 집계는 생성 계약이 검증한 {date, value} 오름차순이다 — 형식·순서를 다시 가공하지 않는다.
    initialConnectData = connRes;
  } catch {
    loadError = '통계 데이터를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 새로고침해 주세요.';
    initialSummary = null;
    initialConnectData = [];
  }

  return (
    <Suspense fallback={<AdminStatsLoading />}>
      <IntelligenceHubClient
        defaultTab="DASHBOARD"
        overview={(
          <AdminStatsClient
            initialSummary={initialSummary}
            initialConnectData={initialConnectData}
            loadError={loadError}
          />
        )}
      />
    </Suspense>
  );
}

function AdminStatsLoading() {
  return (
    /* 루트 layout 이 이미 `max-w-7xl mx-auto p-6/md:p-12/lg:p-16` 을 주므로 여기서 여백을 다시 주지 않는다(감사 P2) */
    <div className="space-y-12 animate-pulse pb-24">
      <h1 className="sr-only">관리자 통계를 불러오는 중</h1>
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
