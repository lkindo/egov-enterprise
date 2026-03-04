import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { batchAdminService, BatchSchedule, BatchResult } from '@/services/admin/system/BatchAdminService';
import BatchAdminClient from './BatchAdminClient';

export const metadata = {
  title: '배치 작업 관리 센터 | 전자정부 표준프레임워크',
  description: '시스템 고성능 자동화 작업과 스케줄링을 모니터링하고 제어합니다.',
};

export default async function BatchAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 병렬 데이터 호출
  let initialSchedules: BatchSchedule[] = [];
  let initialResults: BatchResult[] = [];

  try {
    const [schedulesRes, resultsRes] = await Promise.all([
      batchAdminService.getSchedules({ page: 0, size: 50 }, axiosConfig),
      batchAdminService.getResults({ page: 0, size: 50 }, axiosConfig)
    ]);

    initialSchedules = schedulesRes?.content || schedulesRes?.data?.content || schedulesRes || [];
    initialResults = resultsRes?.content || resultsRes?.data?.content || resultsRes || [];
  } catch (error) {
    console.error('Server-side fetch batch data failed:', error);
  }

  return (
    <Suspense fallback={<BatchAdminLoading />}>
      <BatchAdminClient
        initialSchedules={initialSchedules}
        initialResults={initialResults}
      />
    </Suspense>
  );
}

function BatchAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="flex justify-center">
        <div className="h-20 w-[400px] bg-slate-900/5 rounded-[2.5rem]" />
      </div>
      <div className="h-48 w-full bg-slate-900/5 rounded-[4rem]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2].map(i => <div key={i} className="h-64 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="h-96 w-full bg-slate-100/50 rounded-[4.5rem]" />
    </div>
  );
}
