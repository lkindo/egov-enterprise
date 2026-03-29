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
  Clock,
  LayoutDashboard,
  Box,
  Cpu,
  Globe,
  FileText,
  Search,
  Settings,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  SearchCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GaugeChart, RealtimeSparkline, ActivityAreaChart, DistributionPieChart } from '@/app/components/ui/observability-charts';
import { VisualAuditTimeline, AuditLog as UIAuditLog } from '@/app/components/ui/visual-audit-timeline';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InsightBanner } from './components/InsightBanner';
import { useQuery } from '@tanstack/react-query';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';


// Mock data removed in favor of live query

const MOCK_METRICS = {
  cpu: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 10 + Math.random() * 20 })),
  memory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 40 + Math.random() * 10 })),
};

const MOCK_ACTIVITY_DATA = [
  { name: 'Mon', value: 420 },
  { name: 'Tue', value: 580 },
  { name: 'Wed', value: 390 },
  { name: 'Thu', value: 720 },
  { name: 'Fri', value: 850 },
  { name: 'Sat', value: 460 },
  { name: 'Sun', value: 310 },
];

const MOCK_DISTRIBUTION_DATA = [
  { name: 'General Users', value: 65 },
  { name: 'System Admins', value: 12 },
  { name: 'Security Officers', value: 8 },
  { name: 'External Partners', value: 15 },
];

export default function AdminDashboardPage() {
  const { data: auditData } = useQuery({
    queryKey: ['admin-dashboard-recent-audits'],
    queryFn: () => auditAdminService.getAuditLogs({ page: 0, size: 5 }),
    refetchInterval: 60000,
    retry: 1,
    retryDelay: 5000,
  });

  // Intelligence Data Fetching
  const { data: usersData } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: () => userAdminService.getUserList({ page번호: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const { data: authorsData } = useQuery({
    queryKey: ['admin-dashboard-authors'],
    queryFn: () => authorAdminService.getAuthorList({ page번호: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const recentLogs: UIAuditLog[] = (auditData?.list || []).map(log => ({
    id: log.histId,
    action: log.histCn.includes('생성') || log.histCn.includes('등록') ? 'CREATE' : 
            log.histCn.includes('삭제') ? 'DELETE' : 
            log.histCn.includes('복원') ? 'RESTORE' : 'UPDATE',
    entityName: log.histCn,
    performedBy: log.frstRegisterId,
    timestamp: log.frstRegisterPnttm,
    ipAddress: log.sysNm || 'Unknown Subsystem',
    severity: log.histCn.includes('오류') || log.histCn.includes('실패') || log.histCn.includes('삭제') ? 'high' : 
              log.histCn.includes('보안') || log.histCn.includes('권한') ? 'medium' : 'low'
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0 pb-20 animate-in fade-in duration-700">
      <HubHeader 
        title="Admin" 
        highlight="Intelligence Center" 
        subtitle="시스템 전반의 오퍼레이션 상태, 지능형 데이터 분석 및 보안 거버넌스 통합 관제 대시보드" 
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-4 p-2 items-center">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 italic font-black text-[9px] uppercase tracking-widest shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System_Node: Healthy
             </div>
             <Button size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group">
                <Sparkles size={20} className="text-primary group-hover:rotate-12 transition-transform" />
                SYNCC_COORDINATOR
             </Button>
          </div>
        }
      />

      <InsightBanner />

      {/* Modern Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <DashboardStatCard 
          title="Identity Registry" 
          value={usersData?.totalRecordCount?.toLocaleString() || "IDLE"} 
          icon={<Users className="w-5 h-5" />} 
          trend="+PROBING" 
          color="blue" 
          link="/admin/user/manage"
          description="사용자 및 조직 통합 매트릭스"
        />
        <DashboardStatCard 
          title="Security Governance" 
          value={`${authorsData?.totalRecordCount || 0} ROLES`} 
          icon={<ShieldCheck className="w-5 h-5" />} 
          trend="STABLE" 
          color="emerald" 
          link="/admin/security/authority"
          description="RBAC 기반 접근 정책 거버넌스"
        />
        <DashboardStatCard 
          title="System Topology" 
          value="OPERATIONAL" 
          icon={<Box className="w-5 h-5" />} 
          trend="HEALTHY" 
          color="amber" 
          link="/admin/system/programs"
          description="모듈 및 리소스 오케스트레이션"
        />
        <DashboardStatCard 
          title="Audit Streams" 
          value={auditData?.totalRecordCount || "LIVE"} 
          icon={<Activity className="w-5 h-5" />} 
          trend="REALTIME" 
          color="rose" 
          link="/admin/system/audit"
          description="실시간 보안 감사 스트림 분석"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Intelligence */}
        <div className="lg:col-span-2 p-8 rounded-[3rem] bg-card border border-border shadow-sm flex flex-col gap-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <TrendingUp size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-foreground tracking-tight underline decoration-indigo-500/20 decoration-4 underline-offset-4">Activity Intelligence</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-widest mt-1">시스템 트래픽 및 도메인 활동 분석</p>
                 </div>
              </div>
           </div>
           <ActivityAreaChart data={MOCK_ACTIVITY_DATA} title="최근 7일간 시스템 접속 프로필" color="#6366F1" />
        </div>

        {/* User Distribution */}
        <div className="p-8 rounded-[3rem] bg-card border border-border shadow-sm flex flex-col gap-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Users size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-foreground tracking-tight">Identity Cluster</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-widest mt-1">사용자 권한 그룹 분포</p>
                 </div>
              </div>
           </div>
           <div className="flex-1 min-h-[300px]">
              <DistributionPieChart data={MOCK_DISTRIBUTION_DATA} title="RBAC 수용량 분석" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Health Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 rounded-[3rem] bg-card border border-border shadow-sm overflow-hidden relative group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">컴퓨팅 노드 헬스체크</h3>
                  <p className="text-[10px] font-medium text-muted-foreground mt-0.5">실시간 리소스 소비 모니터링</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">평균 부하</p>
                  <p className="text-lg font-bold tabular-nums">18.4%</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <ArrowUpRight size={18} />
                </Button>
              </div>
            </div>
            
            <div className="h-[240px] w-full flex items-end gap-1 px-2">
              <RealtimeSparkline data={MOCK_METRICS.cpu} color="var(--primary)" label="CPU Usage" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Database Status */}
             <div className="p-8 rounded-[3rem] bg-card border border-border shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                      <Database size={18} />
                    </div>
                    <span className="text-sm font-bold text-foreground">데이터 소스</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-3 py-1">HEALTHY</Badge>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-3xl font-black tracking-tighter">2.4 TB</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Storage occupied: 64%</p>
                  </div>
                  <div className="w-20 h-20">
                    <GaugeChart value={64} color="#3B82F6" title="Storage" />
                  </div>
                </div>
             </div>

             {/* Network Latency */}
             <div className="p-8 rounded-[3rem] bg-card border border-border shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                      <Globe size={18} />
                    </div>
                    <span className="text-sm font-bold text-foreground">글로벌 지연시간</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp size={12} />
                    <span className="text-[10px] font-bold uppercase">-4MS OPTIMIZED</span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-3xl font-black tracking-tighter uppercase">12 ms</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Response time (Seoul Hub)</p>
                  </div>
                  <div className="w-24 h-1 font-black bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                </div>
             </div>
          </div>
        </div>

        {/* Audit Timeline Sidebar */}
        <div className="space-y-8">
           <div className="p-8 rounded-[3rem] bg-card border border-border shadow-sm flex flex-col h-full h-[600px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 rounded-xl text-white shadow-xl">
                    <Clock size={18} />
                  </div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Audit History</h3>
                </div>
                <Link href="/admin/system/audit" className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter italic underline-offset-4 decoration-primary/30">Explore All</Link>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <VisualAuditTimeline logs={recentLogs} />
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 group hover:bg-slate-900 group-hover:border-slate-800 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 group-hover:text-white uppercase tracking-tight">Integrity Probe</p>
                    <p className="text-[10px] font-bold text-slate-400">Last check: 2 hours ago</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({ title, value, icon, trend, color, link, description }: any) {
  const colorMap: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <Link href={link}>
      <div className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 shadow-xl hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden active:scale-95 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className={cn("p-3.5 rounded-2xl border-2 transition-transform group-hover:rotate-6 shadow-inner", colorMap[color])}>
            {icon}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{trend}</span>
            <ArrowUpRight size={14} className="text-primary opacity-40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
        
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-300 tracking-[0.4em] uppercase font-mono">{title}</p>
          <h4 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums group-hover:text-primary transition-colors leading-none">{value}</h4>
          <p className="text-[11px] font-black text-slate-400 leading-tight uppercase opacity-60">
            {description}
          </p>
        </div>
        
        {/* Subtle decorative background element */}
        <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] rotate-12 group-hover:rotate-6 transition-transform duration-1000 pointer-events-none scale-150">
          {icon}
        </div>
      </div>
    </Link>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold", className)}>
      {children}
    </span>
  );
}
