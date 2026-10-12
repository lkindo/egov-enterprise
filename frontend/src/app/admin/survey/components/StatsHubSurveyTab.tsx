'use client';

import { Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';
import { toDisplayYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { HubEmptyState, HubErrorState } from '@/app/admin/stats/StatsHubParts';
import type { StatsPanelQuery } from '@/extensions/slots';

/**
 * 통계 셸의 '설문조사 분석' 탭. 설문 기능이 소유한다.
 *
 * 종전에는 통계 셸이 설문 관리 서비스를 직접 불러, 통계를 고르면 설문까지 함께 들어와야 했다. 설문이 이 탭을 넘기고, 설문을 고르지
 * 않은 구성에서는 셸에서 탭 자체가 빠진다. [허브 분해 H4] 탭은 설문의 stats-panels 기여가 이름으로 가리키는 값들이다 — 조회는 셸이
 * 소유하고(기여는 훅을 넘길 수 없다), 여기에는 조회 키·로더·본문·내보내기만 둔다. 쿼리 키·활성 조건·문구는 종전 그대로다.
 * 셸이 페이지 제목(h1)을 소유하므로 여기에는 두지 않는다.
 */
type SurveyList = Awaited<ReturnType<typeof surveyAdminService.getSurveyList>>;

export const SURVEY_STATS_LIST_KEY = ['admin-surveys'] as const;

export function loadSurveyStatsList() {
  return surveyAdminService.getSurveyList({});
}

/** 내보내기는 "지금 화면에 보이는 데이터"만 반출한다(감사 P1-6). */
export function surveyStatsExportRows(data: unknown): Record<string, unknown>[] {
  return ((data as SurveyList | undefined)?.list ?? []).map((s) => ({
    srvySn: s.srvySn,
    srvyTtl: s.srvyTtl,
    srvyBgngYmd: toDisplayYmd(s.srvyBgngYmd),
    srvyEndYmd: toDisplayYmd(s.srvyEndYmd),
  }));
}

export const SURVEY_STATS_EXPORT_HEADERS = [
  { label: '설문 일련번호', key: 'srvySn' },
  { label: '설문 제목', key: 'srvyTtl' },
  { label: '시작일', key: 'srvyBgngYmd' },
  { label: '종료일', key: 'srvyEndYmd' },
] as const;

export function SurveyStatsBody({ query }: { readonly query: StatsPanelQuery }) {
  // 날짜 판정 기준일(yyyyMMdd). SSR 과 클라이언트의 타임존이 다를 수 있어 useTodayStorageYmd 로 안전하게 읽는다.
  const today = useTodayStorageYmd();
  const surveys = query.data as SurveyList | undefined;

  if (query.isLoading) return <HubListSkeleton />;
  if (query.isError) {
    return <HubErrorState message="설문조사 목록을 불러오지 못했습니다." onRetry={() => void query.refetch()} />;
  }
  if (!surveys?.list?.length) return <HubEmptyState message="등록된 설문조사가 없습니다." />;
  return (
    <div className="space-y-4">
      {/*
        과거 이 목록은 `qestnrId/qestnrSj/qestnrEndDe` 를 읽었으나 백엔드 계약은
        `SurveyInfoDto{srvySn, srvyTtl, srvyBgngYmd, srvyEndYmd}` 다 → 전 행 제목 공백 +
        상태 배지 전건 오판정이었다. 상태 판정은 공용 SSOT(`lib/poll-status`)로 통일한다.
      */}
      {surveys.list.map((s) => {
        const status = today
          ? getPollStatus({ pollBgngYmd: s.srvyBgngYmd, pollEndYmd: s.srvyEndYmd }, today)
          : null;
        return (
          <div
            key={s.srvySn}
            className="group p-6 md:p-8 rounded-xl bg-card border-2 border-border hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all flex items-center gap-6 relative overflow-hidden"
          >
            <div className="w-16 h-12 shrink-0 bg-muted group-hover:bg-primary/10 rounded-xl flex items-center justify-center shadow-inner transition-colors">
              <Vote className="text-muted-foreground group-hover:text-primary transition-colors" size={24} />
            </div>
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-black tracking-tighter",
                  status === 'active'
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                )}>
                  {status ? POLL_STATUS_LABEL[status] : '…'}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground font-mono">
                  종료일: {toDisplayYmd(s.srvyEndYmd)}
                </span>
              </div>
              <h4 className="text-lg font-bold text-foreground tracking-tighter group-hover:text-primary transition-colors">
                {s.srvyTtl || '(제목 없음)'}
              </h4>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
}
