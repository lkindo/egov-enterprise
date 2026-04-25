'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Users2 } from 'lucide-react';

export default function SurveyRespondentsPage() {
  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-700">
      <PageHeader
        title="설문 응답자 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '응답자 관리' }]}
      />
      <div className="p-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-rose-50 rounded-xl flex items-center justify-center text-rose-300">
            <Users2 size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900">설문 타겟팅 시스템 대기 중</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">특정 부서 또는 그룹별 응답자 필터링 및 관리 기능을 준비하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
