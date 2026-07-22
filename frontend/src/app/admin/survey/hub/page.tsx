import { Suspense } from 'react';
import { SurveyHubClient } from './SurveyHubClient';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 허브 로딩 스켈레톤.
 *
 * 종전에는 `TableSkeleton` 을 fallback 으로 썼는데 그 컴포넌트는 `<tr>` 을 반환한다.
 * `<table>` 밖에서 렌더된 `<tr>` 은 브라우저가 통째로 버리므로 로딩 구간이 **완전 백지**였다.
 * 실제 레이아웃(헤더 → 지표 4카드 → 탭 → 본문)과 같은 높이의 블록으로 교체한다(CLS 억제).
 */
function SurveyHubFallback() {
  return (
    <div className="space-y-12 pb-24" aria-hidden="true">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-11 w-56" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>

      <div className="px-2 space-y-10">
        <Skeleton className="h-16 w-full md:w-80 rounded-lg" />
        <Skeleton className="h-[520px] w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function SurveyHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tighter text-foreground">설문 통합 관리 워크벤치</h1>
        <p className="text-muted-foreground text-sm font-medium">설문 등록부터 통계 분석까지 모든 과정을 한 번에 최적화하여 관리합니다.</p>
      </div>

      <Suspense fallback={<SurveyHubFallback />}>
        <SurveyHubClient />
      </Suspense>
    </div>
  );
}
