import React, { Suspense } from 'react';
import CollaborationHubClient from './CollaborationHubClient';
import { Metadata } from 'next';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

export const metadata: Metadata = {
  title: '협업 매트릭스 | eGov Enterprise',
  description: '조직 내 지식 공유 및 커뮤니케이션을 위한 통합 협업 허브',
};

/**
 * 탭 상태는 클라이언트가 `useSearchParams` 로 URL 에서 직접 읽는다(P1-7).
 * `useSearchParams` 는 Suspense 경계 안에 있어야 하므로 여기서 감싼다.
 */
export default function CollaborationHubPage() {
  return (
    <Suspense fallback={<HubListSkeleton />}>
      <CollaborationHubClient defaultTab="MESSAGES" />
    </Suspense>
  );
}
