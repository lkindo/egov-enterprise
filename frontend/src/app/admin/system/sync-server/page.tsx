import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { syncService, SyncServer } from '@/services/syncService';
import SyncServerAdminClient from './SyncServerAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '서버 다이나믹 데이터 미러링 엔진 | 전자정부 표준프레임워크',
  description: '전사 시스템 간 동기화 노드를 관리하고 실시간 데이터 미러링 프로토콜을 관제합니다.',
};

export default async function AdminSyncServerPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 패칭
  let initialServers: SyncServer[] = [];

  try {
    const response = await syncService.getSyncServers(axiosConfig);
    initialServers = (response as any)?.content || (response as any)?.data?.content || (response as any) || [];
  } catch (error) {
    console.error('Server-side fetch sync server data failed:', error);
  }

  return (
    <Suspense fallback={<SyncServerAdminLoading />}>
      <SyncServerAdminClient initialServers={initialServers} />
    </Suspense>
  );
}

function SyncServerAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
        <div className="md:col-span-2 h-64 bg-slate-900/5 rounded-[4rem]" />
        <div className="h-64 bg-slate-50 rounded-[4rem]" />
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-[5rem] p-12 mt-8" />
    </div>
  );
}
