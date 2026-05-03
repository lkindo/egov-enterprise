'use client';

import React from 'react';
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
  Cpu,
  FileText,
  Settings,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Box,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const GaugeChart = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.GaugeChart), { ssr: false });
const RealtimeSparkline = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.RealtimeSparkline), { ssr: false });
const ActivityAreaChart = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.ActivityAreaChart), { ssr: false });
const DistributionPieChart = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.DistributionPieChart), { ssr: false });
import { VisualAuditTimeline, AuditLog as UIAuditLog } from '@/app/components/ui/visual-audit-timeline';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InsightBanner } from './components/InsightBanner';
import { useQuery } from '@tanstack/react-query';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MOCK_METRICS = {
  cpu: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 10 + (Math.sin(i) + 1) * 10 })),
  memory: Array.from({ length: 20 }, (_, i) => ({ time: i, value: 40 + (Math.cos(i) + 1) * 5 })),
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

  const { data: usersData } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: () => userAdminService.getUserList({ pageNo: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const { data: authorsData } = useQuery({
    queryKey: ['admin-dashboard-authors'],
    queryFn: () => authorAdminService.getAuthorList({ pageIndex: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const recentLogs: UIAuditLog[] = React.useMemo(() => {
    try {
      const list = Array.isArray(auditData?.list) ? auditData.list : [];
      const results: UIAuditLog[] = [];
      for (let i = 0; i < Math.min(list.length, 5); i++) {
          const log = list[i] as any;
          if (!log) continue;
          
          const histCn = String(log.histCn || log.methodNm || 'System Activity');
          const safeContent = histCn.toLowerCase();
          
          results.push({
              id: String(log.histId || log.requstId || `log-${i}`),
              action: (safeContent.includes('생성') || safeContent.includes('등록') || safeContent.includes('create')) ? 'CREATE' :
                      (safeContent.includes('삭제') || safeContent.includes('delete')) ? 'DELETE' :
                      (safeContent.includes('복원') || safeContent.includes('restore')) ? 'RESTORE' : 'UPDATE',
              entityName: histCn,
              performedBy: String(log.frstRegisterId || log.rqesterId || 'System'),
              timestamp: String(log.frstRegisterPnttm || log.occrrncDe || new Date().toISOString()),
              ipAddress: String(log.sysNm || log.rqesterIp || 'Unknown'),
              severity: (safeContent.includes('오류') || safeContent.includes('실패') || safeContent.includes('삭제') || safeContent.includes('error')) ? 'high' :
                        (safeContent.includes('보안') || safeContent.includes('권한') || safeContent.includes('security')) ? 'medium' : ('low' as 'low')
          });
      }
      return results;
    } catch (e) {
      console.warn('Dashboard mapping suppressed:', e);
      return [];
    }
  }, [auditData]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0 pb-20 animate-in fade-in duration-700">
      <HubHeader
        title="Admin"
        highlight="Intelligence Center"
        subtitle="시스템 전반의 오퍼레이션 상태, 지능형 데이터 분석 및 보안 거버넌스 통합 관제 패널"
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-950 rounded-xl border border-emerald-200 italic font-black text-[9px] tracking-widest shadow-sm cursor-default"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              시스템 상태: 정상
            </motion.div>
            <Button 
              size="lg" 
              onClick={() => toast.success("시스템 동기화가 성공적으로 시작되었습니다.", {
                description: "백그라운드에서 지능형 엔진이 최적화를 진행 중입니다."
              })}
              className="h-14 px-10 rounded-xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group relative overflow-hidden active:scale-95"
            >
              <motion.div
                className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity"
                initial={false}
              />
              <Sparkles size={20} className="text-primary group-hover:rotate-12 transition-transform" />
              동기화 조정
            </Button>
          </div>
        }
      />

      <InsightBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <DashboardStatCard
          title="ID 레지스트리"
          value={usersData?.total?.toLocaleString() || "IDLE"}
          icon={<Users className="w-5 h-5" />}
          trend="+12 활성"
          color="blue"
          link="/admin/user/manage"
          description="통합 사용자 및 조직 관리"
        />
        <DashboardStatCard
          title="보안 거버넌스"
          value={`${authorsData?.total || 0} ROLES`}
          icon={<ShieldCheck className="w-5 h-5" />}
          trend="보호됨"
          color="emerald"
          link="/admin/security/authority"
          description="RBAC 및 고급 권한 허브"
        />
        <DashboardStatCard
          title="운영 인텔리전스"
          value="OPERATIONAL"
          icon={<Box className="w-5 h-5" />}
          trend="HEALTHY"
          color="amber"
          link="/admin/system/programs"
          description="모듈 및 리소스 오케스트레이션"
        />
        <DashboardStatCard
          title="업무 인텔리전스"
          value={auditData?.total || "LIVE"}
          icon={<Activity className="w-5 h-5" />}
          trend="REALTIME"
          color="rose"
          link="/admin/system/audit"
          description="실시간 보안 감사 히스토리 분석"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight underline decoration-indigo-500/20 decoration-4 underline-offset-4">Activity Intelligence</h2>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">시스템 트래픽 및 유저 활동 분석</p>
              </div>
            </div>
          </div>
          <ActivityAreaChart data={MOCK_ACTIVITY_DATA} title="최근 7일간 시스템 접속 프로필" color="#6366F1" />
        </div>

        <div className="p-8 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Identity Cluster</h2>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">사용자 권한 그룹 분포</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <DistributionPieChart data={MOCK_DISTRIBUTION_DATA} title="RBAC 수용량 분석" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 rounded-xl bg-card border border-border shadow-sm overflow-hidden relative group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Cpu size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">컴퓨팅 노드 헬스체크</h2>
                  <p className="text-[10px] font-medium text-slate-700 mt-0.5">실시간 리소스 소비 모니터링</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">평균 부하</p>
                  <p className="text-lg font-bold tabular-nums">18.4%</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="시스템 노드 상세 보기">
                  <ArrowUpRight size={18} />
                </Button>
              </div>
            </div>

            <div className="h-[240px] w-full flex items-end gap-1 px-2">
              <RealtimeSparkline data={MOCK_METRICS.cpu} color="var(--primary)" label="CPU Usage" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                    <Database size={18} />
                  </div>
                  <span className="text-sm font-bold text-foreground">데이터베이스</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black px-3 py-1">HEALTHY</Badge>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-3xl font-black tracking-tighter">2.4 TB</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Storage occupied: 64%</p>
                </div>
                <div className="w-20 h-20">
                  <GaugeChart value={64} color="#3B82F6" title="거버넌스 감사 추적" />
                </div>
              </div>
            </div>

            <div className="p-8 rounded-xl bg-card border border-border shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                    <Globe size={18} />
                  </div>
                  <span className="text-sm font-bold text-foreground">글로벌 지연시간</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-800">
                  <TrendingUp size={12} />
                  <span className="text-[10px] font-black uppercase">-4MS OPTIMIZED</span>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-3xl font-black tracking-tighter uppercase">12 ms</p>
                  <p className="text-[10px] font-black text-slate-600 uppercase">Response time (Seoul Hub)</p>
                </div>
                <div className="w-24 h-1 font-black bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-8 rounded-xl bg-card border border-border shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl text-white shadow-xl">
                  <Clock size={18} />
                </div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Audit History</h2>
              </div>
              <Link href="/admin/system/audit" className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter italic underline-offset-4 decoration-primary/30">Explore All</Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <VisualAuditTimeline logs={recentLogs} />
            </div>

            <div className="mt-8 pt-8 border-t border-border/50">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 group hover:bg-slate-900 group-hover:border-slate-800 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 group-hover:text-white uppercase tracking-tight">Integrity Probe</p>
                  <p className="text-[10px] font-bold text-slate-600">Last check: 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="p-8 rounded-xl bg-indigo-900 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Zap size={120} />
           </div>
            <h3 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-80 mb-4">Strategic Bulletin</h3>
            <p className="text-2xl font-black tracking-tighter mb-6 italic">Global Strategy Notice</p>
           <p className="text-xs font-medium text-indigo-200 leading-relaxed uppercase">
             시스템 전반의 글로벌 보안 전략 및 정책 업데이트가 완료되었습니다. <br />
             데이터 오케스트레이션 엔진의 최적화 상태를 확인하세요.
           </p>
        </div>
        <div className="p-8 rounded-xl bg-slate-900 text-white shadow-2xl relative overflow-hidden group border-l-4 border-primary">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
              <Cpu size={120} />
           </div>
            <h3 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-80 mb-4">Resource Allocation</h3>
            <p className="text-2xl font-black tracking-tighter mb-6 italic">Resource Provisioning</p>
            <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase">
              컴퓨팅 노드 및 스토리지 리소스의 동적 프로비저닝이 진행 중입니다. <br />
              현재 시스템 부하 분산을 위한 지능형 샤딩 작업이 수행되고 있습니다.
            </p>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={link}>
          <motion.div 
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-8 h-full rounded-xl bg-white border-2 border-slate-50 shadow-xl hover:border-primary/30 transition-colors cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("p-3.5 rounded-xl border-2 transition-transform group-hover:rotate-6 shadow-inner", colorMap[color])}>
                {icon}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{trend}</span>
                <ArrowUpRight size={14} className="text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-700 tracking-[0.4em] uppercase font-mono flex items-center gap-2">
                {title}
                <span className="e2e-label">
                  {title === 'ID 레지스트리' ? 'IDENTITY_RESOURCES' : 
                   title === '보안 거버넌스' ? 'CLUSTER_POLICY' : 
                   title === '운영 인텔리전스' ? 'OPERATIONAL_INTELLIGENCE' : 
                   title === '업무 인텔리전스' ? 'BUSINESS_INTELLIGENCE' : ''}
                </span>
              </p>
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums group-hover:text-primary transition-colors leading-none">{value}</h3>
              <p className="text-[11px] font-bold text-slate-700 leading-tight uppercase">
                {description}
              </p>
            </div>

            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.05] rotate-12 group-hover:rotate-6 transition-transform duration-1000 pointer-events-none scale-150">
              {icon}
            </div>
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {title} 상세 페이지로 이동
      </TooltipContent>
    </Tooltip>
  );
}
