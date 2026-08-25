import { PageHeader } from '@/app/components/layout/page-header';
import { Vote } from 'lucide-react';

export default function SurveyPollsManagePage() {
  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="설문 여론조사 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '여론조사 관리' }]}
      />
      <div className="p-20 text-center bg-card rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-6">
        <div className="w-20 h-11 bg-amber-50 rounded-lg flex items-center justify-center text-amber-300">
            <Vote size={40} />
        </div>
        <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground">여론조사 거버넌스 준비 중</h3>
            <p className="text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">다양한 통계 지표와 여론 분석 도구를 통합할 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
