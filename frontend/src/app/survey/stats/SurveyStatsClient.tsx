'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import { SurveyStatsPanel } from '../components/SurveyStatsPanel';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { PagePagination } from '@/components/common/PagePagination';

/** 이름으로 설문지를 고르고, 선택한 식별자는 URL에 남겨 결과 링크를 공유한다. */
function StatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialValue = searchParams.get('srvySn') || '';
  const initialSrvySn = Number(initialValue);
  const [keyword, setKeyword] = useState('');
  const search = useDebouncedValue(keyword, 300);
  const [selectionPage, setSelectionPage] = useState({ search: '', page: 1 });
  const page = selectionPage.search === search ? selectionPage.page : 1;
  const surveys = useQuery({
    queryKey: ['survey-stats-selection', search, page],
    queryFn: ({ signal }) => surveyAdminService.getSurveys({ keyword: search, page: page - 1, size: 10 }, { signal }),
    throwOnError: false,
  });
  const hasSelection = Number.isSafeInteger(initialSrvySn) && initialSrvySn > 0;

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" aria-label="설문 목록으로 이동" onClick={() => router.push('/survey')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">설문 결과 통계</h1>
          <p className="text-muted-foreground mt-1">설문 조사 결과를 시각화하여 분석합니다.</p>
        </div>
      </div>

      <details open={!hasSelection} className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">{hasSelection ? '다른 설문지 선택' : '설문지 선택'}</summary>
      <Card className="mt-4 shadow-sm">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-lg">설문지 선택</CardTitle>
          <CardDescription>제목을 검색한 뒤 결과를 확인할 설문지를 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <label htmlFor="survey-stats-keyword" className="mb-2 block text-sm font-medium">설문 제목</label>
          <Input id="survey-stats-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="제목 검색" />
          {surveys.isPending ? <p role="status" className="py-4">설문지를 불러오는 중입니다…</p>
            : surveys.isError ? <div role="alert" className="py-4"><p>설문지를 불러오지 못했습니다.</p><Button variant="outline" onClick={() => void surveys.refetch()}>다시 시도</Button></div>
            : <><ul className="my-4 divide-y">{surveys.data.list.map((survey) => <li key={survey.srvySn}><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => router.push(`/survey/stats?srvySn=${survey.srvySn}`)} aria-current={survey.srvySn === initialSrvySn ? 'true' : undefined}>{survey.srvyTtl || `제목 없는 설문지 (${survey.srvySn})`}</Button></li>)}</ul>
            {surveys.data.list.length === 0 && <p role="status">{search ? '검색 결과가 없습니다.' : '등록된 설문지가 없습니다.'}</p>}
            <PagePagination total={surveys.data.total} page={page} size={10} onPageChange={(next) => setSelectionPage({ search, page: next })} /></>}
        </CardContent>
      </Card>
      </details>

      <SurveyStatsPanel
        srvySn={Number.isSafeInteger(initialSrvySn) && initialSrvySn > 0 ? initialSrvySn : null}
      />
    </div>
  );
}

export default function SurveyStatsClient() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <h1 className="sr-only">설문 결과 통계를 불러오는 중</h1>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <StatsContent />
    </Suspense>
  );
}
