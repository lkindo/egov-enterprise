import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { HomeDataBoundary } from './home-data-boundary';

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

export default async function UnifiedDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
      {/*
        [Phase 2 9단계] 업무 데이터는 기능이 업무 홈에 기여한 조회(home-sections)를 서버 자식이 이 Suspense 안에서 미리 채운다.
        page 본문은 searchParams 만 기다린다 — 데이터를 여기서 기다리면 대기 동안 루트 전체화면 덮개(loading.tsx)가 보인다.
      */}
      <Suspense fallback={<DashboardLoading />}>
        <HomeDataBoundary>
          <UnifiedDashboardClient />
        </HomeDataBoundary>
      </Suspense>
    </>
  );
}
