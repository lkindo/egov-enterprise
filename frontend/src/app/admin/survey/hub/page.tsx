'use client';

import { Suspense } from 'react';
import { SurveyHubClient } from './SurveyHubClient';
import { TableSkeleton } from '@/components/common/TableSkeleton';

export default function SurveyHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900">설문 통합 관리 워크벤치</h1>
        <p className="text-muted-foreground text-sm font-medium">설문 등록부터 통계 분석까지 모든 과정을 한 번에 최적화하여 관리합니다.</p>
      </div>

      <Suspense fallback={<TableSkeleton columnCount={6} rowCount={10} />}>
        <SurveyHubClient />
      </Suspense>
    </div>
  );
}
