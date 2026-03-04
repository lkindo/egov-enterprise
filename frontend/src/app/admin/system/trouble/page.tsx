import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { troubleAdminService, Trouble } from '@/services/admin/system/TroubleAdminService';
import TroubleClient from './TroubleClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '시스템 장애 및 티켓 관리 | 전자정부 표준프레임워크',
  description: '시스템 장애 상황을 기록하고 처리 프로세스를 투명하게 관리합니다.',
};

export default async function TroublePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let rawData = { content: [] as Trouble[], totalElements: 0, totalPages: 0 };

  try {
    rawData = await troubleAdminService.getTroubles({ page: 0, size: 50 }, axiosConfig);
  } catch (error) {
    console.error('Server-side fetch troubles failed:', error);
  }

  // [Server Serialization Optimization]
  const optimizedContent = selectFieldsList(rawData.content, [
    'troblId', 'troblNm', 'troblKnd', 'troblKndNm', 'troblDc', 'troblOccrrncTime', 'troblRqesterNm', 'processSttus', 'processSttusNm'
  ]);

  return (
    <Suspense fallback={<TroubleLoading />}>
      <TroubleClient initialData={{ ...rawData, content: optimizedContent as Trouble[] }} />
    </Suspense>
  );
}

function TroubleLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="h-[600px] bg-slate-50 rounded-[4rem]" />
    </div>
  );
}