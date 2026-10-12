'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { homeSections } from '@/extensions/generated-home-sections';
import type { HomeSection } from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import { homeAccessDenied } from './home-access';

// Optimization: Priority 2 - Dynamic Imports for heavy components
const ActivityFeed = dynamic(() => import('@/app/components/dashboard/ActivityFeed').then(mod => mod.ActivityFeed), {
  loading: () => <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>,
  ssr: false
});

/**
 * 업무 홈 — 포털형 랜딩의 대체.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3(공통 규칙)·§7 W4.
 *
 * 종전에는 인사말 히어로 → 배너 슬라이더 → 실시간 위젯 → 큰 요약 카드 3장 → 480px 고정 높이
 * 목록 카드 순서라, "내가 지금 처리해야 할 것"이 화면 한참 아래에 있었다. 순서를 뒤집어
 * **처리 대기 → 내 목록 → 상태·활동 → 홍보**로 놓는다.
 *
 * [Phase 2 9단계] 이 화면은 모든 재사용 구성에 남는 core 셸이다(로그인 착지, DEC-OPS-083). 카드·목록·단추·실시간·홍보는 데이터를 가진
 * 기능이 home-sections 슬롯에 기여한 컴포넌트이고, 셸은 배치마다 순서대로 그리기만 한다 — 종전에는 셸이 기능 데이터를 직접 조립해
 * pack 마커 블록 24개로 가렸다. 기능이 빠진 구성에서는 기여 파일이 함께 지워지고 레지스트리가 남은 기여로 다시 만들어진다.
 * 서버 자식(home-data-boundary.tsx)이 기여의 조회를 미리 채우므로 첫 화면에 값이 있다.
 */

/** 배치별로 나눈 보이는 항목. 레지스트리 순서는 order → 기여 기능 → id 다(visibleEntries). */
function byPlacement(sections: readonly HomeSection[], placement: HomeSection['placement']) {
  return sections.filter(section => section.placement === placement);
}

function renderSections(sections: readonly HomeSection[]) {
  return sections.map(({ id, Component }) => <Component key={id} />);
}

export default function UnifiedDashboardClient() {
  const { user, loading, mfaPending } = useAuth();
  const router = useRouter();
  const sections = useSlotEntries(homeSections);
  const registered = homeSections.some(entries => entries.length > 0);

  // Enrollment revokes the ordinary session; keep its header challenge mounted while hiding home data.
  useEffect(() => {
    if (!loading && !user && !mfaPending) {
      router.replace('/login');
    }
  }, [user, loading, mfaPending, router]);

  if (loading || !user) {
    return (
      <>
        <h1 className="sr-only">업무 홈을 불러오는 중</h1>
        <DashboardSkeleton />
      </>
    );
  }

  // 기능이 기여한 자리가 있으면 DASHBOARD_READ 로 진입을 판정한다(home-access.ts). 서버 자식도 같은 판정으로 미리 채우지 않는다.
  if (homeAccessDenied(user, registered)) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">업무 홈</h1>
        <div role="status" className="rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
          <p className="font-medium text-foreground">업무 홈 대시보드에 접근할 권한이 없습니다.</p>
          <p className="mt-1 text-muted-foreground">메뉴에서 이용 가능한 업무를 선택해 주세요.</p>
        </div>
      </div>
    );
  }

  const actions = byPlacement(sections, 'actions');
  const cards = byPlacement(sections, 'cards');
  const activityNotes = sections.flatMap(section => (section.activityNote ? [section.activityNote] : []));

  return (
    <div className="space-y-4">
      {renderSections(byPlacement(sections, 'overlay'))}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">업무 홈</h1>
          {/* 확인할 일(요약 카드)이 없는 구성에서는 '확인할 일과 업무 현황' 을 약속하지 않는다. */}
          <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
            안녕하세요, {user.name}님.
            {/* [2026-10-01] '오늘 처리할 업무' 는 개인 항목이 결재 대기 하나뿐이라 실제 내용보다 넓었다. */}
            {cards.length > 0 && ' 확인할 일과 업무 현황입니다.'}
          </p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {renderSections(actions)}
          </div>
        )}
      </header>

      {/* 처리 대기 요약 — 목적지가 있는 항목만 링크한다(G10). 열 수를 항목 수에 맞춘다 — 빠진 기능의 빈 열이 남지 않는다. */}
      {cards.length > 0 && (
        <ul className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
          {renderSections(cards)}
        </ul>
      )}

      {renderSections(byPlacement(sections, 'main'))}

      {/* 상태 구역(실시간)이 빠진 구성에서는 활동 구역 하나가 전체 폭을 쓴다. */}
      <div className="grid gap-4 lg:grid-flow-col lg:auto-cols-fr">
        {renderSections(byPlacement(sections, 'status'))}
        <section aria-labelledby="home-activity" className="rounded-md border border-border bg-card p-4">
          <h2 id="home-activity" className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">
            최근 활동
          </h2>
          <ActivityFeed notes={activityNotes} />
        </section>
      </div>

      {renderSections(byPlacement(sections, 'bottom'))}
    </div>
  );
}
