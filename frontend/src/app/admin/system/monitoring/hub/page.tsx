'use client';

import React, { Suspense } from 'react';
import MonitoringHubClient from '../MonitoringHubClient';
import { TableSkeleton } from '@/components/common/TableSkeleton';

export default function MonitoringHubPage() {
  return (
    <Suspense fallback={<TableSkeleton columnCount={6} rowCount={10} />}>
      <MonitoringHubClient />
    </Suspense>
  );
}
