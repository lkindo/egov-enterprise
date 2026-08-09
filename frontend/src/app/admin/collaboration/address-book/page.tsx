import { Suspense } from 'react';
import CollaborationHubClient from '../CollaborationHubClient';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

/** 허브 클라이언트가 `useSearchParams` 로 탭을 읽으므로 Suspense 경계가 필요하다(P1-7). */
export default function AddressBookPage() {
 return (
  <Suspense fallback={<HubListSkeleton />}>
   <CollaborationHubClient defaultTab="ADDRESS_BOOK" />
  </Suspense>
 );
}
