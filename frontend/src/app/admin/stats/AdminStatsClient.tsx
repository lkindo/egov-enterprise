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
  Globe,
  RefreshCcw,
  Cpu,
  Activity,
  ArrowUpRight,
  Database,
  ShieldCheck,
  CloudLightning,
  AlertTriangle,
  CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const NationalDistributionMap = dynamic(() => import('@/app/components/ui/national-distribution-map').then(mod => mod.NationalDistributionMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] flex flex-col items-center justify-center bg-white rounded-lg space-y-4">
      <div className="w-12 h-12 border-4 border-border border-t-hub-indigo rounded-full animate-spin" />
      <p className="text-xs font-bold tracking-[0.4em] text-muted-foreground uppercase animate-pulse">Mapping Regional Traffic Intelligence...</p>
    </div>
  )
});
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
;

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

  const connectData = initialConnectData || [];
  // 상대 비중(막대 길이)은 기간 내 최댓값 기준으로만 계산한다 — 임의 상수 금지.
  const maxConnect = Math.max(1, ...connectData.map(d => d.statsCo || 0));

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const formatStatsDate = (statsDate: string) =>
    statsDate && statsDate.length === 8
      ? `${statsDate.substring(0, 4)}-${statsDate.substring(4, 6)}-${statsDate.substring(6, 8)}`
      : (statsDate || '-');

  const connectColumns = [
    {
      header: '집계 일자',
      accessor: (item: ConnectPoint) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg transition-transform group-hover:scale-110">
            <CalendarDays size={18} />
          </div>
          <div>
            <span className="font-bold tracking-tighter text-foreground block text-lg tabular-nums leading-none">{formatStatsDate(item.statsDate)}</span>
            <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-2 uppercase">SOURCE: CONNECT_LOG</span>
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
        title="인텔리전스 시스템 아키텍처 분석"
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
        title="시스템 분석"
        highlight="매트릭스"
        subtitle="전체 시스템의 실시간 트래픽 및 주요 메트릭 상호작용 통계 인텔리전스"
        icon={BarChart3}
        actions={
          <div className="flex gap-4 p-2 items-center">
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
            title="네트워크 트래픽 진화"
            description="최근 1개월 간 일자별 접속 건수 추이입니다"
            icon={Activity}
          >
            <div className="p-4 bg-muted/50 rounded-lg border border-border/30 overflow-hidden group">
              <StandardChartWrapper
                title="NETWORK TRAFFIC EVOLUTION"
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

      <div className="grid grid-cols-12 gap-10 px-2">
        <div className="col-span-12 flex flex-col gap-10">
          <HubSectionCard
            title="지리적 트래픽 분포"
            description="익명화된 데이터 기반 네트워크 지리적 기원지 매핑입니다"
            icon={Globe}
          >
            <div className="p-4 bg-white rounded-lg border-2 border-border flex items-center justify-center min-h-[480px] shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0)', backgroundSize: '16px 16px' }} />
              <NationalDistributionMap />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <HubSectionCard
        title="일자별 접속 통계"
        description="차트에 사용된 접속 집계의 원본 수치입니다."
        icon={Cpu}
        statusBadges={
          <HubStatusBadge label={`${connectData.length}일 집계`} variant="success" className="bg-emerald-500/10 text-emerald-800 border-none text-xs font-bold tracking-widest" />
        }
      >
        <div className="px-2 overflow-x-auto">
          <StandardDataTable
            columns={connectColumns}
            data={connectData.slice(0, 10)}
            loading={loading}
            emptyMessage={loadError ? '조회에 실패하여 데이터를 표시할 수 없습니다.' : '조회된 접속 통계가 없습니다.'}
            className="border-none rounded-none bg-transparent min-w-[700px]"
          />
        </div>
      </HubSectionCard>

      <div className="relative group rounded-lg overflow-hidden bg-surface-inverse shadow-2xl p-24 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-hub-indigo/5 opacity-50" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-lg group-hover:scale-150 transition-transform duration-[3s]" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="space-y-10 flex-1 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-[0.6em] text-surface-inverse-foreground/80 uppercase leading-none">시스템 무결성 요약</h2>
              <h3 className="text-5xl lg:text-8xl font-bold tracking-tighter text-surface-inverse-foreground leading-[0.9] uppercase tabular-nums">
                Optimized <br />
                <span className="text-primary">_ Intelligence</span> Core
              </h3>
            </div>
            <p className="text-lg lg:text-xl text-surface-inverse-foreground/90 font-bold max-w-3xl leading-relaxed tracking-tight">
              최근 1개월 간 {connectData.length}일치 접속 집계를 수집했습니다. 상세 지표는 상단 차트와 일자별 접속 통계 표에서 확인할 수 있습니다.
            </p>
          </div>
          <div className="shrink-0">
            <Button className="h-24 px-16 bg-white text-foreground rounded-lg font-bold text-lg tracking-[0.2em] shadow-2xl hover:bg-primary hover:text-white transition-all hover:-translate-y-2 active:scale-95 flex items-center gap-6 group/btn uppercase border-none">
              Execute Global Report
              <ArrowUpRight size={28} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LuxuryStatCard({ title, value, icon, trend, isAlert, color }: any) {
  const iconBgMap: any = {
    slate: "bg-surface-inverse text-surface-inverse-foreground shadow-xl",
    primary: "bg-primary text-white shadow-xl shadow-primary/20",
    indigo: "bg-hub-indigo text-white shadow-xl shadow-hub-indigo/20",
    rose: "bg-white text-rose-600 shadow-sm"
  };

  return (
    <div className={cn(
      "hub-table-container p-12 group hover:scale-[1.05] transition-all relative overflow-hidden bg-white border-border/50",
      isAlert && value > 0 && "ring-4 ring-rose-500/10"
    )}>
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className={cn("w-16 h-11 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-2xl", iconBgMap[color])}>
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-xs font-bold px-3 py-1 rounded-lg tracking-widest uppercase",
              color === 'rose' ? "bg-white text-rose-600 shadow-inner" : "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 shadow-sm"
            )}>
              {trend}
            </span>
          </div>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-4xl font-bold tracking-tighter tabular-nums leading-none text-foreground">{value?.toLocaleString() ?? 0}</h3>
        <p className="text-xs font-bold text-muted-foreground tracking-[0.4em] mt-5 flex items-center gap-3 uppercase leading-none">
          <span className="w-6 h-0.5 bg-current opacity-100" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-all duration-1000 grayscale">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 240 }) : null}
      </div>
    </div>
  );
}
