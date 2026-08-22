import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import { popupAdminService } from '@/services/foundation/system/PopupAdminService';
import { Banner, Popup } from '@/types/foundation/banner';
import BannerAdminClient from './BannerAdminClient';

export const metadata = {
  title: '배너 및 팝업 관리 | 시스템 설정',
  description: '시스템 전반에 노출되는 배너와 팝업 자산을 관리합니다.',
};

export default async function BannerAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  let initialBanners: Banner[] = [];
  let initialPopups: Popup[] = [];

  try {
    const [bannersRes, popupsRes] = await Promise.all([
      bannerAdminService.getBannerList({ page: 0, size: 20 }, axiosConfig),
      popupAdminService.getPopupList({ page: 0, size: 20 }, axiosConfig)
    ]);

    /*
     * 서비스 반환 타입은 PageResponse(list/total/...) 다.
     * 종전의 `res.content` 는 존재하지 않는 필드라 SSR 초기값이 항상 빈 배열이었다(첫 페인트 공백).
     */
    initialBanners = bannersRes?.list ?? [];
    initialPopups = popupsRes?.list ?? [];
  } catch (error: unknown) {
    // 만약 401 에러(인증 만료)라면 로그인 페이지로 리다이렉트
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      const { redirect } = await import('next/navigation');
      redirect('/login?expired=true&redirect=/admin/system/banner');
    }
    /*
     * [P1-1] 그 외 실패는 여기서 삼키지 않는다. 클라이언트가 마운트 직후 동일 엔드포인트를
     * useQuery 로 다시 조회하고, 실패하면 StandardDataTable 의 error/onRetry 로 화면에 드러난다.
     * (SSR 초기값을 빈 배열로 두어도 "0건"으로 굳지 않는 이유가 여기에 있다.)
     */
  }

  return (
    <Suspense fallback={<BannerAdminLoading />}>
      <BannerAdminClient
        initialBanners={initialBanners}
        initialPopups={initialPopups}
      />
    </Suspense>
  );
}

function BannerAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse">
      <h1 className="sr-only">배너와 팝업 관리를 불러오는 중</h1>
      <div className="h-11 w-96 bg-muted rounded-lg" />
      <div className="flex justify-center">
        <div className="h-11 w-[400px] bg-muted rounded-lg" />
      </div>
      <div className="h-40 w-full bg-muted rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted rounded-lg" />)}
      </div>
      <div className="h-96 w-full bg-muted/50 rounded-lg" />
    </div>
  );
}
