import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import ProgramAdminClient from './ProgramAdminClient';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';

export const metadata = {
 title: '?œìŠ¤???„ë¡œê·¸ë¨ ë¯¸ë“¤?¨ì–´ | ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
 description: '?œìŠ¤???„í‚¤?ì²˜ ?´ì˜ ê°??„ë¡œê·¸ë¨ê³??”ë“œ?¬ì¸?¸ë? ?•ì˜?˜ê³  ê´€ë¦¬í•©?ˆë‹¤.',
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

  let initialData: PageResponse<Program> = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
  try {
    initialData = await programAdminService.getProgramList({ pageë²ˆí˜¸: 1, size: 10, searchWrd }, axiosConfig);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        redirect('/login?expired=true&redirect=/admin/system/programs');
      }
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
