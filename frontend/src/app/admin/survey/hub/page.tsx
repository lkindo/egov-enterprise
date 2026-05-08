'use client';

import { Suspense } from 'react';
import { SurveyHubClient } from './SurveyHubClient';
import { TableSkeleton } from '@/components/common/TableSkeleton';

export default function SurveyHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">?�문 ?�합 관�??�크벤치</h1>
        <p className="text-muted-foreground text-sm font-medium">?�문 ?�록부???�계 분석까�? 모든 과정????번에 최적?�하??관리합?�다.</p>
      </div>

      <Suspense fallback={<TableSkeleton columnCount={6} rowCount={10} />}>
        <SurveyHubClient />
      </Suspense>
    </div>
  );
}
