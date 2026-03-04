import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { backupAdminService, BackupOpert, BackupResult } from '@/services/admin/system/BackupAdminService';
import BackupAdminClient from './BackupAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '백업 전략 및 자동화 전략 엔진 | 전자정부 표준프레임워크',
  description: '시스템 데이터의 무결성을 보장하고 자동화된 백업 복원 시나리오를 설계합니다.',
};

export default async function AdminBackupPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 병렬 데이터 패칭
  let initialOperations: BackupOpert[] = [];
  let initialResults: BackupResult[] = [];

  try {
    const [opRes, resRes] = await Promise.all([
      backupAdminService.getOperations({ page: 0, size: 100 }, axiosConfig),
      backupAdminService.getResults({ page: 0, size: 100 }, axiosConfig)
    ]);

    initialOperations = (opRes as any)?.content || (opRes as any)?.data?.content || (opRes as any) || [];
    initialResults = (resRes as any)?.content || (resRes as any)?.data?.content || (resRes as any) || [];
  } catch (error) {
    console.error('Server-side fetch backup data failed:', error);
  }

  return (
    <Suspense fallback={<BackupAdminLoading />}>
      <BackupAdminClient
        initialOperations={initialOperations}
        initialResults={initialResults}
      />
    </Suspense>
  );
}

function BackupAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="flex justify-center h-20 bg-slate-50 rounded-[2.5rem] w-80 mx-auto" />
      <div className="h-44 bg-slate-900/5 rounded-[4rem]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-50 rounded-[3rem]" />)}
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-[4.5rem] p-10 mt-8" />
    </div>
  );
}