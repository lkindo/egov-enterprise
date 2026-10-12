import { Suspense } from 'react';
import CollaborationHubClient from './CollaborationHubClient';
import { Metadata } from 'next';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

export const metadata: Metadata = {
  // 협업 허브는 core 셸이고 탭은 기능의 기여다 — 탭이 없는 구성(core 등)에서도 맞도록 기능 이름을 적지 않는다.
  title: '협업 목록 | eGov Enterprise',
  description: '구성에 포함된 협업 기능의 목록을 탭으로 모아 보는 화면',
};

/**
 * 탭 상태는 클라이언트가 `useSearchParams` 로 URL 에서 직접 읽는다(P1-7).
 * `useSearchParams` 는 Suspense 경계 안에 있어야 하므로 여기서 감싼다.
 */
export default function CollaborationHubPage() {
  return (
    <Suspense fallback={
      <>
        <h1 className="sr-only">협업 허브를 불러오는 중</h1>
        <HubListSkeleton />
      </>
    }>
      <CollaborationHubClient defaultTab="MESSAGES" />
    </Suspense>
  );
}
