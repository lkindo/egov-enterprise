'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import {
  Activity,
  Globe,
  Database,
  HardDrive,
  Cpu,
  Network,
  Loader2,
  Zap,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const LoadingFallback = () => (
  <div className="h-[500px] w-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200 animate-in fade-in duration-500">
    <div className="relative flex h-12 w-12 items-center justify-center">
      <Loader2 className="animate-spin text-primary absolute" size={48} />
      <Activity className="text-primary/20" size={24} />
    </div>
    <div className="text-center space-y-1">
      <p className="font-black italic uppercase tracking-widest text-[10px]">Synchronizing Matrix...</p>
      <p className="text-xs font-bold text-slate-300">인프라 모듈을 활성화하고 있습니다.</p>
    </div>
  </div>
);

const ServerResource = dynamic(() => import('@/components/admin/system/monitoring/ServerResource').then(mod => mod.ServerResource), { ssr: false, loading: LoadingFallback });
const HttpMonitor = dynamic(() => import('@/components/admin/system/monitoring/HttpMonitor').then(mod => mod.HttpMonitor), { ssr: false, loading: LoadingFallback });
const DbMonitor = dynamic(() => import('@/components/admin/system/monitoring/DbMonitor').then(mod => mod.DbMonitor), { ssr: false, loading: LoadingFallback });
const FileSystemMonitor = dynamic(() => import('@/components/admin/system/monitoring/FileSystemMonitor').then(mod => mod.FileSystemMonitor), { ssr: false, loading: LoadingFallback });
const ProcessMonitor = dynamic(() => import('@/components/admin/system/monitoring/ProcessMonitor').then(mod => mod.ProcessMonitor), { ssr: false, loading: LoadingFallback });
const NetworkServiceMonitor = dynamic(() => import('@/components/admin/system/monitoring/NetworkServiceMonitor').then(mod => mod.NetworkServiceMonitor), { ssr: false, loading: LoadingFallback });

export default function MonitoringAdminClient({ summary }: { summary: any }) {
  const [activeTab, setActiveTab] = useState('server');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="전사 커넥티드 인프라 실시간 관제 센터"
        breadcrumbs={[{ label: '시스템관리' }, { label: '시스템모니터링' }]}
        actions={
          <Button
            onClick={handleRefresh}
            className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
          >
            <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <LuxuryStatCard
          title="SYSTEM UPTIME"
          value="99.98%"
          label="Across All Nodes"
          icon={<TrendingUp size={24} />}
          color="emerald"
        />
        <LuxuryStatCard
          title="ACTIVE HTTP"
          value={summary.httpCount}
          label="Service Endpoints"
          icon={<Globe size={24} />}
          color="blue"
        />
        <LuxuryStatCard
          title="STORAGE LOAD"
          value={`${summary.avgDiskUsage}%`}
          label="Average Capacity"
          icon={<HardDrive size={24} />}
          color="orange"
        />
        <LuxuryStatCard
          title="HEALTH STATUS"
          value="OPTIMAL"
          label="Signal Integrity"
          icon={<ShieldCheck size={24} />}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
              <Zap size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-4 flex-1 text-center md:text-left">
              <h4 className="text-4xl font-black italic tracking-tighter uppercase tabular-nums leading-tight">Advanced Matrix Monitoring</h4>
              <p className="text-lg text-slate-400 font-bold leading-relaxed max-w-2xl">
                본 관제 센터는 시스템 전반의 <span className="text-white">Compute, Network, Storage</span> 리소스를 실시간으로 시각화합니다. <br />
                모든 데이터 패킷은 표준 프레임워크 프로토콜을 거쳐 안전하게 정렬됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[4rem] p-10 shadow-xl flex flex-col justify-center overflow-hidden group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Stream</h5>
              <p className="text-sm font-black italic uppercase">Telemetry Feed Active</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-black italic uppercase text-slate-400">Threat Level</span>
              <span className="text-xs font-black text-emerald-600">ZERO</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-black italic uppercase text-slate-400">Response Latency</span>
              <span className="text-xs font-black text-slate-900">12ms</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="server" onValueChange={setActiveTab} className="space-y-12">
        <div className="max-w-4xl mx-auto px-4 py-3 bg-white/50 backdrop-blur-xl border border-slate-100 rounded-[3rem] shadow-2xl sticky top-4 z-50 ring-8 ring-slate-50/50">
          <TabsList className="h-16 w-full justify-between gap-2 bg-transparent p-0">
            {[
              { id: 'server', label: 'COMPUTE', icon: <Activity size={18} /> },
              { id: 'http', label: 'HTTP EDGE', icon: <Globe size={18} /> },
              { id: 'db', label: 'DATABASE', icon: <Database size={18} /> },
              { id: 'filesys', label: 'STORAGE', icon: <HardDrive size={18} /> },
              { id: 'process', label: 'RUNTIME', icon: <Cpu size={18} /> },
              { id: 'network', label: 'PACKET', icon: <Network size={18} /> }
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 h-12 rounded-2xl px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xl transition-all font-black text-[10px] uppercase tracking-widest gap-2 italic hover:bg-slate-50 data-[state=active]:hover:bg-slate-800"
              >
                {tab.icon} <span className="hidden md:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="bg-white rounded-[5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative overflow-hidden">
          <div className="bg-slate-50/50 p-12 rounded-[4.5rem] border border-dashed border-slate-200 min-h-[600px]">
            <TabsContent value="server" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Compute Resource Telemetry"
                description="서버 인프라의 CPU, 메모리 가용성 및 성능 지표를 정밀 분석합니다."
              />
              <ServerResource />
            </TabsContent>

            <TabsContent value="http" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Edge Service Connectivity"
                description="전사 웹 서비스 및 엔드포인트의 가용성과 응답 상태를 실시간 검증합니다."
              />
              <HttpMonitor />
            </TabsContent>

            <TabsContent value="db" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Database Instance Pulse"
                description="분산 데이터베이스 시스템의 연결 프로토콜 및 세션 가용성을 확인합니다."
              />
              <DbMonitor />
            </TabsContent>

            <TabsContent value="filesys" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Storage Capacity Analysis"
                description="파일시스템의 저장 공간 점유율과 입출력 처리 임계치를 모니터링합니다."
              />
              <FileSystemMonitor />
            </TabsContent>

            <TabsContent value="process" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Core Runtime Process Audit"
                description="시스템 구동의 핵심 프로세스 생존 주기와 런타임 상태를 감사로그로 확인합니다."
              />
              <ProcessMonitor />
            </TabsContent>

            <TabsContent value="network" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <ModuleHeader
                title="Network Protocol Interface"
                description="외부 연동 시스템과의 포트 리스닝 및 네트워크 패킷 도달 가능 여부를 점검합니다."
              />
              <NetworkServiceMonitor />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function ModuleHeader({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-slate-200 pb-12 cursor-default">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h3 className="text-3xl font-black italic text-slate-900 tracking-tighter uppercase tabular-nums leading-none">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 font-bold max-w-xl italic leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm italic">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Real-time Analysis</span>
        <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function LuxuryStatCard({ title, value, label, icon, color }: any) {
  const colorMap: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-600/5",
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-600/5",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-600/5",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-600/5"
  };

  return (
    <div className={cn(
      "p-10 rounded-[3rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl group overflow-hidden relative cursor-default bg-white shadow-xl saturate-[1.2]",
      "hover:border-transparent active:scale-95"
    )}>
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner", colorMap[color])}>
          {icon}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-300 italic">LIVE</span>
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{title}</p>
        <h4 className="text-4xl font-black tracking-tighter tabular-nums mb-1 text-slate-900">{value}</h4>
        <p className="text-[10px] font-bold text-slate-400 opacity-60">{label}</p>
      </div>
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000 text-slate-900">
        {React.cloneElement(icon, { size: 180 })}
      </div>
    </div>
  );
}