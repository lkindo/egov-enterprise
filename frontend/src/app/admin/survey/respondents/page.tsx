'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyRespondentsPage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="?¤ë¬¸ ?‘ë‹µ??ê´€ë¦?
 breadcrumbs={[{ label: '?¤ë¬¸ì¡°ì‚¬' }, { label: '?‘ë‹µ??ê´€ë¦? }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">?¤ë¬¸ ?‘ë‹µ??ê´€ë¦?ì¤€ë¹?ì¤‘ìž…?ˆë‹¤.</p>
 </div>
 </div>
 );
}
