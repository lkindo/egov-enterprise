'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyQuestionsPage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="설문 臾명빆 愿由?
 breadcrumbs={[{ label: '설문조사' }, { label: '臾명빆 愿由? }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">설문 臾명빆 愿由?以鍮?以묒엯?덈떎.</p>
 </div>
 </div>
 );
}

