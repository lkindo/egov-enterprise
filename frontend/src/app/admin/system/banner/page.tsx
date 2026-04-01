import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import { popupAdminService } from '@/services/foundation/system/PopupAdminService';
import BannerAdminClient from './BannerAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
 title: '?쒖뒪님?띾낫 ?붿쭊 理쒖쟻님| ?꾩옄?뺣? ?쒖님꾨젅?꾩썙님,
 description: '?쒖뒪님?꾨컲님?몄텧?섎뒗 諛곕꼫? ?앹뾽 ?먯궛님怨좎꽦님?꾪궎?띿쿂濡?愿由ы빀?덈떎.',
};

export default async function BannerAdminPage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 // [Eliminating Waterfalls] 蹂묐젹 ?곗씠님?몄텧
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
    
    // 留뚯빟 401 ?먮윭(?몄쬆 留뚮즺)?쇰㈃ 濡쒓렇님?섏씠吏濡?由щ떎?대젆님    if (error.response?.status === 401) {
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

