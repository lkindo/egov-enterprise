'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyPollsParticipatePage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="설문 ?щ줎조사 李몄뿬"
 breadcrumbs={[{ label: '설문조사' }, { label: '?щ줎조사 李몄뿬' }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">?щ줎조사 李몄뿬 以鍮?以묒엯?덈떎.</p>
 </div>
 </div>
 );
}

