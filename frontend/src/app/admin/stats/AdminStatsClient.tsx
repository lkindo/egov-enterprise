'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { SummaryStats, MenuStats } from '@/types/foundation/stats';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import {
  BarChart3,
  Users,
  FileText,
  MousePointer2,
  AlertTriangle,
  TrendingUp,
  Globe,
  RefreshCcw,
  Zap,
  Clock,
  Layout,
  Cpu,
  BarChart,
  Activity,
  ArrowUpRight,
  Database,
  ShieldCheck,
  Server,
  ZapOff,
  CloudLightning,
  Monitor,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const NationalDistributionMap = dynamic(() => import('@/app/components/ui/national-distribution-map').then(mod => mod.NationalDistributionMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] flex flex-col items-center justify-center bg-white rounded-lg space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-lg animate-spin" />
      <p className="text-xs font-bold tracking-[0.4em] text-slate-600 uppercase animate-pulse">Mapping Regional Traffic Intelligence...</p>
    </div>
  )
});
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminStatsClient({
  initialSummary,
  initialConnectData,
  initialMenuData
}: {
  initialSummary: SummaryStats | null;
  initialConnectData: any[];
  initialMenuData: MenuStats[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [browserData] = useState([
    { name: 'Chrome', count: 6542 },
    { name: 'Safari', count: 2120 },
    { name: 'Edge', count: 1250 },
    { name: 'Others', count: 580 }
  ]);

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const menuColumns = [
    {
      header: '인텔리전스 노드',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
            <Layout size={18} />
          </div>
          <div>
            <span className="font-bold tracking-tighter text-foreground block text-lg uppercase leading-none">{item.menuNm}</span>
            <span className="text-xs font-bold text-slate-600 tracking-[0.3em] mt-2 uppercase">NODE_TYPE: CORE_MODULE</span>
          </div>
        </div>
      )
    },
    {
      header: '상호작용 횟수',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary opacity-100" />
          <span className="font-mono font-bold text-primary text-lg tracking-tighter tabular-nums underline decoration-primary/20 decoration-4 underline-offset-4">{item?.statsCo?.toLocaleString() || '0'}</span>
        </div>
      )
    },
    {
      header: '영향력 매트릭스',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-6 min-w-[240px]">
          <div className="flex-1 h-3 bg-slate-100 dark:bg-muted/30 rounded-lg overflow-hidden shadow-inner border border-border/10">
            <div
              className="h-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500 transition-all duration-1000 ease-out shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
              style={{ width: `${item?.percentage || 0}%` }}
            />
          </div>
          <span className="text-[12px] font-bold text-foreground w-12 text-right tracking-tighter tabular-nums">{item?.percentage || 0}%</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="인텔리전스 시스템 아키텍처 분석"
        breadcrumbs={[{ label: '시스템관리' }, { label: '분석 대시보드' }]}
      />

      <HubHeader
        title="시스템 분석"
        highlight="매트릭스"
        subtitle="전체 시스템의 실시간 트래픽 및 주요 메트릭 상호작용 통계 인텔리전스"
        icon={BarChart3}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <select 
              className="h-12 px-6 rounded-lg border-2 border-border bg-white font-bold text-xs tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-sm"
              aria-label="통계 조회 기간 선택"
            >
              <option>REALTIME_FLOW (14D)</option>
              <option>MONTHLY_BATCH (30D)</option>
              <option>QUARTERLY_ANALYSIS</option>
            </select>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="h-12 w-12 p-0 rounded-lg border-2 font-bold shadow-sm"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <div className="hidden sm:block">
              <DataExportExcel
                data={initialMenuData || []}
                headers={[
                  { label: '메뉴명', key: 'menuNm' },
                  { label: '사용자 수', key: 'statsCo' },
                  { label: '비중(%)', key: 'percentage' }
                ]}
                filename="system_intelligence_stats"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
        <LuxuryStatCard title="누적 데이터 노드" value={initialSummary?.totalUsers || 0} icon={<Database size={26} />} trend="+2.5%" color="slate" />
        <LuxuryStatCard title="활성 커넥션" value={initialSummary?.todayConnects || 0} icon={<CloudLightning size={26} />} trend="+12%" color="primary" />
        <LuxuryStatCard title="데이터 영속성" value={initialSummary?.totalPosts || 0} icon={<ShieldCheck size={26} />} trend="+0.8%" color="indigo" />
      </div>

      <div className="grid grid-cols-12 gap-10 px-2 mt-4">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10">
          <HubSectionCard
            title="네트워크 트래픽 진화"
            description="시스템 전반에 걸친 데이터 스트림의 흐름 및 진화 양상을 분석합니다"
            icon={Activity}
          >
            <div className="p-4 bg-slate-50/50 rounded-lg border border-border/30 overflow-hidden group">
              <StandardChartWrapper
                title="NETWORK TRAFFIC EVOLUTION"
                type="area"
                data={initialConnectData || []}
                dataKeys={['statsCo']}
                loading={loading}
                height={350}
                className="relative z-10"
              />
            </div>
          </HubSectionCard>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
          <HubSectionCard
            title="환경 기기 분포"
            description="사용자 접속 환경의 프로파일링 및 기기별 세션 비중입니다"
            icon={Monitor}
          >
            <div className="bg-slate-900 text-white rounded-lg p-8 shadow-2xl relative overflow-hidden group min-h-[440px] flex items-center justify-center">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary/20 blur-[40px] pointer-events-none" />
              <StandardChartWrapper
                title="ENVIRONMENT DISTRIBUTION"
                type="pie"
                data={browserData}
                dataKeys={['statsCo']}
                loading={loading}
                height={350}
                className="relative z-10"
              />
              <div className="absolute left-[-20%] bottom-[-20%] opacity-10 rotate-12 pointer-events-none grayscale">
                <Globe size={240} />
              </div>
            </div>
          </HubSectionCard>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10 px-2">
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-10">
          <HubSectionCard
            title="최다 상호작용 서비스"
            description="사용자의 의도가 가장 밀집된 핵심 상호작용 지점 분석입니다"
            icon={Target}
          >
            <div className="p-8 bg-slate-50 rounded-lg border border-border/30 shadow-inner">
              <StandardChartWrapper
                title="HIGH-INTERACTION SERVICES"
                type="bar"
                data={(initialMenuData || []).slice(0, 5).map(m => ({ name: m?.menuNm || 'Unknown', statsCo: m?.statsCo || 0 }))}
                dataKeys={['statsCo']}
                loading={loading}
                height={380}
              />
            </div>
          </HubSectionCard>
        </div>
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-10">
          <HubSectionCard
            title="지리적 트래픽 분포"
            description="익명화된 데이터 기반 네트워크 지리적 기원지 매핑입니다"
            icon={Globe}
          >
            <div className="p-4 bg-white rounded-lg border-2 border-slate-50 flex items-center justify-center min-h-[480px] shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0)', backgroundSize: '16px 16px' }} />
              <NationalDistributionMap />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <HubSectionCard
        title="운영 매트릭스 보고"
        description="시스템 전반에 걸친 마이크로 상호작용 노드들의 세부 데이터 보고서입니다."
        icon={Cpu}
        statusBadges={
          <HubStatusBadge label="고밀도 스트림" variant="success" className="bg-emerald-500/10 text-emerald-800 border-none animate-pulse text-xs font-bold tracking-widest" />
        }
      >
        <div className="px-2 overflow-x-auto">
          <StandardDataTable
            columns={menuColumns}
            data={(initialMenuData || []).slice(0, 10)}
            loading={loading}
            emptyMessage="시스템 패턴 분석 중..."
            className="border-none rounded-none bg-transparent min-w-[700px]"
          />
        </div>
      </HubSectionCard>

      <div className="relative group rounded-lg overflow-hidden bg-slate-900 shadow-2xl p-24 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/5 opacity-50" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-lg group-hover:scale-150 transition-transform duration-[3s]" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="space-y-10 flex-1 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-[0.6em] text-white/80 uppercase leading-none">시스템 무결성 요약</h2>
              <h3 className="text-5xl lg:text-8xl font-bold tracking-tighter text-white leading-[0.9] uppercase tabular-nums">
                Optimized <br />
                <span className="text-primary">_ Intelligence</span> Core
              </h3>
            </div>
            <p className="text-lg lg:text-xl text-white/90 font-bold max-w-3xl leading-relaxed tracking-tight">
              시스템 자원의 99.9%가 효율적으로 관리되고 있습니다. 인텔리전스 엔진은 실시간 주요 이벤트를 추적하여 최적의 성능 프로파일을 동적으로 생성하고 있습니다.
            </p>
          </div>
          <div className="shrink-0">
            <Button className="h-24 px-16 bg-white text-slate-900 rounded-lg font-bold text-lg tracking-[0.2em] shadow-2xl hover:bg-primary hover:text-white transition-all hover:-translate-y-2 active:scale-95 flex items-center gap-6 group/btn uppercase border-none">
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
  const colorMap: any = {
    slate: "bg-white text-slate-900 border-border/50 shadow-md",
    primary: "bg-white text-primary border-primary/10 shadow-md",
    indigo: "bg-white text-indigo-600 border-indigo-100 shadow-md",
    rose: "bg-rose-50 text-rose-600 border-rose-100 shadow-md"
  };

  const iconBgMap: any = {
    slate: "bg-slate-900 text-white shadow-xl shadow-slate-900/20",
    primary: "bg-primary text-white shadow-xl shadow-primary/20",
    indigo: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
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
        <p className="text-xs font-bold text-slate-600 tracking-[0.4em] mt-5 flex items-center gap-3 uppercase leading-none">
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
