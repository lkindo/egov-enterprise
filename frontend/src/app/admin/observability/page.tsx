'use client';

import React from 'react';
import {
    Activity,
    Cpu,
    Database,
    Server,
    ShieldCheck,
    Zap,
    ArrowUpRight,
    RefreshCcw,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useObservability } from '@/app/hooks/useObservability';
import { GaugeChart, RealtimeSparkline, SystemStatusRadar } from '@/app/components/layout/../ui/observability-charts';

export default function ObservabilityPage() {
    const metrics = useObservability();

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* 1. Header with Pulse */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25" />
                            <div className="w-3 h-3 bg-emerald-500 rounded-full relative z-10" />
                        </div>
                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">System Operational</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">
                        Observability <span className="text-primary italic">Hub</span>
                    </h1>
                    <p className="text-muted-foreground font-bold text-sm max-w-lg">
                        실시간 시스템 리소스 및 가용성 관제 센터입니다. 모든 서비스의 건강 상태와 응답 지표를 3초 주기로 정밀 분석합니다.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card border p-4 rounded-3xl shadow-sm">
                    <div className="flex flex-col items-end px-4">
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Current Server Uptime</span>
                        <span className="text-lg font-black text-foreground tabular-nums">14d 08h 22m</span>
                    </div>
                    <div className="h-10 w-px bg-muted" />
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* 2. Hero Metrics (Top Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="p-8 border rounded-[2.5rem] bg-card shadow-sm space-y-4 group hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <Cpu size={24} />
                        </div>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Average CPU Load</span>
                        <h2 className="text-4xl font-black tracking-tighter text-foreground">{metrics.cpu[metrics.cpu.length - 1]?.value}%</h2>
                    </div>
                    <RealtimeSparkline data={metrics.cpu} label="Realtime Load" color="#3B82F6" />
                </div>

                <div className="p-8 border rounded-[2.5rem] bg-card shadow-sm space-y-4 group hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                            <Zap size={24} />
                        </div>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Memory Allocation</span>
                        <h2 className="text-4xl font-black tracking-tighter text-foreground">{metrics.memory[metrics.memory.length - 1]?.value}%</h2>
                    </div>
                    <RealtimeSparkline data={metrics.memory} label="Heap Usage" color="#10B981" />
                </div>

                <div className="p-8 border rounded-[2.5rem] bg-card shadow-sm space-y-4 group hover:border-amber-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                            <Database size={24} />
                        </div>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">DB Connections</span>
                        <h2 className="text-4xl font-black tracking-tighter text-foreground">{Math.floor(metrics.dbPool)}%</h2>
                    </div>
                    <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl">
                        <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${metrics.dbPool}%` }} />
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase">HikariCP Pool Active: {Math.floor(metrics.dbPool * 0.5)}/50</p>
                    </div>
                </div>

                <div className="p-8 border rounded-[2.5rem] bg-card shadow-sm space-y-4 group hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary font-black text-xl">
                            {metrics.healthScore}
                        </div>
                        <ShieldCheck size={24} className="text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Overall Health</span>
                        <h2 className="text-4xl font-black tracking-tighter text-foreground">Excellent</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-muted rounded-full" />
                    </div>
                </div>
            </div>

            {/* 3. Detailed View (Bottom Grid) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* DB Performance Gauge */}
                <GaugeChart
                    value={Math.floor(metrics.dbPool)}
                    title="Database Saturation"
                    color={metrics.dbPool > 80 ? "#EF4444" : "#F59E0B"}
                    className="xl:col-span-1"
                />

                {/* System Analysis Radar */}
                <SystemStatusRadar
                    data={metrics.radarData}
                    title="Multidimensional Health Score"
                />

                {/* Infrastructure Nodes Table */}
                <div className="p-8 border rounded-[2.5rem] bg-card shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Server size={18} className="text-primary" />
                            Cluster Node Status
                        </h3>
                        <button className="p-2 hover:bg-muted rounded-full transition-colors">
                            <RefreshCcw size={14} className="text-muted-foreground" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        {[
                            { id: 'master-01', status: 'Healthy', load: '12%', role: 'PRIMARY' },
                            { id: 'worker-01', status: 'Healthy', load: '24%', role: 'WORKER' },
                            { id: 'worker-02', status: 'Busy', load: '82%', role: 'WORKER' },
                            { id: 'db-replica-01', status: 'Healthy', load: '05%', role: 'DB-SYNC' },
                        ].map((node) => (
                            <div key={node.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-white/5 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full animate-pulse",
                                        node.status === 'Healthy' ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <div>
                                        <p className="text-xs font-black text-foreground">{node.id}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{node.role}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-foreground tracking-tighter">{node.load}</p>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50">CUR LOAD</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Live Log Feed Banner */}
            <div className="p-10 rounded-[3.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Activity size={18} className="text-primary" />
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Operational Intelligence</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter">시스템 로그 분석 엔진이 실시간 위협을 <br /> 감지하고 보호 중입니다.</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="px-8 py-4 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary/80 transition-all hover:-translate-y-1">
                            보안 리포트 다운로드
                        </button>
                        <button className="px-8 py-4 bg-white/10 text-white rounded-full font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">
                            Full Log Viewer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
