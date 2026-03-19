'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyPollsParticipatePage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="설문 여론조사 참여"
 breadcrumbs={[{ label: '설문조사' }, { label: '여론조사 참여' }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">여론조사 참여 준비 중입니다.</p>
 </div>
 </div>
 );
}
