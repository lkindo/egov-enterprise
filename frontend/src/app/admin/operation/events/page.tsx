import { Suspense } from 'react';
import { Metadata } from 'next';
import EventManagementClient from './EventManagementClient';

export const metadata: Metadata = {
  title: '행사 정보 관리 | eGov Enterprise System',
  description: '에고브 엔터프라이즈 통합 행사 및 운영 관리 센터',
};

export default function EventManagementPage() {
  // 루트 레이아웃이 이미 `max-w-7xl p-6/md:p-12/lg:p-16` 을 제공하므로 화면별 이중 여백을 두지 않는다.
  // useSearchParams(페이지 URL 동기화)를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><h1 className="sr-only">이벤트 관리를 불러오는 중</h1>로딩 중..</div>}>
      <EventManagementClient />
    </Suspense>
  );
}
