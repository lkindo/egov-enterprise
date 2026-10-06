import { Suspense } from 'react';
import UserOrgHubClient from './UserOrgHubClient';
import { loadUserOrgPrefetch } from './load-user-org-prefetch';
import type { UserOrgTab } from './user-org-prefetch';

export default async function UserOrgHubPage({
  tab,
  loadingTitle,
}: {
  tab: UserOrgTab;
  loadingTitle: string;
}) {
  const prefetch = await loadUserOrgPrefetch(tab);

  return (
    <Suspense fallback={
      <div className="p-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
        <h1 className="sr-only">{loadingTitle}</h1>
        사용자·조직 데이터를 불러오는 중입니다...
      </div>
    }>
      <UserOrgHubClient defaultTab={tab} {...prefetch} />
    </Suspense>
  );
}
