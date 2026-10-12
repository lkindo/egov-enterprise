'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 업무 홈의 '실시간 상태' 구역(Phase 2 9단계 — 종전 UnifiedDashboardClient 의 실시간 블록을 옮겼다). 실시간 대시보드 기능 소유이고
 * 업무 홈 셸에는 home-sections 기여(extensions/dashboard/home-sections.ts)로 들어간다. 노출은 DASHBOARD_READ — 통계 방송 구독
 * (/topic/dashboard/stats)과 같은 권한이다.
 *
 * 실시간 본문은 웹소켓 구독이라 브라우저에서만 그린다(ssr:false). ssr:false 는 서버 컴포넌트에서 쓸 수 없으므로 이 모듈은
 * 'use client' 다(서버 자식도 레지스트리를 읽는다, 경계 계약).
 */
const RealTimeDashboard = dynamic(() => import('@/components/features/dashboard/RealTimeDashboard').then(mod => mod.RealTimeDashboard), {
  loading: () => <Skeleton className="h-[150px] w-full rounded-lg" />,
  ssr: false,
});

export function RealTimeHomeSection() {
  return (
    <section aria-labelledby="home-realtime" className="rounded-md border border-border bg-card p-4">
      <h2 id="home-realtime" className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">
        실시간 상태
      </h2>
      <RealTimeDashboard />
    </section>
  );
}
