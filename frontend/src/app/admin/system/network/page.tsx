import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { networkAdminService, Network } from '@/services/foundation/system/NetworkAdminService';
import NetworkAdminClient from './NetworkAdminClient';

export const metadata = {
  title: '네트워크 인프라 지형 관리 및 최적화 | 전자정부 표준프레임워크',
  description: '시스템 전반의 네트워크 토폴로지 정보를 관리하고 최적의 연결성을 보장합니다',
};

async function NetworkDataContainer() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 페칭
  let initialNetworks: Network[] = [];

  try {
    const response = await networkAdminService.getNetworks({ page: 0, size: 100 }, axiosConfig);
    initialNetworks = (response as any)?.content || (response as any)?.data?.content || (response as any) || [];
  } catch (error) {
    console.error('Server-side fetch network data failed:', error);
  }

  return <NetworkAdminClient initialNetworks={initialNetworks} />;
}

export default function AdminNetworkPage() {
  return (
    <Suspense fallback={<NetworkAdminLoading />}>
      <NetworkDataContainer />
    </Suspense>
  );
}

function NetworkAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col text-left">
      <div className="h-14 w-96 bg-slate-100 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 shrink-0">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-50 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
        <div className="md:col-span-2 h-64 bg-slate-900/5 rounded-xl" />
        <div className="h-64 bg-slate-50 rounded-xl" />
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-xl p-12 mt-8" />
    </div>
  );
}
