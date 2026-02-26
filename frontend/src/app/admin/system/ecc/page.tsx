import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { eventCmpgnService, EventCmpgn } from '@/services/eventCmpgnService';
import EccClient from './EccClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '사내 행사 및 캠페인 관리 | 전자정부 표준프레임워크',
  description: '전사적 행사 및 캠페인을 기획하고 일정을 관리합니다.',
};

export default async function EventCmpgnPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const resolvedSearchParams = await searchParams;
  const eventCn = (resolvedSearchParams.eventCn as string) || '';

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let rawData = { content: [] as EventCmpgn[], totalElements: 0, totalPages: 0 };

  try {
    rawData = await eventCmpgnService.getEventCmpgnList({ eventCn, page: 0, size: 50 }, axiosConfig);
  } catch (error) {
    console.error('Server-side fetch event-campaigns failed:', error);
  }

  // [Server Serialization Optimization]
  const optimizedContent = selectFieldsList(rawData.content, [
    'eventId', 'eventNm', 'eventCn', 'eventBeginDe', 'eventEndDe', 'receptBeginDe', 'receptEndDe', 'eventTyCode'
  ]);

  return (
    <Suspense fallback={<EccLoading />}>
      <EccClient 
        initialData={{ ...rawData, content: optimizedContent as EventCmpgn[] }} 
        searchEventCn={eventCn} 
      />
    </Suspense>
  );
}

function EccLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="h-24 bg-slate-50 rounded-[2rem]" />
      <div className="h-[600px] bg-slate-50 rounded-[4rem]" />
    </div>
  );
}
