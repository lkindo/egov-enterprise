import { Suspense } from 'react';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { Milestone } from 'lucide-react';

export const metadata = {
  title: '?됱젙?쒖?肄붾뱶 嫄곕쾭?뚯뒪 | Sentinel Registry',
  description: '援님 ?됱젙 ?쒖님님곕Ⅸ 踰뺤젙님諛님됱젙님肄붾뱶 泥닿퀎瑜?愿由ы빀?덈떎.',
};

export default async function AdministCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let initialData: any = { list: [], total: 0 };
  try {
   initialData = await codeAdminService.getAdministCodeList({ page踰덊샇: 1, pageUnit: 10 }, axiosConfig);
  } catch (error: any) {
   if (error.response?.status === 401) {
    redirect('/login?expired=true&redirect=/admin/system/codes/administ');
   }
   console.error('Failed to fetch initial administ codes:', error);
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="?됱젙?쒖?肄붾뱶 ?명뀛由ъ쟾님
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '肄붾뱶愿由? }, { label: '?됱젙肄붾뱶' }]}
      />
      
      <Suspense fallback={
        <div className="w-full h-[600px] flex flex-col items-center justify-center gap-6 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200 animate-pulse">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-200/50 flex items-center justify-center">
                <Milestone size={40} className="text-slate-300" />
            </div>
            <div className="space-y-3 text-center">
                <div className="h-4 w-48 bg-slate-200 rounded-full mx-auto" />
                <div className="h-3 w-32 bg-slate-200/60 rounded-full mx-auto" />
            </div>
        </div>
      }>
        <AdministCodeClient initialData={initialData} />
      </Suspense>
    </div>
  );
}

