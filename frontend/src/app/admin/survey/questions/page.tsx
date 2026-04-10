'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HelpCircle } from 'lucide-react';

export default function SurveyQuestionsPage() {
  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-700">
      <PageHeader
        title="설문 문항 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '문항 관리' }]}
      />
      <div className="p-20 text-center bg-white rounded-[0.1rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-[0.1rem] flex items-center justify-center text-indigo-300">
            <HelpCircle size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900">설문 문항 관리자 준비 중</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">다양한 질문 유형(객관식, 주관식, 척도형 등)을 동적으로 생성하는 도구를 준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
}
