'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import { SurveyStatsPanel } from '../components/SurveyStatsPanel';

/** 설문 일련번호를 직접 입력해 통계를 조회하는 화면. 렌더는 {@link SurveyStatsPanel} 에 위임한다. */
function StatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialValue = searchParams.get('srvySn') || '';
  const initialSrvySn = Number(initialValue);
  const [srvySnInput, setSrvySnInput] = useState(initialValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/survey/stats?srvySn=${srvySnInput}`);
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" aria-label="뒤로 가기" onClick={() => router.push('/survey/response')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설문 결과 통계</h1>
          <p className="text-muted-foreground mt-1">설문 조사 결과를 시각화하여 분석합니다.</p>
        </div>
      </div>

      <Card className="shadow-sm border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-lg">설문지 선택</CardTitle>
          <CardDescription>통계를 확인하려는 설문 일련번호를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              required
              placeholder="설문 일련번호 입력 (예: 1)"
              value={srvySnInput}
              onChange={(e) => setSrvySnInput(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit">조회</Button>
          </form>
        </CardContent>
      </Card>

      <SurveyStatsPanel
        srvySn={Number.isSafeInteger(initialSrvySn) && initialSrvySn > 0 ? initialSrvySn : null}
      />
    </div>
  );
}

export default function SurveyStatsClient() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <StatsContent />
    </Suspense>
  );
}
