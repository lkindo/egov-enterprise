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
    <div className="w-full h-[480px] flex flex-col items-center justify-center bg-white rounded-[0.1rem] space-y-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black tracking-[0.4em] text-slate-300 uppercase animate-pulse">Mapping Regional Traffic Intelligence...</p>
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
      header: '?명뀛由ъ쟾???몃뱶',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
            <Layout size={18} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-lg uppercase leading-none">{item.menuNm}</span>
            <span className="text-[9px] font-black text-slate-600 tracking-[0.3em] mt-2 uppercase">NODE_TYPE: CORE_MODULE</span>
          </div>
        </div>
      )
    },
    {
      header: '?곹샇?묒슜 ?잛닔',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary opacity-40 italic" />
          <span className="font-mono font-black text-primary text-lg tracking-tighter tabular-nums underline decoration-primary/20 decoration-4 underline-offset-4">{item?.statsCo?.toLocaleString() || '0'}</span>
        </div>
      )
    },
    {
      header: '?곹뼢??留ㅽ듃由?뒪',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-6 min-w-[240px]">
          <div className="flex-1 h-3 bg-slate-100 dark:bg-muted/30 rounded-full overflow-hidden shadow-inner border border-border/10">
            <div
              className="h-full bg-gradient-to-r from-primary via-indigo-500 to-violet-500 transition duration-1000 ease-out shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
              style={{ width: `${item?.percentage || 0}%` }}
            />
          </div>
          <span className="text-[12px] font-black text-foreground w-12 text-right tracking-tighter tabular-nums">{item?.percentage || 0}%</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="?명뀛由ъ쟾???쒖뒪???꾪궎?띿쿂 遺꾩꽍"
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '遺꾩꽍 ??쒕낫?? }]}
      />

      <HubHeader
        title="?쒖뒪??遺꾩꽍"
        highlight="留ㅽ듃由?뒪"
        subtitle="?꾩껜 ?쒖뒪?쒖쓽 ?ㅼ떆媛??몃옒??諛?二쇱슂 硫뷀듃由??곹샇?묒슜 ?듦퀎 ?명뀛由ъ쟾??
        icon={BarChart3}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <select 
              className="h-12 px-6 rounded-[0.1rem] border-2 border-border bg-white font-black text-[10px] tracking-widest uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-4 focus:ring-primary/10 transition cursor-pointer shadow-sm"
              aria-label="?듦퀎 議고쉶 湲곌컙 ?좏깮"
            >
              <option>REALTIME_FLOW (14D)</option>
              <option>MONTHLY_BATCH (30D)</option>
              <option>QUARTERLY_ANALYSIS</option>
            </select>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="h-12 w-12 p-0 rounded-[0.1rem] border-2 font-black shadow-sm"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            </Button>
            <div className="hidden sm:block">
              <DataExportExcel
                data={initialMenuData || []}
                headers={[
                  { label: '硫붾돱紐?, key: 'menuNm' },
                  { label: '?ъ슜????, key: 'statsCo' },
                  { label: '鍮꾩쨷(%)', key: 'percentage' }
                ]}
                filename="system_intelligence_stats"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
        <LuxuryStatCard title="?꾩쟻 ?곗씠???몃뱶" value={initialSummary?.totalUsers || 0} icon={<Database size={26} />} trend="+2.5%" color="slate" />
        <LuxuryStatCard title="?쒖꽦 而ㅻ꽖?? value={initialSummary?.todayConnects || 0} icon={<CloudLightning size={26} />} trend="+12%" color="primary" />
        <LuxuryStatCard title="?곗씠???곸냽?? value={initialSummary?.totalPosts || 0} icon={<ShieldCheck size={26} />} trend="+0.8%" color="indigo" />
      </div>

      <div className="grid grid-cols-12 gap-10 px-2 mt-4">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10">
          <HubSectionCard
            title="?ㅽ듃?뚰겕 ?몃옒??吏꾪솕"
            description="?쒖뒪???꾨컲??嫄몄튇 ?곗씠???ㅽ듃由쇱쓽 ?먮쫫 諛?吏꾪솕 ?묒긽??遺꾩꽍?⑸땲??
            icon={Activity}
          >
            <div className="p-4 bg-slate-50/50 rounded-[0.1rem] border border-border/30 overflow-hidden group">
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
            title="?섍꼍 湲곌린 遺꾪룷"
            description="?ъ슜???묒냽 ?섍꼍???꾨줈?뚯씪留?諛?湲곌린蹂??몄뀡 鍮꾩쨷?낅땲??
            icon={Monitor}
          >
            <div className="bg-slate-900 text-white rounded-[0.1rem] p-8 shadow-2xl relative overflow-hidden group min-h-[440px] flex items-center justify-center">
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
            title="理쒕떎 ?곹샇?묒슜 ?쒕퉬??
            description="?ъ슜?먯쓽 ?섎룄媛 媛??諛吏묐맂 ?듭떖 ?곹샇?묒슜 吏??遺꾩꽍?낅땲??
            icon={Target}
          >
            <div className="p-8 bg-slate-50 rounded-[0.1rem] border border-border/30 shadow-inner">
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
            title="吏由ъ쟻 ?몃옒??遺꾪룷"
            description="?듬챸?붾맂 ?곗씠??湲곕컲 ?ㅽ듃?뚰겕 吏由ъ쟻 湲곗썝吏 留ㅽ븨?낅땲??
            icon={Globe}
          >
            <div className="p-4 bg-white rounded-[0.1rem] border-2 border-slate-50 flex items-center justify-center min-h-[480px] shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0)', backgroundSize: '16px 16px' }} />
              <NationalDistributionMap />
            </div>
          </HubSectionCard>
        </div>
      </div>

      <HubSectionCard
        title="?댁쁺 留ㅽ듃由?뒪 蹂닿퀬"
        description="?쒖뒪???꾨컲??嫄몄튇 留덉씠?щ줈 ?곹샇?묒슜 ?몃뱶?ㅼ쓽 ?몃? ?곗씠??蹂닿퀬?쒖엯?덈떎."
        icon={Cpu}
        statusBadges={
          <HubStatusBadge label="怨좊????ㅽ듃由? variant="success" className="bg-emerald-500/10 text-emerald-700 border-none animate-pulse text-[8px] font-black tracking-widest" />
        }
      >
        <div className="px-2 overflow-x-auto">
          <StandardDataTable
            columns={menuColumns}
            data={(initialMenuData || []).slice(0, 10)}
            loading={loading}
            emptyMessage="?쒖뒪???⑦꽩 遺꾩꽍 以?.."
            className="border-none rounded-none bg-transparent min-w-[700px]"
          />
        </div>
      </HubSectionCard>

      <div className="relative group rounded-[0.1rem] overflow-hidden bg-slate-900 shadow-2xl p-24 border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/5 opacity-50" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full group-hover:scale-150 transition-transform duration-[3s]" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="space-y-10 flex-1 text-center lg:text-left">
            <div className="space-y-4">
              <h2 className="text-[11px] font-black tracking-[0.6em] text-white/60 uppercase leading-none">?쒖뒪??臾닿껐???붿빟</h2>
              <h3 className="text-5xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] uppercase tabular-nums">
                Optimized <br />
                <span className="text-primary italic">Intelligence</span> Core
              </h3>
            </div>
            <p className="text-lg lg:text-xl text-white/70 font-bold max-w-3xl leading-relaxed tracking-tight">
              ?쒖뒪???먯썝??99.9%媛 ?⑥쑉?곸쑝濡?愿由щ릺怨??덉뒿?덈떎. ?명뀛由ъ쟾???붿쭊? ?ㅼ떆媛?二쇱슂 ?대깽?몃? 異붿쟻?섏뿬 理쒖쟻???깅뒫 ?꾨줈?뚯씪???숈쟻?쇰줈 ?앹꽦?섍퀬 ?덉뒿?덈떎.
            </p>
          </div>
          <div className="shrink-0">
            <Button className="h-24 px-16 bg-white text-slate-900 rounded-[0.1rem] font-black text-lg tracking-[0.2em] shadow-2xl hover:bg-primary hover:text-white transition hover:-translate-y-2 active:scale-95 flex items-center gap-6 group/btn uppercase border-none">
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
      "hub-table-container p-12 group hover:scale-[1.05] transition relative overflow-hidden bg-white border-border/50",
      isAlert && value > 0 && "ring-4 ring-rose-500/10"
    )}>
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className={cn("w-16 h-16 rounded-[0.1rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-2xl", iconBgMap[color])}>
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase",
              color === 'rose' ? "bg-white text-rose-600 shadow-inner" : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-sm"
            )}>
              {trend}
            </span>
          </div>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-4xl font-black tracking-tighter tabular-nums leading-none text-foreground">{value?.toLocaleString() ?? 0}</h3>
        <p className="text-[10px] font-black text-slate-600 tracking-[0.4em] mt-5 flex items-center gap-3 uppercase leading-none">
          <span className="w-6 h-0.5 bg-current opacity-40" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition duration-1000 grayscale">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 240 }) : null}
      </div>
    </div>
  );
}
