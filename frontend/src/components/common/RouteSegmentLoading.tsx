import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface RouteSegmentLoadingProps {
  label: string;
}

/**
 * 일반 업무 라우트(`/approvals`, `/survey`, `/smart-toolkit`, `/note`) 공통 스켈레톤.
 * 전역 오버레이 스피너 대신 본문 영역만 스켈레톤으로 채워 레이아웃 셸과 접근성 상태를 유지한다.
 */
export function RouteSegmentLoading({ label }: RouteSegmentLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="container mx-auto max-w-6xl space-y-8 px-4 py-8"
    >
      <span className="sr-only">{label} 화면을 불러오는 중입니다.</span>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-9 w-56 sm:w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Skeleton className="h-11 w-full max-w-md rounded-lg" />
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      <div className="w-full border border-border/60 bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-4 gap-6 px-6 py-4 bg-muted/60 border-b border-border/60">
          {[1, 2, 3, 4].map((col) => (
            <Skeleton key={`seg-head-${col}`} className="h-3 w-20 rounded" />
          ))}
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={`seg-row-${row}`} className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-4">
              {[1, 2, 3, 4].map((col) => (
                <Skeleton
                  key={`seg-cell-${row}-${col}`}
                  className={cn('h-4 rounded', col === 1 ? 'w-3/4' : 'w-1/2', col > 2 && 'hidden md:block')}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
