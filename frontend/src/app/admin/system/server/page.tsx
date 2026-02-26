import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { serverService, ServerInfo } from '@/services/serverService';
import ServerAdminClient from './ServerAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '전사 인프라 서버 자산 통합 관리 | 전자정부 표준프레임워크',
  description: '시스템 전반의 모든 서버 인프라 정보를 실시간으로 관제하고 통합 관리합니다.',
};

export default async function AdminServerPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 패칭
  let initialServers: ServerInfo[] = [];

  try {
    const response = await serverService.getServers({ page: 0, size: 100 }, axiosConfig);
    initialServers = (response as any)?.content || (response as any)?.data?.content || (response as any) || [];
  } catch (error) {
    console.error('Server-side fetch server data failed:', error);
  }

  return (
    <Suspense fallback={<ServerAdminLoading />}>
      <ServerAdminClient initialServers={initialServers} />
    </Suspense>
  );
}

function ServerAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 shrink-0">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
        <div className="md:col-span-2 h-64 bg-slate-900/5 rounded-[4rem]" />
        <div className="h-64 bg-slate-50 rounded-[4rem]" />
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-[5rem] p-12 mt-8" />
    </div>
  );
}
