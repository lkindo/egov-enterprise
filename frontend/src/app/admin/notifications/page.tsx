import { Suspense } from 'react';
import NotificationsClient from './NotificationsClient';

export default function Page() {
  // 뷰 상태를 URL(?view=)에서 파생시키므로 useSearchParams 를 사용한다.
  // 정적 렌더 경계에서 CSR bailout 이 나지 않도록 Suspense 로 감싼다.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-lg bg-muted"><h1 className="sr-only">알림 센터를 불러오는 중</h1></div>}>
      <NotificationsClient />
    </Suspense>
  );
}
