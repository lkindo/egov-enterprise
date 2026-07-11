import { Suspense } from 'react';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import AdministCodeClient from './AdministCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { Milestone } from 'lucide-react';

export const metadata = {
  title: '행정코드 관리 | 전자정부 표준프레임워크',
  description: '법정동 및 행정동 코드를 관리합니다.',
};

export default async function AdministCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let initialData: any = { list: [], total: 0 };
  try {
    // 변수명 pageNo로 정규화
    initialData = await codeAdminService.getAdministCodeList({ pageNo: 1, pageUnit: 10 }, axiosConfig);
  } catch (error: any) {
    if (error.response?.status === 401) {
      redirect('/login?expired=true&redirect=/admin/system/codes/administ');
    }
    console.error('Failed to fetch initial administ codes:', error);
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="행정 표준코드 관리"
        breadcrumbs={[{ label: '시스템 관리' }, { label: '코드 관리' }, { label: '행정 코드' }]}
      />
      
      <Suspense fallback={
        <div className="w-full h-[600px] flex flex-col items-center justify-center gap-6 bg-muted/50 rounded-lg border-2 border-dashed border-border animate-pulse">
            <div className="w-20 h-11 rounded-lg bg-slate-200/50 flex items-center justify-center">
                <Milestone size={40} className="text-slate-300" />
            </div>
            <div className="space-y-3 text-center">
                <div className="h-4 w-48 bg-slate-200 rounded-lg mx-auto" />
                <div className="h-3 w-32 bg-slate-200/60 rounded-lg mx-auto" />
            </div>
        </div>
      }>
        <AdministCodeClient initialData={initialData} />
      </Suspense>
    </div>
  );
}
