import { Suspense } from 'react';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { Milestone } from 'lucide-react';

export const metadata = {
  title: '?‰ì •?œì?ì½”ë“œ ê±°ë²„?ŒìŠ¤ | Sentinel Registry',
  description: 'êµ?? ?‰ì • ?œì????°ë¥¸ ë²•ì •??ë°??‰ì •??ì½”ë“œ ì²´ê³„ë¥?ê´€ë¦¬í•©?ˆë‹¤.',
};

export default async function AdministCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let initialData: any = { list: [], total: 0 };
  try {
   initialData = await codeAdminService.getAdministCodeList({ pageë²ˆí˜¸: 1, pageUnit: 10 }, axiosConfig);
  } catch (error: any) {
   if (error.response?.status === 401) {
    redirect('/login?expired=true&redirect=/admin/system/codes/administ');
   }
   console.error('Failed to fetch initial administ codes:', error);
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="?‰ì •?œì?ì½”ë“œ ?¸í…”ë¦¬ì „??
        breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: 'ì½”ë“œê´€ë¦? }, { label: '?‰ì •ì½”ë“œ' }]}
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
