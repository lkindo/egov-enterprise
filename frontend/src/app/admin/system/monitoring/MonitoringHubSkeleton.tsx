import { Skeleton } from '@/components/ui/skeleton';

/**
 * 모니터링 허브 로딩 스켈레톤.
 *
 * 실제 레이아웃(헤더 → 히어로 → 3:5:4 그리드)을 1:1 로 모사한다.
 * 과거에는 `TableSkeleton`(=`<tr>` 조각)을 `<table>` 밖에서 렌더해 브라우저가 행을 폐기,
 * 로딩 구간 내내 완전 백지가 됐다(감사 dc-07 / P1-11).
 */
export function MonitoringHubSkeleton() {
  return (
    <div className="space-y-12 pb-24" aria-busy="true" aria-live="polite">
      <h1 className="sr-only">통합 모니터링을 불러오는 중</h1>
      <div className="space-y-3">
        <Skeleton className="h-4 w-48 rounded-lg" />
        <Skeleton className="h-9 w-80 rounded-lg" />
      </div>

      <Skeleton className="h-40 w-full rounded-lg" />

      <div className="grid grid-cols-12 gap-12 px-2">
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-lg" />
          ))}
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Skeleton className="h-[640px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
