'use client';

import { useState, useTransition } from 'react';
import { ReportPage } from '@/app/components/patterns/report-page';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { SummaryStats } from '@/types/foundation/stats';
import type { StatsPoint } from '@/services/foundation/system/StatsAdminService';
import { RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { isStatsOverviewCard } from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import { statsPanels } from '@/extensions/generated-stats-panels';
import { useStatsHubNavigation } from './StatsHubParts';

/** 일자별 접속 통계 표의 페이지당 건수 */
const CONNECT_PAGE_SIZE = 10;

/** 차트 계열 이름 — 도움말(tooltip)에 이 이름이 보인다. */
const CONNECT_SERIES = '성공 로그인';

/** 서버가 통계 요약(/admin/stats)에 미리 채워 넘기는 값. */
export interface AdminStatsOverview {
  initialSummary: SummaryStats | null;
  /** 최근 1개월 일자별 성공 로그인 — 서버가 날짜 오름차순으로 내고 기록이 없는 날은 0 이다. */
  initialConnectData: StatsPoint[];
  loadError?: string | null;
}

export default function AdminStatsClient({
  initialSummary,
  initialConnectData,
  loadError = null,
}: AdminStatsOverview) {
  const router = useRouter();
  // 통계 하위 화면으로 가는 내비게이션 — 통계 셸이 이 화면 둘레에 둔다(셸 밖에서 그리면 없다).
  const navigation = useStatsHubNavigation();
  // 기능이 넘기는 요약 칸(stats-panels 의 overview-card). 게시판이 있으면 게시물 수 칸이 붙는다(허브 분해 H4).
  const featureCards = useSlotEntries(statsPanels, isStatsOverviewCard);
  // [2026-09-26 DIP V9] 새로고침 표시는 실제 서버 재조회가 끝날 때까지다. 종전에는 800ms 뒤 무조건 꺼져
  //   재조회가 끝나기 전에 '완료' 처럼 보이거나, 이미 끝났는데도 돌고 있었다.
  const [loading, startRefresh] = useTransition();
  const [page, setPage] = useState(1);

  // [2026-10-20] 서버가 날짜 오름차순으로 내고 빈 날을 0 으로 채운다 — 화면은 정렬·형식을 고치지 않는다.
  const connectData = initialConnectData || [];
  // 상대 비중(막대 길이)은 기간 내 최댓값 기준으로만 계산한다 — 임의 상수 금지.
  const maxConnect = Math.max(1, ...connectData.map(d => d.value));
  // 축 눈금은 'MM-DD' 다 — 연도는 집계 구간이 소유한다.
  const chartData = connectData.map((point) => ({ name: point.date.slice(5), [CONNECT_SERIES]: point.value }));

  // 표는 앞 10건만 잘라 보여주고 나머지는 UI 로 도달 불가였다(감사 P0-28/P1-4).
  // 총 건수를 노출하고 페이저로 전 구간에 도달할 수 있게 한다.
  const totalPages = Math.max(1, Math.ceil(connectData.length / CONNECT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedConnectData = connectData.slice(
    (currentPage - 1) * CONNECT_PAGE_SIZE,
    currentPage * CONNECT_PAGE_SIZE
  );

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  const connectColumns = [
    {
      header: '집계 일자',
      accessor: (item: StatsPoint) => <span className="tabular-nums text-foreground">{item.date}</span>,
    },
    {
      header: '성공 로그인 건수',
      accessor: (item: StatsPoint) => <span className="font-semibold tabular-nums text-foreground">{item.value.toLocaleString()}</span>,
    },
    {
      header: '기간 내 상대 비중',
      accessor: (item: StatsPoint) => {
        const ratio = Math.round((item.value / maxConnect) * 100);
        return (
          <div className="flex min-w-[200px] items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded bg-muted" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
            </div>
            <span className="w-12 text-right tabular-nums text-muted-foreground">{ratio}%</span>
          </div>
        );
      }
    }
  ];

  return (
    <ReportPage
      title="관리자 통계"
      description="누적 현황과 일자별 성공 로그인 집계를 확인합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '분석 대시보드' }]}
      navigation={navigation}
      // A7 필수 — 무엇을·언제까지·어디서 센 값인지 없으면 지표는 검증할 수 없는 주장이 된다.
      basis={`집계 기준: 최근 1개월 성공 로그인만 집계 · 집계 일수 ${loadError ? '조회 실패' : `${connectData.length}일(기록이 없는 날은 0)`} · 실패·결과 미상 시도 제외 · 출처: 시스템 접속 통계 API`}
      notice={loadError && (
        <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive-emphasis">통계 데이터 조회 실패</p>
          <p className="text-xs text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>다시 시도</Button>
        </div>
      )}
      actions={
        <>
          {/* aria-label 은 e2e POM(StatsPage.refresh)이 셀렉터로 쓰므로 문구를 바꾸지 않는다 */}
          <Button
            variant="outline"
            size="sm"
            aria-label="새로고침"
            onClick={handleRefresh}
            aria-busy={loading || undefined}
            className="gap-2"
          >
            <RefreshCcw size={16} className={cn(loading && "animate-spin")} aria-hidden="true" />
            새로고침
          </Button>
          <DataExportExcel
            scope="loaded"
            data={connectData}
            headers={[
              { label: '집계 일자', key: 'date' },
              { label: '성공 로그인 건수', key: 'value' }
            ]}
            filename="system_connect_stats"
          />
        </>
      }
      summary={
        // 열 수는 칸 수로 정한다 — 게시판이 빠진 구성에는 게시물 수 칸(게시판 기여)이 없어 빈 열을 남기지 않는다.
        <div className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
          <SummaryStat title="누적 사용자" value={summaryText(initialSummary?.totalUsers, loadError)} />
          <SummaryStat title="금일 성공 로그인" value={summaryText(initialSummary?.todayConnects, loadError)} />
          {featureCards.map((card) => (
            <SummaryStat key={card.id} title={card.title} value={summaryText(initialSummary?.[card.field], loadError)} />
          ))}
        </div>
      }
      chartTitle="일자별 성공 로그인 추이"
      chart={
        <StandardChartWrapper
          title="일자별 성공 로그인 건수 추이"
          type="area"
          data={chartData}
          dataKeys={[CONNECT_SERIES]}
          loading={loading}
          height={350}
        />
      }
      tableTitle="일자별 성공 로그인 통계"
    >
      {/* 조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 전달(감사 P1-1) */}
      <StandardDataTable
        accessibleLabel="일자별 성공 로그인 통계"
        columns={connectColumns}
        data={pagedConnectData}
        keyField="date"
        loading={loading}
        error={loadError ? new Error(loadError) : null}
        onRetry={handleRefresh}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setPage,
          // 조회에 실패하면 총 건수는 0 이 아니라 알 수 없다 — 넘기지 않아 "총 0건" 을 그리지 않는다.
          totalCount: loadError ? undefined : connectData.length,
          pageSize: CONNECT_PAGE_SIZE
        }}
        emptyMessage="조회된 성공 로그인 통계가 없습니다."
      />
    </ReportPage>
  );
}

/**
 * 요약 지표 칸의 표시 문구. [2026-09-15 DEC-OPS-100] 조회 실패와 읽을 수 없는 값을 0 으로 쓰지 않는다 —
 * 종전에는 실패 경고 바로 옆에 "누적 사용자 0" 을 그렸다.
 */
function summaryText(value: number | null | undefined, loadError: string | null | undefined): string {
  if (loadError) return '조회 실패';
  return typeof value === 'number' ? value.toLocaleString() : '-';
}

/** 요약 지표 한 칸. 값의 출처는 ReportPage 의 basis 가 설명한다. */
function SummaryStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
