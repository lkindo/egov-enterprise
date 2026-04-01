import { Suspense } from 'react';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import InstitutionCodeClient from './InstitutionCodeClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { Building2 } from 'lucide-react';

export const metadata = {
  title: '怨듦났湲곌? ?몄뒪?댁뒪 嫄곕쾭?뚯뒪 | Sentinel Registry',
  description: '?꾧뎅 ?됱젙 湲곌? 諛?怨듦났 湲곌님님쒖뒪님?앸퀎 肄붾뱶瑜님숆린?뷀븯怨?愿由ы빀?덈떎.',
};

export default async function InstitutionCodePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let initialData: any = { list: [], total: 0 };
  try {
   initialData = await codeAdminService.getInstitutionCodeList({ page踰덊샇: 1, pageUnit: 10 }, axiosConfig);
  } catch (error: any) {
   if (error.response?.status === 401) {
    redirect('/login?expired=true&redirect=/admin/system/codes/institution');
   }
   console.error('Failed to fetch initial institution codes:', error);
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="怨듦났湲곌? 노드 ?명뀛由ъ쟾님
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '肄붾뱶愿由? }, { label: '湲곌?肄붾뱶' }]}
      />
      
      <Suspense fallback={
        <div className="w-full h-[600px] flex flex-col items-center justify-center gap-6 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200 animate-pulse">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-200/50 flex items-center justify-center">
                <Building2 size={40} className="text-slate-300" />
            </div>
            <div className="space-y-3 text-center">
                <div className="h-4 w-48 bg-slate-200 rounded-full mx-auto" />
                <div className="h-3 w-32 bg-slate-200/60 rounded-full mx-auto" />
            </div>
        </div>
      }>
        <InstitutionCodeClient initialData={initialData} />
      </Suspense>
    </div>
  );
}

