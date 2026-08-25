'use client';

import { useState } from 'react';
import { ReportPage } from '@/app/components/patterns/report-page';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { SummaryStats, ConnectPoint } from '@/types/foundation/stats';
import { RefreshCcw, CalendarDays, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDisplayYmd } from '@/lib/format-date';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/** 일자별 접속 통계 표의 페이지당 건수 */
const CONNECT_PAGE_SIZE = 10;

export default function AdminStatsClient({
  initialSummary,
  initialConnectData,
  loadError = null
}: {
  initialSummary: SummaryStats | null;
  initialConnectData: ConnectPoint[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const connectData = initialConnectData || [];
  // 상대 비중(막대 길이)은 기간 내 최댓값 기준으로만 계산한다 — 임의 상수 금지.
  const maxConnect = Math.max(1, ...connectData.map(d => d.statsCo || 0));

  // 표는 앞 10건만 잘라 보여주고 나머지는 UI 로 도달 불가였다(감사 P0-28/P1-4).
  // 총 건수를 노출하고 페이저로 전 구간에 도달할 수 있게 한다.
  const totalPages = Math.max(1, Math.ceil(connectData.length / CONNECT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedConnectData = connectData.slice(
    (currentPage - 1) * CONNECT_PAGE_SIZE,
    currentPage * CONNECT_PAGE_SIZE
  );

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const connectColumns = [
    {
      header: '집계 일자',
      accessor: (item: ConnectPoint) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg transition-transform group-hover:scale-110">
            <CalendarDays size={18} />
          </div>
          <div>
            <span className="font-bold tracking-tighter text-foreground block text-lg tabular-nums leading-none">{toDisplayYmd(item.statsDate)}</span>
            <span className="text-xs font-bold text-muted-foreground tracking-tight mt-2 block">출처: 접속 로그</span>
          </div>
        </div>
      )
    },
    {
      header: '접속 건수',
      accessor: (item: ConnectPoint) => (
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary opacity-100" />
          <span className="font-mono font-bold text-primary text-lg tracking-tighter tabular-nums underline decoration-primary/20 decoration-4 underline-offset-4">{(item?.statsCo ?? 0).toLocaleString()}</span>
        </div>
      )
    },
    {
      header: '기간 내 상대 비중',
      accessor: (item: ConnectPoint) => {
        const ratio = Math.round(((item?.statsCo || 0) / maxConnect) * 100);
        return (
          <div className="flex items-center gap-6 min-w-[240px]">
            <div className="flex-1 h-3 bg-muted dark:bg-muted/30 rounded-lg overflow-hidden shadow-inner border border-border/10">
              <div
                className="h-full bg-gradient-to-r from-primary via-hub-indigo to-hub-purple transition-all duration-1000 ease-out shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
                style={{ width: `${ratio}%` }}
              />
            </div>
            <span className="text-[12px] font-bold text-foreground w-12 text-right tracking-tighter tabular-nums">{ratio}%</span>
          </div>
        );
      }
    }
  ];

  return (
    <ReportPage
      title="관리자 통계"
      description="사용자·게시물 누적 현황과 일자별 접속 집계를 확인합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '분석 대시보드' }]}
      // A7 필수 — 무엇을·언제까지·어디서 센 값인지 없으면 지표는 검증할 수 없는 주장이 된다.
      basis={`집계 기준: 최근 1개월 일자별 접속 로그 · 수집된 일수 ${connectData.length}일 · 출처: 시스템 접속 통계 API`}
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
            className="gap-2"
          >
            <RefreshCcw size={16} className={cn(loading && "animate-spin")} aria-hidden="true" />
            새로고침
          </Button>
          <DataExportExcel
            scope="loaded"
            data={connectData}
            headers={[
              { label: '집계 일자', key: 'statsDate' },
              { label: '접속 건수', key: 'statsCo' }
            ]}
            filename="system_connect_stats"
          />
        </>
      }
      summary={
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryStat title="누적 사용자" value={initialSummary?.totalUsers ?? 0} />
          <SummaryStat title="금일 접속" value={initialSummary?.todayConnects ?? 0} />
          <SummaryStat title="누적 게시물" value={initialSummary?.totalPosts ?? 0} />
        </div>
      }
      chartTitle="일자별 접속 추이"
      chart={
        <StandardChartWrapper
          title="일자별 접속 건수 추이"
          type="area"
          data={connectData}
          dataKeys={['statsCo']}
          loading={loading}
          height={350}
        />
      }
      tableTitle="일자별 접속 통계"
    >
      {/* 조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 전달(감사 P1-1) */}
      <StandardDataTable
        accessibleLabel="일자별 접속 통계"
        columns={connectColumns}
        data={pagedConnectData}
        loading={loading}
        error={loadError ? new Error(loadError) : null}
        onRetry={handleRefresh}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setPage,
          totalCount: connectData.length,
          pageSize: CONNECT_PAGE_SIZE
        }}
        emptyMessage="조회된 접속 통계가 없습니다."
      />
    </ReportPage>
  );
}

/** 요약 지표 한 칸. 값의 출처는 ReportPage 의 basis 가 설명한다. */
function SummaryStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
