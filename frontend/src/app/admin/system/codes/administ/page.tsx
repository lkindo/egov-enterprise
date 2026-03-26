import { Suspense } from 'react';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { Milestone } from 'lucide-react';

export const metadata = {
  title: '행정표준코드 거버넌스 | Sentinel Registry',
  description: '국가 행정 표준에 따른 법정동 및 행정동 코드 체계를 관리합니다.',
};

export default async function AdministCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let initialData: any = { list: [], total: 0 };
  try {
   initialData = await codeAdminService.getAdministCodeList({ page번호: 1, pageUnit: 10 }, axiosConfig);
  } catch (error: any) {
   if (error.response?.status === 401) {
    redirect('/login?expired=true&redirect=/admin/system/codes/administ');
   }
   console.error('Failed to fetch initial administ codes:', error);
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="행정표준코드 인텔리전스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '행정코드' }]}
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
