import { Suspense, cache } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { loadDashboardData } from './dashboard-data';

function DashboardLoading() {
  return (
    <>
      <h1 className="sr-only">통합 대시보드를 불러오는 중</h1>
      <DashboardSkeleton />
    </>
  );
}

/**
 * P2: Dynamic Import for Heavy Dashboard Client
 * Reduces initial bundle size by lazy loading the heavy dashboard component.
 */
const UnifiedDashboardClient = dynamic(() => import('./UnifiedDashboardClient'), {
  loading: () => <DashboardLoading />
});

/**
 * P3: Server-side Data Refinement
 * Minifies the JSON payload sent to the client by picking only required fields.
 * cache() ensures that even if this is called multiple times in one request, only one API call is made.
 */
const getDashboardData = cache(loadDashboardData);

export default async function UnifiedDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const dataPromise = getDashboardData();

  // [PD-UX-002 Q4] 권한이 없어 되돌려진 사실을 화면이 말한다.
  //   `proxy.ts` 는 /admin 접근이 role 로 막히면 여기로 되돌리며 `?auth_error=unauthorized` 를
  //   붙인다. 그런데 그 값을 **읽는 곳이 저장소 전체에 없었다** — 사용자 입장에서는 링크를 눌렀는데
  //   아무 설명 없이 홈으로 순간이동할 뿐이라, 클릭이 실패한 것인지 원래 그런 것인지 알 수 없었다.
  //   자원 이름은 말하지 않는다. 되돌려졌다는 사실만으로 사용자가 다음 행동을 정할 수 있다.
  const params = await searchParams;
  const deniedByRole = params.auth_error === 'unauthorized';

  return (
    <>
      {deniedByRole && (
        <div
          role="status"
          data-testid="dashboard-auth-error"
          className="mx-auto mb-4 max-w-[var(--page-max-w)] rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3 text-sm text-secondary"
        >
          접근 권한이 없어 홈으로 이동했습니다.
        </div>
      )}
      <Suspense fallback={<DashboardLoading />}>
        <UnifiedDashboardClient dataPromise={dataPromise} />
      </Suspense>
    </>
  );
}
