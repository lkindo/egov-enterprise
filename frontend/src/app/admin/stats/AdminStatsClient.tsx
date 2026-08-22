'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { SummaryStats, ConnectPoint } from '@/types/foundation/stats';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { BarChart3,
  RefreshCcw,
  Cpu,
  Activity,
  Database,
  ShieldCheck,
  CloudLightning,
  AlertTriangle,
  CalendarDays } from 'lucide-react';
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
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="관리자 통계"
        breadcrumbs={[{ label: '시스템관리' }, { label: '분석 대시보드' }]}
      />

      {loadError && (
        <div
          role="alert"
          className="mx-2 flex items-start gap-4 rounded-lg border-2 border-rose-500/30 bg-rose-500/5 p-6"
        >
          <AlertTriangle size={22} className="mt-0.5 shrink-0 text-rose-600" />
          <div className="space-y-2">
            <p className="text-sm font-bold tracking-tight text-rose-700">통계 데이터 조회 실패</p>
            <p className="text-xs font-bold tracking-tight text-rose-600/90">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 h-9 rounded-lg border-2 text-xs font-bold tracking-tight"
            >
              다시 시도
            </Button>
          </div>
        </div>
      )}

      <HubHeader
        title="최근 1개월"
        highlight="접속 통계"
        subtitle="사용자·게시물 누적 현황과 일자별 접속 집계를 확인합니다"
        icon={BarChart3}
        actions={
          <div className="flex gap-4 p-2 items-center">
            {/* aria-label 은 e2e POM(StatsPage.refresh)이 셀렉터로 쓰므로 문구를 바꾸지 않는다 */}
            <Button
              variant="outline"
              size="lg"
              aria-label="새로고침"
              onClick={handleRefresh}
              className="h-12 w-12 p-0 rounded-lg border-2 font-bold shadow-sm"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <div className="hidden sm:block">
              <DataExportExcel
                data={connectData}
                headers={[
                  { label: '집계 일자', key: 'statsDate' },
                  { label: '접속 건수', key: 'statsCo' }
                ]}
                filename="system_connect_stats"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
        <LuxuryStatCard title="누적 사용자" value={initialSummary?.totalUsers ?? 0} icon={<Database size={26} />} color="slate" />
        <LuxuryStatCard title="금일 접속" value={initialSummary?.todayConnects ?? 0} icon={<CloudLightning size={26} />} color="primary" />
        <LuxuryStatCard title="누적 게시물" value={initialSummary?.totalPosts ?? 0} icon={<ShieldCheck size={26} />} color="indigo" />
      </div>

      <div className="grid grid-cols-12 gap-10 px-2 mt-4">
        <div className="col-span-12 flex flex-col gap-10">
          <HubSectionCard
        title="일자별 접속 추이"
            description="최근 1개월 간 일자별 접속 건수 추이입니다"
            icon={Activity}
          >
            <div className="p-4 bg-muted/50 rounded-lg border border-border/30 overflow-hidden group">
              <StandardChartWrapper
                title="일자별 접속 건수 추이"
                type="area"
                data={connectData}
                dataKeys={['statsCo']}
                loading={loading}
                height={350}
                className="relative z-10"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>

      {/*
        [삭제] '지리적 트래픽 분포' 섹션 (감사 P1-5 — 근거 없는 지표).
        `NationalDistributionMap` 은 `MOCK_MAP_DATA`(서울 1250 · 경상 1050 …) 하드코딩을
        운영 지역 통계처럼 표시했다. 백엔드에 지역 집계
        소스가 없어 실제 값으로 대체할 수 없고, 컴포넌트 내부 문구는 이 화면에서 고칠 수 없으므로
        (소유 경로 밖) '카드 삭제' 원칙을 적용한다. 지역 통계 집계 API 가 생기면 재도입할 것.
      */}

      <HubSectionCard
        title="일자별 접속 통계"
        description="차트에 사용된 접속 집계의 원본 수치입니다."
        icon={Cpu}
        statusBadges={
          <HubStatusBadge label={`${connectData.length}일 집계`} variant="success" className="bg-emerald-500/10 text-emerald-800 border-none text-xs font-bold tracking-widest" />
        }
      >
        <div className="px-2 overflow-x-auto">
          {/* 조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 전달(감사 P1-1) */}
          <StandardDataTable
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
            className="border-none rounded-none bg-transparent min-w-[700px]"
          />
        </div>
      </HubSectionCard>

      {/*
        과거 이 영역에는 핸들러가 없는 'Execute Global Report' 버튼과 근거 없는 영문 카피가 있었다(감사 P1-6/P1-5).
        버튼은 제거하고, 실제 수집 결과만 문장으로 요약한다.
      */}
      <div className="relative group rounded-lg overflow-hidden bg-surface-inverse shadow-2xl p-8 md:p-14 lg:p-20 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-hub-indigo/5 opacity-50" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-lg group-hover:scale-150 transition-transform duration-[3s]" />
        <div className="relative z-10 space-y-6 text-center lg:text-left">
          <h2 className="text-xs font-bold tracking-[0.4em] text-surface-inverse-foreground/80 leading-none">시스템 무결성 요약</h2>
          <h3 className="text-3xl lg:text-5xl font-bold tracking-tighter text-surface-inverse-foreground leading-tight">
            최근 1개월 <span className="text-primary tabular-nums">{connectData.length}일</span>치 접속 집계 수집 완료
          </h3>
          <p className="text-base lg:text-lg text-surface-inverse-foreground/90 font-bold max-w-3xl leading-relaxed tracking-tight">
            상세 지표는 상단 차트와 일자별 접속 통계 표에서 확인할 수 있으며, 원본 수치는 우측 상단 &lsquo;엑셀 내보내기&rsquo;로 반출할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

type StatCardColor = 'slate' | 'primary' | 'indigo';

const STAT_ICON_BG: Record<StatCardColor, string> = {
  slate: "bg-surface-inverse text-surface-inverse-foreground shadow-xl",
  primary: "bg-primary text-primary-foreground shadow-xl shadow-primary/20",
  indigo: "bg-hub-indigo text-primary-foreground shadow-xl shadow-hub-indigo/20",
};

/**
 * 요약 지표 카드.
 * ⚠ 증감(trend) 배지는 두지 않는다 — 백엔드가 비교 기준 기간을 제공하지 않아
 *   과거 하드코딩 배지가 거짓 지표였다(감사 P1-5).
 */
function LuxuryStatCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: StatCardColor;
}) {
  return (
    <div className="hub-table-container p-8 md:p-12 group hover:scale-[1.05] transition-all relative overflow-hidden bg-card border-border/50">
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className={cn("w-16 h-11 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-2xl", STAT_ICON_BG[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-4xl font-bold tracking-tighter tabular-nums leading-none text-foreground">{value?.toLocaleString() ?? 0}</h3>
        <p className="text-xs font-bold text-muted-foreground tracking-[0.4em] mt-5 flex items-center gap-3 leading-none">
          <span className="w-6 h-0.5 bg-current opacity-100" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-all duration-1000 grayscale" aria-hidden="true">
        {React.isValidElement<{ size?: number }>(icon)
          ? React.cloneElement(icon, { size: 240 })
          : null}
      </div>
    </div>
  );
}
