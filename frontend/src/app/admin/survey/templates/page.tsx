'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyTemplatesPage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="설문 템플릿 관리"
 breadcrumbs={[{ label: '설문조사' }, { label: '템플릿 관리' }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">설문 템플릿 관리 준비 중입니다.</p>
 </div>
 </div>
 );
}
