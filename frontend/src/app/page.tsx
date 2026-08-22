import { Suspense, cache } from 'react';
import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { loadDashboardData } from './dashboard-data';

function DashboardLoading() {
  return (
    <>
      <h1 className="sr-only">통합 대시보드를 불러오는 중</h1>
      <DashboardSkeleton />
    </>
  );
}

/**
 * P2: Dynamic Import for Heavy Dashboard Client
 * Reduces initial bundle size by lazy loading the heavy dashboard component.
 */
const UnifiedDashboardClient = dynamic(() => import('./UnifiedDashboardClient'), {
  loading: () => <DashboardLoading />
});

/**
 * P3: Server-side Data Refinement
 * Minifies the JSON payload sent to the client by picking only required fields.
 * cache() ensures that even if this is called multiple times in one request, only one API call is made.
 */
const getDashboardData = cache(loadDashboardData);

export default async function UnifiedDashboardPage() {
  const dataPromise = getDashboardData();

  return (
    <Suspense fallback={<DashboardLoading />}>
      <UnifiedDashboardClient dataPromise={dataPromise} />
    </Suspense>
  );
}
