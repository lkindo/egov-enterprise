'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyQuestionsPage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="?�문 문항 관�?
 breadcrumbs={[{ label: '?�문조사' }, { label: '문항 관�? }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">?�문 문항 관�?준�?중입?�다.</p>
 </div>
 </div>
 );
}
