import { Suspense } from 'react';
import MonitoringHubClient from './MonitoringHubClient';
import { MonitoringHubSkeleton } from './MonitoringHubSkeleton';

export default function MonitoringPage() {
  // `MonitoringHubClient` 는 `useSearchParams` 를 사용하므로 Suspense 경계가 필요하다.
  // (기존에는 이 경로에만 경계가 없어 로딩 폴백이 전혀 표시되지 않았다 — hub/page.tsx 와 규약 통일)
  return (
    <Suspense fallback={<MonitoringHubSkeleton />}>
      <MonitoringHubClient />
    </Suspense>
  );
}
