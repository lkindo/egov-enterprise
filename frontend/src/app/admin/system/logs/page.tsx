import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import LogDashboardClient, { type InitialSystemLogs } from './LogDashboardClient';

export default async function LogDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Waterfall Elimination] 첫 페이지(SYS)를 await 없이 선행 요청한다.
  // 실패를 빈 목록(`{ list: [] }`)으로 삼키면 화면이 "데이터 0건"이라고 거짓말하고,
  // initialData 가 채워져 클라이언트 재조회조차 일어나지 않는다.
  // 성공/실패를 구분해 넘기고, 실패 시 클라이언트가 다시 조회해 실제 오류를 노출하게 한다.
  const systemLogsPromise: Promise<InitialSystemLogs> = systemLogAdminService
    .getSystemLogs({ page: 0, size: 10, searchWrd: '' }, axiosConfig)
    .then((data) => ({ ok: true as const, data }))
    .catch((error: unknown) => ({
      ok: false as const,
      message: error instanceof Error ? error.message : '시스템 로그를 불러오지 못했습니다.',
    }));

  return (
    <Suspense fallback={<div className="p-24 text-center font-black text-xs tracking-widest animate-pulse text-muted-foreground">로그 데이터를 불러오는 중...</div>}>
      <LogDashboardClient systemLogsPromise={systemLogsPromise} />
    </Suspense>
  );
}
