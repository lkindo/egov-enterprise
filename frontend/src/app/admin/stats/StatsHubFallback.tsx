/**
 * 통계 허브 진입 스켈레톤.
 *
 * `IntelligenceHubClient` 는 탭 상태를 URL(`useSearchParams`)에서 파생하므로(감사 P1-7)
 * 각 라우트에서 `<Suspense>` 경계가 필요하다. 그 fallback 이 1줄짜리 영문 문구이거나
 * 높이가 다르면 진입 때마다 레이아웃이 튄다(CLS) — 실제 레이아웃과 같은 골격·높이를 준다.
 *
 * [2026-10-20] 하위 화면이 A7 셸(ReportPage)로 옮겨 골격도 그 순서다 — 경로 표시 → 제목 → 내비게이션 → 조회 조건 → 요약 3칸 →
 * 차트 → 원본 표.
 *
 * 훅을 쓰지 않으므로 서버 컴포넌트로 동작한다.
 */
export function StatsHubFallback() {
  return (
    <>
      <h1 className="sr-only">관리자 통계를 불러오는 중</h1>
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="h-[46px] w-64 rounded-md bg-muted" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-md bg-muted" />
            <div className="h-4 w-80 max-w-full rounded-md bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-32 rounded-md bg-muted" />
            <div className="h-8 w-32 rounded-md bg-muted" />
          </div>
        </div>
        <div className="h-9 w-[32rem] max-w-full rounded-md bg-muted" />
        <div className="h-28 rounded-md bg-muted" />
        <div className="grid gap-2 sm:grid-cols-3">
          {['metric-1', 'metric-2', 'metric-3'].map((key) => (
            <div key={key} className="h-[76px] rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-4 w-2/3 rounded-md bg-muted" />
        <div className="h-[400px] rounded-md bg-muted" />
        <div className="h-96 rounded-md bg-muted" />
      </div>
    </>
  );
}
