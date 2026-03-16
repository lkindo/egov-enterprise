import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { bannerAdminService } from '@/services/admin/system/BannerAdminService';
import { popupAdminService } from '@/services/admin/system/PopupAdminService';
import BannerAdminClient from './BannerAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '시스템 홍보 엔진 최적화 | 전자정부 표준프레임워크',
  description: '시스템 전반에 노출되는 배너와 팝업 자산을 고성능 아키텍처로 관리합니다.',
};

export default async function BannerAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  let initialBanners: any[] = [];
  let initialPopups: any[] = [];

  try {
    const [bannersRes, popupsRes] = await Promise.all([
      bannerAdminService.getBannerList({ page: 0, size: 50 }, axiosConfig),
      popupAdminService.getPopupList({ page: 0, size: 50 }, axiosConfig)
    ]);

    initialBanners = (bannersRes as any)?.content || [];
    initialPopups = (popupsRes as any)?.content || [];
  } catch (error) {
    console.error('Server-side fetch banners/popups failed:', error);
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
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="flex justify-center">
        <div className="h-20 w-[400px] bg-slate-50 rounded-[2.5rem]" />
      </div>
      <div className="h-40 w-full bg-slate-100 rounded-[4rem]" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="h-96 w-full bg-slate-100/50 rounded-[4.5rem]" />
    </div>
  );
}
