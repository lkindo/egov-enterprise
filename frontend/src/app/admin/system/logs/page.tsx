import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import LogDashboardClient from './LogDashboardClient';

export default async function LogDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate system logs promise (Category: SYS, Page: 0) without awaiting
  const systemLogsPromise = systemLogAdminService.getSystemLogs({ page: 0, size: 10, searchKeyword: '' }, axiosConfig)
    .catch(() => ({ list: [], total: 0, totalPage: 0 }));

  return (
    <Suspense fallback={<div className="p-24 text-center font-black text-xs tracking-widest uppercase animate-pulse text-slate-400">로그 데이터를 불러오는 중...</div>}>
      <LogDashboardClient systemLogsPromise={systemLogsPromise} />
    </Suspense>
  );
}
