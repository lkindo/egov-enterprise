'use client';

import { Suspense } from 'react';
import MonitoringHubClient from '../MonitoringHubClient';
import { TableSkeleton } from '@/components/common/TableSkeleton';

export default function MonitoringHubPage() {
  return (
    <div className="space-y-12 pb-24">
      <Suspense fallback={<TableSkeleton />}>
        <MonitoringHubClient />
      </Suspense>
    </div>
  );
}
