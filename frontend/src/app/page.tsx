import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
/* reusable-base:collaboration:start */
import { cache } from 'react';
import { loadDashboardData } from './dashboard-data';
/* reusable-base:collaboration:end */

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

/* reusable-base:collaboration:start */
/**
 * P3: Server-side Data Refinement
 * Minifies the JSON payload sent to the client by picking only required fields.
 * cache() ensures that even if this is called multiple times in one request, only one API call is made.
 *
 * [2026-09-13 GAP-PACK-001 ③] 대시보드 API(`/api/v1/dashboard`)는 게시판 응답 타입에 묶여 collaboration pack 과
 * 함께 빠진다. 이 조회를 블록 밖에 두면 core 프로필의 로그인 착지(`/`)가 없는 API 를 불러 오류 화면이 된다.
 */
const getDashboardData = cache(loadDashboardData);
/* reusable-base:collaboration:end */

export default async function UnifiedDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 속성 목록 안에 마커를 두지 않도록 props 객체로 조립한다 — core 프로필에서는 빈 객체가 된다.
  const clientProps = {
    /* reusable-base:collaboration:start */
    dataPromise: getDashboardData(),
    /* reusable-base:collaboration:end */
  };

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
        <UnifiedDashboardClient {...clientProps} />
      </Suspense>
    </>
  );
}
