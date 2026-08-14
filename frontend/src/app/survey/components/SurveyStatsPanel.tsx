'use client';

import { useQuery } from '@tanstack/react-query';
import { getSurveyStats } from '@/lib/api/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';

/**
 * 설문 결과 통계 패널 — `/survey/stats` 와 `/survey/[id]` 가 공유한다.
 *
 * <p><b>이 파일이 생긴 이유</b>: 두 화면은 같은 엔드포인트를 호출하는 90% 동일한 복사본이었고,
 * 그 사이에 필드명이 갈라져 있었다 — 한쪽은 {@code count}/{@code percentage}, 다른 쪽은
 * {@code respondCnt}/{@code qustnrPercent}. 같은 응답을 읽는데 이름이 다르니 <b>둘 중 최소 하나는
 * 반드시 빈 값</b>이었다. 양쪽 모두 `as any` 로 받고 있어 tsc 가 이를 잡지 못했다.
 * 필드명만 맞추면 복사본이 남아 다시 갈라지므로, 렌더를 한 곳으로 합쳐 드리프트 경로 자체를 없앤다.
 *
 * <p>표준 필드명은 {@code count}/{@code percentage} 다({@link SurveyResultStats}).
 */
export function SurveyStatsPanel({ srvySn }: { srvySn: number | null }) {
  const hasValidSurvey = srvySn !== null && Number.isSafeInteger(srvySn) && srvySn > 0;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['survey-stats', srvySn],
    queryFn: () => getSurveyStats({ srvySn: srvySn! }),
    enabled: hasValidSurvey,
    retry: false,
  });

  if (!hasValidSurvey) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-lg">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">설문지를 선택하면 통계를 확인할 수 있습니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-center py-10">
        <p className="text-destructive-emphasis font-medium">
          오류 발생: {error instanceof Error ? error.message : '데이터를 가져오지 못했습니다.'}
        </p>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">응답 데이터가 없습니다.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {data.map((stat, idx) => (
        <Card key={`${stat.qstnCn}-${stat.artclCn ?? ''}-${idx}`} className="shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-md flex items-center">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-lg flex items-center justify-center text-sm mr-3">
                  {idx + 1}
                </span>
                {stat.qstnCn}
              </CardTitle>
              <div className="text-sm font-semibold px-2 py-1 bg-hub-blue/10 text-hub-blue rounded">
                {stat.qstnTypeCd === '1' ? '객관식' : '주관식'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{stat.artclCn || '주관식 답변'}</span>
                <span className="text-muted-foreground">
                  {stat.count || 0} 명 ({stat.percentage || 0}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-lg h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-lg transition-all duration-500"
                  style={{ width: `${stat.percentage || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
