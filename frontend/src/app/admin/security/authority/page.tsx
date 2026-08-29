import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import SecurityHubClient from './SecurityHubClient';

export default async function SecurityAuthorityHubPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [P1: Waterfall Elimination] Initiate authorities promise without awaiting
  const authoritiesPromise = authorAdminService.getAuthorList({ pageIndex: 1, searchKeyword: '' }, axiosConfig);

  return (
    <Suspense fallback={<div className="p-24 text-center text-xs tracking-tight animate-pulse text-hub-indigo"><h1 className="sr-only">권한 관리를 불러오는 중</h1>권한 관리를 불러오는 중입니다…</div>}>
      <SecurityHubClient authoritiesPromise={authoritiesPromise} />
    </Suspense>
  );
}
