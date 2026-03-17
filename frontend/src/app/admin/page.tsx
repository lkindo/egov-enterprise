'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { 
  Activity, 
  Users, 
  ShieldCheck, 
  Zap, 
  ArrowUpRight, 
  TrendingUp,
  Database,
  Server,
  AlertCircle,
  Clock
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { GaugeChart, RealtimeSparkline } from '@/app/components/ui/observability-charts';
import { VisualAuditTimeline, AuditLog } from '@/app/components/ui/visual-audit-timeline';
import Link from 'next/link';

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    action: 'UPDATE',
    entityName: 'User Permissions',
    performedBy: 'Admin_Master',
    timestamp: '2026-03-17 09:15:22',
    ipAddress: '192.168.1.102',
    severity: 'medium',
    changes: [
      { field: 'ROLE_ADMIN', before: 'false', after: 'true' }
    ]
  },
  {
    id: 'audit-2',
    action: 'CREATE',
    entityName: 'Security Policy',
    performedBy: 'System_Auto',
    timestamp: '2026-03-17 08:30:11',
    ipAddress: '127.0.0.1',
    severity: 'low'
  },
  {
    id: 'audit-3',
    action: 'DELETE',
    entityName: 'Legacy API Key',
    performedBy: 'Security_Officer',
    timestamp: '2026-03-17 07:12:45',
    ipAddress: '203.0.113.45',
    severity: 'high'
  }
];

const MOCK_METRICS = {
  cpu: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 10 + Math.random() * 20 })),
  memory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 40 + Math.random() * 10 })),
};

export default function AdminDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 px-4 md:px-0 pb-20 animate-in fade-in duration-1000">
      <PageHeader
        title="Admin Command Center"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
        actions={
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">System Live</span>
            </div>
          </div>
        }
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <DashboardStatCard 
          title="Total Users" 
          value="1,284" 
          icon={<Users className="w-5 md:w-6 h-5 md:h-6" />} 
          trend="+4.2%" 
          color="blue" 
          link="/admin/user/manage"
        />
        <DashboardStatCard 
          title="Security Alerts" 
          value="02" 
          icon={<ShieldCheck className="w-5 md:w-6 h-5 md:h-6" />} 
          trend="Secured" 
          color="emerald" 
          link="/admin/security/audit"
        />
        <DashboardStatCard 
          title="API Performance" 
          value="98.2%" 
          icon={<Zap className="w-5 md:w-6 h-5 md:h-6" />} 
          trend="Optimal" 
          color="amber" 
          link="/admin/observability"
        />
        <DashboardStatCard 
          title="Storage Usage" 
          value="45.2 GB" 
          icon={<Database className="w-5 md:w-6 h-5 md:h-6" />} 
          trend="Stable" 
          color="slate" 
          link="/admin/system/storage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Real-time Infrastructure Monitoring */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="responsive-card p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Infrastructure Load
                    </h3>
                    <Link href="/admin/observability" className="text-[9px] md:text-[10px] font-black text-primary hover:underline uppercase tracking-widest">
                       Details →
                    </Link>
                  </div>
                  <div className="flex flex-col gap-6">
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase mb-2 opacity-50">CPU Usage</p>
                        <RealtimeSparkline data={MOCK_METRICS.cpu} label="CPU" color="#3B82F6" />
                      </div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase mb-2 opacity-50">Memory Usage</p>
                        <RealtimeSparkline data={MOCK_METRICS.memory} label="MEM" color="#10B981" />
                      </div>
                  </div>
              </div>

              <div className="responsive-card p-6 md:p-8 flex flex-col items-center justify-center">
                  <GaugeChart 
                    value={72} 
                    title="Database Health" 
                    color="#F59E0B" 
                    className="border-none shadow-none p-0"
                  />
                  <div className="mt-4 text-center space-y-1">
                      <p className="text-sm font-black text-foreground">Healthy Performance</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No significant latency detected</p>
                  </div>
              </div>
           </div>

           {/* Audit Timeline */}
           <VisualAuditTimeline logs={MOCK_AUDIT_LOGS} title="Recent Security Intelligence" />
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Server Profile</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter italic">Production Cluster <br /> <span className="text-primary italic">PRD-CORE-02</span></h3>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-xs font-bold text-white/40">Region</span>
                          <span className="text-xs font-black">AP-NORTHEAST-2</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-xs font-bold text-white/40">Active Nodes</span>
                          <span className="text-xs font-black">12 / 12</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <span className="text-xs font-bold text-white/40">Throughput</span>
                          <span className="text-xs font-black">1.2k req/s</span>
                      </div>
                  </div>
                  <button className="w-full py-3 md:py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Cluster Management
                  </button>
              </div>
          </div>

          <div className="responsive-card p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-widest">Upcoming Maintenance</h3>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                  <p className="text-xs font-bold text-amber-700">Database Index Optimization</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-amber-600/60 transition-colors">
                      <Clock className="w-3 h-3" />
                      TODAY 23:00 (KST)
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({ title, value, icon, trend, color, link }: any) {
  const colorVariants: any = {
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    slate: "text-slate-500 bg-slate-500/10",
  };

  return (
    <Link 
      href={link}
      className="responsive-card p-6 md:p-8 hover:border-primary/50 transition-all hover:-translate-y-1 group"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 md:p-3 rounded-2xl", colorVariants[color])}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground tabular-nums">{value}</h4>
          <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50 flex items-center justify-between">
            {title}
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </div>
    </Link>
  );
}

