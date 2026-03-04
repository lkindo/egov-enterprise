import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { rewardAdminService as rewardService, Reward } from '@/services/admin/system/RewardAdminService';
import RewardClient from './RewardClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
  title: '임직원 포상 관리 | 전자정부 표준프레임워크',
  description: '임직원의 포상 내역을 관리하고 승인 프로세스를 진행합니다.',
};

export default async function RewardPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const usid = (resolvedSearchParams.usid as string) || '';

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  let rawData = { content: [] as Reward[], totalElements: 0, totalPages: 0 };

  try {
    rawData = await rewardService.getRewards({ usid, page: 0, size: 50 }, axiosConfig);
  } catch (error) {
    console.error('Server-side fetch rewards failed:', error);
  }

  // [Server Serialization Optimization] 필터링된 데이터만 클라이언트로 전달
  const optimizedContent = selectFieldsList(rawData.content, [
    'rwdId', 'rwdNm', 'rwdDe', 'rwdKnd', 'usid', 'confmAt'
  ]);

  return (
    <Suspense fallback={<RewardLoading />}>
      <RewardClient
        initialData={{ ...rawData, content: optimizedContent as Reward[] }}
        searchUsid={usid}
      />
    </Suspense>
  );
}

function RewardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
      <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="h-24 bg-slate-50 rounded-[2rem]" />
      <div className="h-[600px] bg-slate-50 rounded-[4rem]" />
    </div>
  );
}