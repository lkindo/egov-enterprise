import { Suspense } from 'react';
import MonitoringHubClient from '../MonitoringHubClient';
import { MonitoringHubSkeleton } from '../MonitoringHubSkeleton';

export default function MonitoringHubPage() {
  return (
    // [P2] 과거 fallback 이 TableSkeleton(=<tr> 조각)이었다. <table> 밖에서 렌더되면
    //      브라우저가 행을 버려 로딩 중 화면이 완전 백지가 됐다 → 허브 레이아웃 스켈레톤으로 교체.
    <Suspense fallback={<MonitoringHubSkeleton />}>
      <MonitoringHubClient />
    </Suspense>
  );
}
