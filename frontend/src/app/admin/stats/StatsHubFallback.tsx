/**
 * 통계 허브 진입 스켈레톤.
 *
 * `IntelligenceHubClient` 는 탭 상태를 URL(`useSearchParams`)에서 파생하므로(감사 P1-7)
 * 각 라우트에서 `<Suspense>` 경계가 필요하다. 그 fallback 이 1줄짜리 영문 문구이거나
 * 높이가 다르면 진입 때마다 레이아웃이 튄다(CLS) — 실제 레이아웃과 같은 골격·높이를 준다.
 *
 * 훅을 쓰지 않으므로 서버 컴포넌트로 동작한다.
 */
export function StatsHubFallback() {
  return (
    <>
      <h1 className="sr-only">관리자 통계를 불러오는 중</h1>
      <div className="space-y-10 pb-20 animate-pulse" aria-hidden="true">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2 md:px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-11 rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-lg bg-muted" />
            <div className="h-3 w-40 rounded-lg bg-muted" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-11 w-40 rounded-lg bg-muted" />
          <div className="h-11 w-44 rounded-lg bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2">
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="rounded-lg bg-muted/60 p-4 space-y-2">
            {['nav-1', 'nav-2', 'nav-3', 'nav-4', 'nav-5', 'nav-6', 'nav-7'].map((key) => (
              <div key={key} className="h-[76px] rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-[232px] rounded-lg bg-muted" />
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['metric-1', 'metric-2', 'metric-3'].map((key) => (
              <div key={key} className="h-[196px] rounded-lg bg-muted" />
            ))}
          </div>
          <div className="min-h-[500px] rounded-lg bg-muted" />
        </div>
      </div>
      </div>
    </>
  );
}

export default StatsHubFallback;
