import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { vacationAdminService } from '@/services/admin/vacation/VacationAdminService';
import type { Vacation } from '@/types/vacation';
import VacationClient from './VacationClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '전사 휴가 관리 및 승인 | 전자정부 표준프레임워크',
  description: '전체 임직원의 휴가 신청 현황을 모니터링하고 승인 프로세스를 관리합니다.',
};

export default async function AdminVacationPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const searchWrd = (resolvedSearchParams.searchWrd as string) || '';
  const status = (resolvedSearchParams.status as string) || '';

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  const year = new Date().getFullYear().toString();

  // Parallel fetching to eliminate waterfalls
  let vacationsData = { content: [] as Vacation[], totalElements: 0, totalPages: 0 };
  let statsData: any[] = [];

  try {
    const [vRes, sRes] = await Promise.all([
      vacationAdminService.getAllVacations({ page: 0, size: 50, searchWrd }, axiosConfig),
      vacationAdminService.getYearlyLeaveStats(year, axiosConfig)
    ]);
    vacationsData = vRes as any;
    statsData = sRes as any;
  } catch (error) {
    console.error('Server-side fetch vacations failed:', error);
  }

  // [Server Serialization Optimization]
  const optimizedContent = selectFieldsList(vacationsData.content, [
    'applcntId', 'vcatnSe', 'vcatnSeNm', 'bgnde', 'endde', 'vcatnResn', 'confmAt'
  ]);

  return (
    <Suspense fallback={<VacationLoading />}>
      <VacationClient
        initialVacations={optimizedContent as Vacation[]}
        initialStats={statsData}
        searchWrd={searchWrd}
        status={status}
      />
    </Suspense>
  );
}

function VacationLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 h-[400px] bg-slate-50 rounded-[3rem]" />
        <div className="lg:col-span-2 space-y-8">
          <div className="h-24 bg-slate-50 rounded-[2rem]" />
          <div className="h-[400px] bg-slate-50 rounded-[3rem]" />
        </div>
      </div>
    </div>
  );
}
