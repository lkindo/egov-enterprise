import { PageHeader } from '@/app/components/layout/page-header';
import Link from 'next/link';
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
            {/* [2026-09-15 DEC-OPS-100] 제공 일정 약속을 걷고 지원 범위와 실제로 있는 대체 경로를 말한다(unavailable). */}
            <h3 className="text-xl font-bold tracking-tight text-foreground">여론조사 관리는 이 화면에서 지원하지 않습니다.</h3>
            <p className="text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
              온라인 투표는{' '}
              <Link href="/admin/survey/polls" className="font-bold text-primary underline underline-offset-4">온라인 투표 관리</Link>
              에서 등록·관리할 수 있습니다.
            </p>
        </div>
      </div>
    </div>
  );
}
