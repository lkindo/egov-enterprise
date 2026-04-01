'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyItemsPage() {
 return (
 <div className="space-y-6">
 <PageHeader
 title="?¤ë¬¸ ??ª© ê´€ë¦?
 breadcrumbs={[{ label: '?¤ë¬¸ì¡°ì‚¬' }, { label: '??ª© ê´€ë¦? }]}
 />
 <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
 <p className="text-slate-500 font-medium">?¤ë¬¸ ??ª© ê´€ë¦?ì¤€ë¹?ì¤‘ìž…?ˆë‹¤.</p>
 </div>
 </div>
 );
}
