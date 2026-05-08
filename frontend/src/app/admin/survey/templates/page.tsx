'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Layout } from 'lucide-react';

export default function SurveyTemplatesPage() {
  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-700">
      <PageHeader
        title="설문 템플릿 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '템플릿 관리' }]}
      />
      <div className="p-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-sky-50 rounded-xl flex items-center justify-center text-sky-300">
            <Layout size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900">설문 디자인 라이브러리 준비 중</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">표준 업무 설문을 신속하게 생성할 수 있는 재사용 템플릿을 구축하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
