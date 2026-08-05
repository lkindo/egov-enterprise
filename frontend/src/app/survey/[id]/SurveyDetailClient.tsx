'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SurveyStatsPanel } from '../components/SurveyStatsPanel';

/**
 * 설문 상세(결과 통계) 화면.
 *
 * <p><b>⚠ 종전에는 라우트 파라미터를 아예 쓰지 않았다.</b> `/survey/[id]` 인데 컴포넌트는
 * {@code searchParams.get('srvyId')} 를 읽었고 `page.tsx` 도 {@code params} 를 넘기지 않았다.
 * 목록(`SurveyClient`)이 {@code router.push(`/survey/${srvyId}`)} 로 진입시키므로,
 * 사용자는 설문을 클릭할 때마다 <b>빈 화면과 "설문지 ID 를 입력하세요" 안내</b>를 봤다.
 * 이제 경로 세그먼트를 그대로 받아 쓴다.
 *
 * <p>렌더는 `/survey/stats` 와 공유하는 {@link SurveyStatsPanel} 에 위임한다 — 종전엔 두 화면이
 * 90% 동일한 복사본이었고 그 사이에서 필드명이 갈라져 있었다.
 */
export default function SurveyDetailClient({ srvyId }: { srvyId: string }) {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={() => router.push('/survey')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설문 결과 통계</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{srvyId}</p>
        </div>
      </div>

      <SurveyStatsPanel srvyId={srvyId} />
    </div>
  );
}
