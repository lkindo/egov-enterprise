import { Suspense } from 'react';
import { cookies } from 'next/headers';
import {
  internetSvcGuidanceAdminService,
  type InternetSvcGuidance,
} from '@/services/foundation/system/InternetSvcGuidanceAdminService';
import type { PageResponse } from '@/types/foundation/system';
import InternetSvcGuidanceClient from './InternetSvcGuidanceClient';

export const metadata = {
  title: '인터넷 서비스 안내 관리 | 전자정부 프레임워크',
  description: '기관이 제공하는 인터넷 서비스의 안내 문구를 관리합니다.',
};

const PAGE_SIZE = 10;

export default async function InternetSvcGuidancePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 프리페치 실패를 '빈 페이지'로 바꿔치기하면 화면이 "데이터 0건"으로 거짓말한다.
  // null 을 넘겨 클라이언트가 직접 재조회하고, 실패하면 error/onRetry 로 화면에 드러낸다.
  let initialPage: PageResponse<InternetSvcGuidance> | null = null;
  try {
    initialPage = await internetSvcGuidanceAdminService.getGuidanceList(
      { page: 0, size: PAGE_SIZE },
      axiosConfig,
    );
  } catch {
    // null 시드는 클라이언트 재조회와 기존 오류 상태를 유지한다.
  }

  return (
    <Suspense
      fallback={(
        <div className="flex items-center justify-center min-h-[400px]">
          <h1 className="sr-only">인터넷 서비스 안내를 불러오는 중</h1>
          로딩 중..
        </div>
      )}
    >
      <InternetSvcGuidanceClient initialPage={initialPage} />
    </Suspense>
  );
}
