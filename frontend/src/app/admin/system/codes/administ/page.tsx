import { Suspense } from 'react';
import { codeAdminService, AdministCode } from '@/services/foundation/system/CodeAdminService';
import { PageResponse } from '@/types/foundation/system';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Milestone } from 'lucide-react';
import { SITE_IDENTITY } from '@/config/site-identity';
import { logErrorSafely } from '@/lib/safe-error-log';

export const metadata = {
  title: `행정 구역 코드 관리 | ${SITE_IDENTITY.frameworkName}`,
  description: '법정동 및 행정동 코드를 관리합니다.',
};

export default async function AdministCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  /*
   * [P1-1] 실패를 빈 배열로 삼켜 '0건'으로 굳히지 않는다.
   * 클라이언트가 마운트 직후 같은 엔드포인트를 useQuery 로 재조회하고,
   * 실패하면 StandardDataTable 의 error/onRetry 로 화면에 드러난다.
   */
  let initialData: Partial<PageResponse<AdministCode>> = { list: [], total: 0 };
  try {
    // 서버가 읽는 키는 page(1부터)·size 다(ADR-0036).
    initialData = await codeAdminService.getAdministCodeList({ page: 1, size: 10 }, axiosConfig);
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      redirect('/login?expired=true&redirect=/admin/system/codes/administ');
    }
    logErrorSafely('Failed to fetch initial administ codes:', error);
  }

  return (
    <div className="space-y-12">
      {/* 제목·브레드크럼은 A1 셸(WorkListPage)이 소유한다. */}
      <Suspense fallback={
        <div className="w-full h-[600px] flex flex-col items-center justify-center gap-6 bg-muted/50 rounded-lg border-2 border-dashed border-border animate-pulse">
            <div className="w-20 h-11 rounded-lg bg-muted/50 flex items-center justify-center">
                <Milestone size={40} className="text-muted-foreground" />
            </div>
            <div className="space-y-3 text-center">
                <div className="h-4 w-48 bg-muted rounded-lg mx-auto" />
                <div className="h-3 w-32 bg-muted/60 rounded-lg mx-auto" />
            </div>
        </div>
      }>
        <AdministCodeClient initialData={initialData} />
      </Suspense>
    </div>
  );
}
