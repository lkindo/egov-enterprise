import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ismAdminService, InfrmlSanctn } from '@/services/foundation/system/IsmAdminService';
import IsmClient from './IsmClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '약식결재 및 승인 관리 | 전자정부 표준프레임워크',
  description: '시스템에서 발생하는 약식 결재 요청을 승인 또는 반려 처리합니다',
};

export default async function InformalSanctionPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let rawData: any = { list: [] as InfrmlSanctn[], total: 0, totalPage: 0 };

  try {
    rawData = await ismAdminService.getPendingList({ page: 0, size: 50 }, axiosConfig);
  } catch (error) {
    console.error('Server-side fetch ism failed:', error);
  }

  // [Server Serialization Optimization]
  const optimizedContent = selectFieldsList(rawData.list as InfrmlSanctn[], [
    'infrmlSanctnId', 'jobSe', 'jobSeCode', 'applcntId', 'confmAt', 'sancltNm'
  ] as (keyof InfrmlSanctn)[]);

  return (
    <Suspense fallback={<IsmLoading />}>
      <IsmClient initialData={{ ...rawData, list: optimizedContent as InfrmlSanctn[] }} />
    </Suspense>
  );
}

function IsmLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <div className="h-11 w-1/3 bg-slate-100 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-lg" />)}
      </div>
      <div className="h-[600px] bg-slate-50 rounded-lg" />
    </div>
  );
}
