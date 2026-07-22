import { Suspense } from 'react';
import IntelligenceHubClient from '../IntelligenceHubClient';
import { StatsHubFallback } from '../StatsHubFallback';

export const metadata = {
  title: '보고서 통계 | 전자정부 프레임워크',
  description: '운영 보고서 등록 집계 추이를 분석합니다',
};

export default function ReportPage() {
  // Suspense 경계 필수 — 허브가 `useSearchParams()` 로 탭 상태를 URL 에서 파생한다(감사 P1-7).
  return (
    <Suspense fallback={<StatsHubFallback />}>
      <IntelligenceHubClient defaultTab="REPORTS" />
    </Suspense>
  );
}
