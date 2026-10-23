import { Suspense } from 'react';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { HomeDataBoundary } from './home-data-boundary';
import UnifiedDashboardClient from './UnifiedDashboardClient';

function DashboardLoading() {
  return (
    <>
      <h1 className="sr-only">통합 대시보드를 불러오는 중</h1>
      <DashboardSkeleton />
    </>
  );
}

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
        [2026-10-23] 카드는 미리 채운 캐시(HomeDataBoundary 의 HydrationBoundary)와 같은 하이드레이션 단위여야 해서 next/dynamic 으로
        감싸지 않는다. 감싸면 카드만 늦게 하이드레이션되고, 그 사이 로그아웃이 캐시를 비우면 카드가 옛 사용자·빈 캐시로 동기
        하이드레이션돼 서버의 'N건' 과 '확인 중' 이 갈렸다(React #418 text, USER 홈 E2E flaky). 'use client' 모듈이라 서버
        컴포넌트에서 정적으로 불러도 별도 청크로 나뉘고, 대기 표시는 위 Suspense 가 맡는다.
      */}
      <Suspense fallback={<DashboardLoading />}>
        <HomeDataBoundary>
          <UnifiedDashboardClient />
        </HomeDataBoundary>
      </Suspense>
    </>
  );
}
