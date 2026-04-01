'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UserCheck } from 'lucide-react';

export default function SurveyPollsParticipatePage() {
  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-700">
      <PageHeader
        title="설문 여론조사 참여"
        breadcrumbs={[{ label: '설문조사' }, { label: '여론조사 참여' }]}
      />
      <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-300">
            <UserCheck size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900">여론조사 참여 시스템 준비 중</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">사용자 응답 수집을 위한 실시간 참여 인터페이스를 구축하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
