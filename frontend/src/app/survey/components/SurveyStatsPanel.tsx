'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { downloadSurveyStatsXlsx, getSurveyStats } from '@/lib/api/survey';
import { FREE_TEXT_QUESTION_TYPE, type SurveyResultStats } from '@/types/business/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Loader2, BarChart3, Download } from 'lucide-react';
import { failureMessage } from '@/lib/safe-error-log';

interface QuestionStatsGroup {
  srvyQstnSn: number;
  qstnCn: string;
  qstnTypeCd: string;
  items: SurveyResultStats[];
}

function groupSurveyStats(stats: SurveyResultStats[]): QuestionStatsGroup[] {
  const groups = new Map<number, QuestionStatsGroup>();
  for (const row of stats) {
    const existing = groups.get(row.srvyQstnSn);
    if (existing) {
      existing.items.push(row);
    } else {
      groups.set(row.srvyQstnSn, {
        srvyQstnSn: row.srvyQstnSn,
        qstnCn: row.qstnCn,
        qstnTypeCd: row.qstnTypeCd,
        items: [row],
      });
    }
  }
  return [...groups.values()];
}

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
  /*
   * [2026-09-26 DIP B5 F6] 결과를 xlsx 로 내려받는다 — 화면과 같은 행·같은 분모. 같은 틱의 두 번째 클릭은 잠금으로 막고
   * 실패는 사유를 보인다(조용히 아무 일도 안 일어나면 사용자는 다시 누른다).
   */
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadPendingRef = useRef(false);
  const handleDownload = async () => {
    if (!hasValidSurvey || downloadPendingRef.current) return;
    downloadPendingRef.current = true;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadSurveyStatsXlsx(srvySn!);
    } catch (downloadFailure: unknown) {
      setDownloadError(extractErrorMessage(downloadFailure, '결과 파일을 내려받지 못했습니다.'));
    } finally {
      downloadPendingRef.current = false;
      setIsDownloading(false);
    }
  };

  if (!hasValidSurvey) {
    return (
      <div className="text-center py-20 border-2 border-dashed rounded-lg">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
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
          오류 발생: {failureMessage(error, '데이터를 가져오지 못했습니다.')}
        </p>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">응답 데이터가 없습니다.</div>;
  }

  const questionGroups = groupSurveyStats(data);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {downloadError ? (
          <p role="alert" className="text-sm text-destructive-emphasis">{downloadError}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDownloading}
          aria-busy={isDownloading || undefined}
          onClick={() => { void handleDownload(); }}
        >
          <Download size={14} aria-hidden="true" /> {isDownloading ? '내려받는 중…' : '결과를 엑셀로 내려받기'}
        </Button>
      </div>
      {questionGroups.map((group, groupIdx) => {
        const isFreeText = group.qstnTypeCd === FREE_TEXT_QUESTION_TYPE;
        return (
          <Card key={group.srvyQstnSn} className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-lg flex items-center justify-center text-sm mr-3">
                    {groupIdx + 1}
                  </span>
                  {group.qstnCn}
                </CardTitle>
                <div className="text-sm font-semibold px-2 py-1 bg-hub-blue/10 text-hub-blue rounded">
                  {isFreeText ? '주관식' : '객관식'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {group.items.map((stat) => (
                <div key={stat.srvyArtclSn} className="space-y-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {isFreeText ? (stat.artclCn || '주관식 응답') : (stat.artclCn || '선택 항목')}
                    </span>
                    <span className="text-muted-foreground">
                      {/* [2026-09-26 DIP V8] 비율의 분모는 이 문항에 응답한 사람 수다. 복수선택이면 항목 합계가 100% 를 넘을 수 있다. */}
                      {stat.count || 0} 명 ({stat.percentage || 0}%)
                      {typeof stat.respondentCount === 'number' ? ` · 응답자 ${stat.respondentCount}명 기준` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-lg h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-lg transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, stat.percentage || 0))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {isFreeText ? (
                <p className="text-xs text-muted-foreground">
                  주관식 서술 답변은 설문 응답 관리에서 확인합니다.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
