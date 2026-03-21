import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { programAdminService } from '@/services/admin/system/ProgramAdminService';
import ProgramAdminClient from './ProgramAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
 title: '시스템 프로그램 미들웨어 | 전자정부 표준프레임워크',
 description: '시스템 아키텍처 내의 각 프로그램과 엔드포인트를 정의하고 관리합니다.',
};

export default async function ProgramAdminPage({
 searchParams
}: {
 searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
 const resolvedSearchParams = await searchParams;
 const searchWrd = (resolvedSearchParams.searchWrd as string) || '';

 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 let initialData: any = { list: [], total: 0 };
 try {
  initialData = await programAdminService.getProgramList({ pageIndex: 1, size: 10, searchWrd }, axiosConfig);
 } catch (error: any) {
  if (error.response?.status === 401) {
   redirect('/login?expired=true&redirect=/admin/system/programs');
  }
  console.error('Server-side fetch programs failed:', error);
 }

 return (
 <Suspense fallback={<ProgramAdminLoading />}>
 <ProgramAdminClient initialData={initialData} searchWrd={searchWrd} />
 </Suspense>
 );
}

function ProgramAdminLoading() {
 return (
 <div className="max-w-6xl mx-auto space-y-10 animate-pulse">
 <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-50 rounded-[2.5rem]" />)}
 </div>
 <div className="h-24 w-full bg-slate-50 rounded-[3rem]" />
 <div className="h-96 w-full bg-slate-100/50 rounded-[3rem]" />
 </div>
 );
}
