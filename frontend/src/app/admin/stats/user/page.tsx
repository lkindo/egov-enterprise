import { Suspense } from 'react';
import IntelligenceHubClient from '../IntelligenceHubClient';
import { StatsHubFallback } from '../StatsHubFallback';

export const metadata = {
  title: '사용자 통계 | 전자정부 프레임워크',
  description: '사용자 활동 집계 추이를 분석합니다',
};

export default function UserStatsPage() {
  // Suspense 경계 필수 — 허브가 `useSearchParams()` 로 탭 상태를 URL 에서 파생한다(감사 P1-7).
  return (
    <Suspense fallback={<StatsHubFallback />}>
      <IntelligenceHubClient defaultTab="USER_STATS" />
    </Suspense>
  );
}
