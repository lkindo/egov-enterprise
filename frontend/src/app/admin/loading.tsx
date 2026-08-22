import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { HubMetricSkeleton } from '@/components/ui/hub/HubSkeleton';

/**
 * 관리자(/admin) 세그먼트 공통 로딩 스켈레톤.
 *
 * 이 파일이 없으면 async 관리자 페이지 진입 시 루트 loading.tsx 의 전역 전체화면 스피너가
 * 사이드바까지 덮어버린다. 세그먼트 단위 loading.tsx 를 두면 레이아웃(사이드바/헤더)은 유지된 채
 * 본문 영역만 스켈레톤으로 대체된다. (프론트엔드 헌법 제8조 3항 — Skeleton Screen)
 *
 * 기하학적 형태는 관리자 화면의 공통 골격(PageHeader → 지표 카드 → 데이터 테이블)에 맞춘다.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500" aria-busy="true" aria-live="polite">
      <h1 className="sr-only">관리자 화면을 불러오는 중입니다.</h1>

      {/* 1. PageHeader 자리 — 브레드크럼 + 타이틀 + 액센트 바 */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="flex items-center gap-2 ml-0.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4 min-w-0">
            <Skeleton className="h-11 md:h-14 w-64 md:w-96 rounded-lg" />
            <div className="flex gap-1.5">
              <div className="h-1.5 w-12 bg-primary/30 rounded-lg animate-pulse" />
              <div className="h-1.5 w-1.5 bg-primary/20 rounded-full" />
              <div className="h-1.5 w-1.5 bg-primary/10 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-32 rounded-lg" />
            <Skeleton className="h-11 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 2. 지표 카드 4종 — 기존 허브 스켈레톤 자산 재사용 */}
      <HubMetricSkeleton />

      {/* 3. 검색/필터 바 자리 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Skeleton className="h-12 w-full max-w-md rounded-lg" />
        <Skeleton className="h-12 w-28 rounded-lg" />
      </div>

      {/* 4. 데이터 테이블 자리 — StandardDataTable 의 데스크톱 골격과 동일 치수 */}
      <div className="w-full border-2 border-border/60 bg-card rounded-2xl shadow-sm overflow-hidden">
        {/* 헤더 행 */}
        <div className="hidden md:grid grid-cols-4 gap-6 px-6 py-5 bg-muted/80 border-b-2 border-border/80">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={`admin-loading-th-${i}`} className="h-3 w-24 rounded" />
          ))}
        </div>
        {/* 데이터 행 */}
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={`admin-loading-tr-${row}`} className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5">
              {[1, 2, 3, 4].map((col) => (
                <Skeleton
                  key={`admin-loading-td-${row}-${col}`}
                  className={cn('h-4 rounded', col === 1 ? 'w-3/4' : 'w-1/2', col > 2 && 'hidden md:block')}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 5. 페이저 자리 */}
      <div className="flex items-center justify-center gap-3 pt-8 pb-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="w-28 h-12 rounded-lg" />
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}
