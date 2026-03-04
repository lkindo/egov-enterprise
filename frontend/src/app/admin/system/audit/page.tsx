import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { auditAdminService, AuditLog } from '@/services/admin/system/AuditAdminService';
import AuditAdminClient from './AuditAdminClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: '시스템 감사 및 보안 인텔리전스 | 전자정부 표준프레임워크',
  description: '시스템 전반의 모든 변경 사항과 접근 이력을 불변의 데이터로 관리합니다.',
};

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] 서버 사이드 초기 데이터 패칭
  let initialLogs: AuditLog[] = [];

  try {
    const response = await auditAdminService.getAuditLogs({ page: 0, size: 500 }, axiosConfig);
    initialLogs = response?.content || response?.data?.content || response || [];
  } catch (error) {
    console.error('Server-side fetch audit logs failed:', error);
  }

  return (
    <Suspense fallback={<AuditAdminLoading />}>
      <AuditAdminClient initialLogs={initialLogs} />
    </Suspense>
  );
}

function AuditAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col">
      <div className="h-14 w-96 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
        <div className="h-40 bg-slate-900/5 rounded-[3.5rem]" />
        <div className="h-40 bg-slate-50 rounded-[3.5rem]" />
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-[4rem] p-10 space-y-8">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-28 bg-white/60 rounded-[2rem] border border-slate-100" />
        ))}
      </div>
    </div>
  );
}