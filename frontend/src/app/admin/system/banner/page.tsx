import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import { popupAdminService } from '@/services/foundation/system/PopupAdminService';
import BannerAdminClient from './BannerAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
 title: '?œìŠ¤???ë³´ ?”ì§„ ìµœì ??| ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
 description: '?œìŠ¤???„ë°˜???¸ì¶œ?˜ëŠ” ë°°ë„ˆ?€ ?ì—… ?ì‚°??ê³ ì„±???„í‚¤?ì²˜ë¡?ê´€ë¦¬í•©?ˆë‹¤.',
};

export default async function BannerAdminPage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 // [Eliminating Waterfalls] ë³‘ë ¬ ?°ì´???¸ì¶œ
 let initialBanners: any[] = [];
 let initialPopups: any[] = [];

 try {
 const [bannersRes, popupsRes] = await Promise.all([
 bannerAdminService.getBannerList({ page: 0, size: 50 }, axiosConfig),
 popupAdminService.getPopupList({ page: 0, size: 50 }, axiosConfig)
 ]);

 initialBanners = (bannersRes as any)?.content || [];
 initialPopups = (popupsRes as any)?.content || [];
 } catch (error: any) {
 console.error('Server-side fetch banners/popups failed:', error);
    
    // ë§Œì•½ 401 ?ëŸ¬(?¸ì¦ ë§Œë£Œ)?¼ë©´ ë¡œê·¸???˜ì´ì§€ë¡?ë¦¬ë‹¤?´ë ‰??    if (error.response?.status === 401) {
      const { redirect } = await import('next/navigation');
      redirect('/login?expired=true&redirect=/admin/system/banner');
    }
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
