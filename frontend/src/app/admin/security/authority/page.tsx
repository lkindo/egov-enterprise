import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { Suspense } from 'react';
import SecurityHubClient from './SecurityHubClient';

export const metadata: Metadata = {
  title: `권한 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function SecurityAuthorityHubPage() {
  return (
    <Suspense fallback={<div className="p-24 text-center text-xs tracking-tight animate-pulse text-hub-indigo"><h1 className="sr-only">권한 관리를 불러오는 중</h1>권한 관리를 불러오는 중입니다…</div>}>
      <SecurityHubClient />
    </Suspense>
  );
}
