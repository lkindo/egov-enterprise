'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { SummaryStats, MenuStats } from '@/types/stats';
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
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NationalDistributionMap } from '@/app/components/ui/national-distribution-map';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
      header: 'Intelligence Node',
      accessor: (item: MenuStats) => (
          <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
                  <Layout size={14} />
              </div>
              <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.menuNm}</span>
          </div>
      )
    },
    {
      header: 'Interaction Count',
      accessor: (item: MenuStats) => (
        <span className="font-mono font-black text-primary italic">{item.count.toLocaleString()}</span>
      )
    },
    {
      header: 'Impact Matrix',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-slate-900 transition-all duration-1000 ease-out"
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-slate-400 w-10 text-right italic tracking-widest">{item.percentage}%</span>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="인텔리전스 시스템 아키텍처 분석"
        breadcrumbs={[{ label: '시스템관리' }, { label: '분석 대시보드' }]}
        actions={
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <select className="h-10 md:h-14 px-3 md:px-6 rounded-xl md:rounded-2xl border-2 border-slate-100 bg-white font-black text-[9px] md:text-[10px] uppercase tracking-widest italic outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer">
              <option>PAST 14 DAYS</option>
              <option>LATEST 30 DAYS</option>
              <option>QUARTERLY ANALYSIS</option>
            </select>
            <Button
                onClick={handleRefresh}
                className="h-10 md:h-14 w-10 md:w-14 rounded-xl md:rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md md:shadow-xl active:scale-95"
            >
                <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <div className="hidden sm:block">
                <DataExportExcel
                  data={initialMenuData}
                  headers={[
                    { label: '메뉴명', key: 'menuNm' },
                    { label: '사용횟수', key: 'count' },
                    { label: '비중(%)', key: 'percentage' }
                  ]}
                  filename="system_intelligence_stats"
                />
            </div>
          </div>
        }
      />

      {/* Luxury Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <LuxuryStatCard title="Accumulated Nodes" value={initialSummary?.totalUsers} icon={<Users size={24} />} trend="+2.5%" color="slate" />
        <LuxuryStatCard title="Active Protocols" value={initialSummary?.todayConnects} icon={<Zap size={24} />} trend="+12%" color="primary" />
        <LuxuryStatCard title="Data Persistence" value={initialSummary?.totalPosts} icon={<FileText size={24} />} trend="+0.8%" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 responsive-card p-6 md:p-10 relative overflow-hidden group">
            <StandardChartWrapper
                title="NETWORK TRAFFIC EVOLUTION"
                type="area"
                data={initialConnectData}
                dataKeys={['count']}
                loading={loading}
                height={300}
                className="relative z-10"
            />
            <div className="absolute right-[-5%] top-[-5%] text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -rotate-12 pointer-events-none">
                <TrendingUp size={200} />
            </div>
        </div>

        <div className="bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2.5rem] lg:rounded-[4rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group">
            <StandardChartWrapper
                title="ENVIRONMENT DISTRIBUTION"
                type="pie"
                data={browserData}
                dataKeys={['count']}
                loading={loading}
                height={300}
                className="relative z-10"
            />
            <div className="absolute left-[-20%] bottom-[-20%] opacity-5 rotate-12 pointer-events-none">
                <Globe size={220} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="responsive-card p-6 md:p-10 h-full">
            <StandardChartWrapper
                title="HIGH-INTERACTION SERVICES"
                type="bar"
                data={initialMenuData.slice(0, 5).map(m => ({ name: m.menuNm, count: m.count }))}
                dataKeys={['count']}
                loading={loading}
                height={350}
            />
        </div>
        <div className="responsive-card p-2 md:p-4 ring-1 ring-slate-50 flex items-center justify-center min-h-[360px] md:min-h-[460px]">
            <NationalDistributionMap />
        </div>
      </div>

      {/* Deep Analytics Table */}
      <div className="responsive-card p-2 md:p-4 ring-1 ring-slate-50 relative overflow-hidden">
        <div className="p-6 md:p-12 space-y-6 md:space-y-10 bg-slate-50/50 rounded-[1.5rem] md:rounded-[4.5rem]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 md:px-6">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 md:w-16 h-12 md:h-16 bg-slate-900 text-white rounded-xl md:rounded-[1.75rem] flex items-center justify-center shadow-xl">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Deep Intelligence Report</h3>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Sub-system interaction matrix</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 md:px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 w-fit">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] italic">Real-time Stream</span>
                </div>
            </div>

            <div className="px-1 md:px-2 overflow-x-auto">
                <StandardDataTable
                    columns={menuColumns}
                    data={initialMenuData.slice(0, 10)}
                    loading={loading}
                    emptyMessage="Analyzing system patterns..."
                    className="border-none rounded-none bg-transparent min-w-[600px]"
                />
            </div>
        </div>
      </div>

      {/* System Intelligence Summary Footer */}
      <div className="p-8 md:p-16 rounded-[1.5rem] md:rounded-[2.5rem] lg:rounded-[5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-slate-800 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 text-center lg:text-left">
          <div className="space-y-6 md:space-y-8 flex-1">
            <h2 className="text-3xl md:text-7xl font-black tracking-tighter leading-tight uppercase italic tabular-nums">
                Optimized <br />
                <span className="text-primary italic">Intelligence</span> Core
            </h2>
            <p className="text-sm md:text-lg text-slate-400 font-bold max-w-2xl leading-relaxed">
                시스템 자원의 99.9%가 효율적으로 관리되고 있습니다. 인텔리전스 엔진은 실시간 도메인 이벤트를 추적하여 최적의 성능 프로파일을 생성합니다.
            </p>
          </div>
          <button className="h-16 md:h-20 px-8 md:px-14 bg-white text-slate-900 rounded-2xl md:rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-primary hover:text-white transition-all hover:-translate-y-2 active:scale-95 flex items-center gap-4 italic group/btn">
            Generate Report
            <TrendingUp size={20} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>

  );
}

function LuxuryStatCard({ title, value, icon, trend, isAlert, color }: any) {
  const colorMap: any = {
    slate: "bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-900/5",
    primary: "bg-white text-primary border-primary/5 shadow-xl shadow-primary/5",
    indigo: "bg-white text-indigo-600 border-indigo-100 shadow-xl shadow-indigo-600/5",
    rose: "bg-rose-50 text-rose-600 border-rose-100 shadow-xl shadow-rose-600/10"
  };

  const iconBgMap: any = {
    slate: "bg-slate-900 text-white shadow-xl shadow-slate-900/20",
    primary: "bg-primary text-white shadow-xl shadow-primary/20",
    indigo: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20",
    rose: "bg-white text-rose-600 shadow-sm"
  };

  return (
    <div className={cn(
      "p-10 rounded-[3rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl group cursor-default relative overflow-hidden",
      colorMap[color],
      isAlert && value > 0 && "ring-4 ring-rose-500/10"
    )}>
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform", iconBgMap[color])}>
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className={cn(
                "text-[10px] font-black px-3 py-1 rounded-full italic tracking-widest",
                color === 'rose' ? "bg-white text-rose-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {trend}
            </span>
          </div>
        )}
      </div>
      <div className="relative z-10">
        <h4 className="text-4xl font-black tracking-tighter italic tabular-nums">{value?.toLocaleString() ?? 0}</h4>
        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-2 flex items-center gap-2 italic">
          <span className="w-4 h-0.5 bg-current opacity-20" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 200 }) : null}
      </div>
    </div>
  );
}
