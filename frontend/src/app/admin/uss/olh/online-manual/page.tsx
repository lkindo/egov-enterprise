import { Suspense } from 'react';
import { manualAdminService } from '@/services/foundation/user/ManualAdminService';
import { cookies } from 'next/headers';
import ManualAdminClient from './ManualAdminClient';

export const metadata = {
  title: '온라인 매뉴얼 관리 | 부가서비스',
};

export default async function ManualAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // 첫 페이지만 프리페치한다. 페이지 이동·검색은 클라이언트 쿼리가 담당하며,
  // 실패를 빈 목록으로 바꾸면 화면이 '0건'이라고 거짓말하므로 null(시드 없음)을 넘긴다(감사 P1-1).
  const initialManuals = await manualAdminService.getManualList({
    page: 0,
    size: 10
  }, axiosConfig).catch((error: unknown) => {
    console.error('[manual-admin] 매뉴얼 목록 프리페치 실패:', error);
    return null;
  });

  // 클라이언트가 useSearchParams(페이지 URL 동기화)를 쓰므로 Suspense 경계를 둔다.
  return (
    <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse">매뉴얼 목록을 불러오는 중입니다...</div>}>
      <ManualAdminClient initialManuals={initialManuals} />
    </Suspense>
  );
}
