import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import MenuByAuthorityClient, { type FetchResult } from './MenuByAuthorityClient';

export default async function MenuByAuthorityPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate authors promise on server
  // 실패를 빈 목록으로 삼키면 "등록된 역할이 없음"으로 위장되므로 사유를 봉투에 담아 전달한다.
  const authorsPromise: Promise<FetchResult<AuthorInfo[]>> = authorAdminService
    .getAuthorList({ pageNo: 1, searchCondition: '1', searchKeyword: '' }, axiosConfig)
    .then((res) => ({ data: res?.list ?? [], error: null }))
    .catch((error: unknown) => {
      console.error('Server-side fetch authorities failed:', error);
      return {
        data: [] as AuthorInfo[],
        error: error instanceof Error && error.message ? error.message : '권한 목록을 불러오지 못했습니다.',
      };
    });

  return (
    <Suspense fallback={<div className="p-24 text-center text-xs tracking-widest animate-pulse text-muted-foreground">권한 인벤토리를 불러오는 중...</div>}>
      <MenuByAuthorityClient authorsPromise={authorsPromise} />
    </Suspense>
  );
}
