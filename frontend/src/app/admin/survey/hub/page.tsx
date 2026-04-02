'use client';

import { Suspense } from 'react';
import { SurveyHubClient } from './SurveyHubClient';
import { TableSkeleton } from '@/components/common/TableSkeleton';

export default function SurveyHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900">설문 ?듯빀 관리님뚰겕踰ㅼ튂</h1>
        <p className="text-muted-foreground text-sm font-medium">설문 등록遺님통계 분석源뚯? 紐⑤뱺 怨쇱젙님님踰덉뿉 理쒖쟻?뷀븯님관리ы빀?덈떎.</p>
      </div>

      <Suspense fallback={<TableSkeleton columnCount={6} rowCount={10} />}>
        <SurveyHubClient />
      </Suspense>
    </div>
  );
}

