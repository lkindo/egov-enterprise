'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 업무 홈의 홍보 조각(Phase 2 9단계 — 종전 UnifiedDashboardClient 의 홍보 블록을 옮겼다). 배너·팝업 기능 소유이고 업무 홈 셸에는
 * home-sections 기여(extensions/promotion/home-sections.ts)로 들어간다.
 *
 * 두 조각은 브라우저에서만 그린다(ssr:false) — 팝업은 브라우저 저장소의 '오늘 하루 보지 않기' 를, 배너는 자동 넘김 타이머를 쓴다.
 * ssr:false 는 서버 컴포넌트에서 쓸 수 없으므로 이 모듈은 'use client' 다(서버 자식도 레지스트리를 읽는다, 경계 계약).
 */
const BannerSlider = dynamic(() => import('@/app/components/dashboard/BannerSlider').then(mod => mod.BannerSlider), {
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  ssr: false,
});
const PopupManager = dynamic(() => import('@/app/components/dashboard/PopupManager').then(mod => mod.PopupManager), { ssr: false });

export function HomePopupManager() {
  return <PopupManager />;
}

export function HomeBannerSlider() {
  return (
    <div className="overflow-hidden rounded-md">
      <BannerSlider />
    </div>
  );
}
