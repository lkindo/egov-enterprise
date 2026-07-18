import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { ClipboardList } from 'lucide-react';

export default function SurveyItemsPage() {
  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-700">
      <PageHeader
        title="설문 항목 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '항목 관리' }]}
      />
      <div className="p-20 text-center bg-card rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-6">
        <div className="w-20 h-11 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            <ClipboardList size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground">설문 항목 관리 준비 중</h3>
            <p className="text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">보다 직관적인 설문 항목 설정을 위한 인터페이스를 준비하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
