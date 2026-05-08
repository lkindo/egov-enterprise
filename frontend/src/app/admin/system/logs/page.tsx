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
    <Suspense fallback={<div className="p-24 text-center font-mono text-xs tracking-widest uppercase animate-pulse">Establishing Log Architecture Streams...</div>}>
      <LogDashboardClient systemLogsPromise={systemLogsPromise} />
    </Suspense>
  );
}
