import { Suspense } from 'react';
import CollaborationHubClient from '../CollaborationHubClient';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

/** 허브 클라이언트가 `useSearchParams` 로 탭을 읽으므로 Suspense 경계가 필요하다(P1-7). */
export default function ScrapsPage() {
 return (
  <Suspense fallback={
   <>
    <h1 className="sr-only">스크랩 허브를 불러오는 중</h1>
    <HubListSkeleton />
   </>
  }>
   <CollaborationHubClient defaultTab="SCRAPS" />
  </Suspense>
 );
}
