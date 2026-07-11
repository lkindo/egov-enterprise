import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import ProgramAdminClient from './ProgramAdminClient';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';

export const metadata = {
  title: '시스템 프로그램 미들웨어 | 전자정부 표준프레임워크',
  description: '시스템 아키텍처 내의 각 프로그램과 엔드포인트를 정의하고 통합 관리합니다.',
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

  // totalPageCount -> totalPage (PageResponse 인터페이스와 일치시켜 타입 오류 해결)
  let initialData: PageResponse<Program> = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
  
  try {
    initialData = await programAdminService.getProgramList({ 
        page: 0, 
        size: 10, 
        searchWrd 
    }, axiosConfig);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      redirect('/login?expired=true&redirect=/admin/system/programs');
    }
    console.error('Server-side fetch programs failed:', error);
  }

  return (
    <div className="p-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <Suspense fallback={
        <div className="animate-pulse space-y-12">
          <div className="h-11 bg-muted rounded-lg w-1/3" />
          <div className="h-[600px] bg-muted rounded-lg" />
        </div>
      }>
        {/* searchWrd prop 추가하여 타입 오류 해결 */}
        <ProgramAdminClient initialData={initialData} searchWrd={searchWrd} />
      </Suspense>
    </div>
  );
}
