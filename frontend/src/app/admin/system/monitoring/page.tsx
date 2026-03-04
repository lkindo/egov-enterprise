import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { monitoringAdminService } from '@/services/admin/system/MonitoringAdminService';
import MonitoringAdminClient from './MonitoringAdminClient';

export const metadata = {
  title: '전사 커넥티드 인프라 실시간 관제 센터 | 전자정부 표준프레임워크',
  description: '전사 시스템의 Compute, Network, Storage 리소스를 실시간으로 시각화하고 관제합니다.',
};

export default async function AdminMonitoringPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 요약 데이터 패칭 (병렬 처리)
  let summary = {
    httpCount: '0',
    avgDiskUsage: 0,
    serverCount: 0
  };

  try {
    const [httpRes, fileSysRes, logsRes] = await Promise.all([
      monitoringAdminService.getHttpMonList({ page: 0, size: 1 }, axiosConfig),
      monitoringAdminService.getFileSysMntrngList({ page: 0, size: 100 }, axiosConfig),
      monitoringAdminService.getServerResourceLogs({ page: 0, size: 1 }, axiosConfig)
    ]);

    summary.httpCount = String((httpRes as any)?.totalElements || 0);

    const fileSystems = (fileSysRes as any)?.content || (fileSysRes as any)?.data?.content || [];
    if (fileSystems.length > 0) {
      const totalSize = fileSystems.reduce((acc: number, cur: any) => acc + (cur.fileSysSize || 0), 0);
      const totalUsage = fileSystems.reduce((acc: number, cur: any) => acc + (cur.fileSysUsgQty || 0), 0);
      summary.avgDiskUsage = totalSize > 0 ? Math.round((totalUsage / totalSize) * 100) : 0;
    }

    summary.serverCount = (logsRes as any)?.totalElements || 0;
  } catch (error) {
    console.error('Server-side fetch monitoring summary failed:', error);
  }

  return (
    <Suspense fallback={<MonitoringLoading />}>
      <MonitoringAdminClient summary={summary} />
    </Suspense>
  );
}

function MonitoringLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
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
