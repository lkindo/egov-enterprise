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
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
              action: (safeContent.includes('?앹꽦') || safeContent.includes('?깅줉') || safeContent.includes('create')) ? 'CREATE' :
                      (safeContent.includes('??젣') || safeContent.includes('delete')) ? 'DELETE' :
                      (safeContent.includes('蹂듭썝') || safeContent.includes('restore')) ? 'RESTORE' : 'UPDATE',
              entityName: histCn,
              performedBy: String(log.frstRegisterId || log.rqesterId || 'System'),
              timestamp: String(log.frstRegisterPnttm || log.occrrncDe || new Date().toISOString()),
              ipAddress: String(log.sysNm || log.rqesterIp || 'Unknown'),
              severity: (safeContent.includes('?ㅻ쪟') || safeContent.includes('?ㅽ뙣') || safeContent.includes('??젣') || safeContent.includes('error')) ? 'high' :
                        (safeContent.includes('蹂댁븞') || safeContent.includes('沅뚰븳') || safeContent.includes('security')) ? 'medium' : ('low' as 'low')
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
        subtitle="?쒖뒪???꾨컲???ㅽ띁?덉씠???곹깭, 吏?ν삎 ?곗씠??遺꾩꽍 諛?蹂댁븞 嫄곕쾭?뚯뒪 ?듯빀 愿???⑤꼸"
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-950 rounded-[0.1rem] border border-emerald-200 italic font-black text-[9px] tracking-widest shadow-sm cursor-default"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ?쒖뒪???곹깭: ?뺤긽
            </motion.div>
            <Button 
              size="lg" 
              onClick={() => toast.success("?쒖뒪???숆린?붽? ?깃났?곸쑝濡??쒖옉?섏뿀?듬땲??", {
                description: "諛깃렇?쇱슫?쒖뿉??吏?ν삎 ?붿쭊??理쒖쟻?붾? 吏꾪뻾 以묒엯?덈떎."
              })}
              className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3 group relative overflow-hidden active:scale-95"
            >
              <motion.div
                className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity"
                initial={false}
              />
              <Sparkles size={20} className="text-primary group-hover:rotate-12 transition-transform" />
              ?숆린??議곗젙
            </Button>
          </div>
        }
      />

      <InsightBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <DashboardStatCard
          title="ID ?덉??ㅽ듃由?
          value={usersData?.total?.toLocaleString() || "IDLE"}
          icon={<Users className="w-5 h-5" />}
          trend="+12 ?쒖꽦"
          color="blue"
          link="/admin/user/manage"
          description="?듯빀 ?ъ슜??諛?議곗쭅 愿由?
        />
        <DashboardStatCard
          title="蹂댁븞 嫄곕쾭?뚯뒪"
          value={`${authorsData?.total || 0} ROLES`}
          icon={<ShieldCheck className="w-5 h-5" />}
          trend="蹂댄샇??
          color="emerald"
          link="/admin/security/authority"
          description="RBAC 諛?怨좉툒 沅뚰븳 ?덈툕"
        />
        <DashboardStatCard
          title="?댁쁺 ?명뀛由ъ쟾??
          value="OPERATIONAL"
          icon={<Box className="w-5 h-5" />}
          trend="HEALTHY"
          color="amber"
          link="/admin/system/programs"
          description="紐⑤뱢 諛?由ъ냼???ㅼ??ㅽ듃?덉씠??
        />
        <DashboardStatCard
          title="?낅Т ?명뀛由ъ쟾??
          value={auditData?.total || "LIVE"}
          icon={<Activity className="w-5 h-5" />}
          trend="REALTIME"
          color="rose"
          link="/admin/system/audit"
          description="?ㅼ떆媛?蹂댁븞 媛먯궗 ?덉뒪?좊━ 遺꾩꽍"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-[0.1rem] bg-card border border-border shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[0.1rem] bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight underline decoration-indigo-500/20 decoration-4 underline-offset-4">Activity Intelligence</h2>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">?쒖뒪???몃옒??諛??좎? ?쒕룞 遺꾩꽍</p>
              </div>
            </div>
          </div>
          <ActivityAreaChart data={MOCK_ACTIVITY_DATA} title="理쒓렐 7?쇨컙 ?쒖뒪???묒냽 ?꾨줈?? color="#6366F1" />
        </div>

        <div className="p-8 rounded-[0.1rem] bg-card border border-border shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[0.1rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Identity Cluster</h2>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">?ъ슜??沅뚰븳 洹몃９ 遺꾪룷</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <DistributionPieChart data={MOCK_DISTRIBUTION_DATA} title="RBAC ?섏슜??遺꾩꽍" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 rounded-[0.1rem] bg-card border border-border shadow-sm overflow-hidden relative group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-[0.1rem] text-primary">
                  <Cpu size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">而댄벂???몃뱶 ?ъ뒪泥댄겕</h2>
                  <p className="text-[10px] font-medium text-slate-700 mt-0.5">?ㅼ떆媛?由ъ냼???뚮퉬 紐⑤땲?곕쭅</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">?됯퇏 遺??/p>
                  <p className="text-lg font-bold tabular-nums">18.4%</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="?쒖뒪???몃뱶 ?곸꽭 蹂닿린">
                  <ArrowUpRight size={18} />
                </Button>
              </div>
            </div>

            <div className="h-[240px] w-full flex items-end gap-1 px-2">
              <RealtimeSparkline data={MOCK_METRICS.cpu} color="var(--primary)" label="CPU Usage" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[0.1rem] bg-card border border-border shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-[0.1rem] text-muted-foreground">
                    <Database size={18} />
                  </div>
                  <span className="text-sm font-bold text-foreground">?곗씠?곕쿋?댁뒪</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black px-3 py-1">HEALTHY</Badge>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-3xl font-black tracking-tighter">2.4 TB</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Storage occupied: 64%</p>
                </div>
                <div className="w-20 h-20">
                  <GaugeChart value={64} color="#3B82F6" title="嫄곕쾭?뚯뒪 媛먯궗 異붿쟻" />
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[0.1rem] bg-card border border-border shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-[0.1rem] text-muted-foreground">
                    <Globe size={18} />
                  </div>
                  <span className="text-sm font-bold text-foreground">湲濡쒕쾶 吏?곗떆媛?/span>
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
          <div className="p-8 rounded-[0.1rem] bg-card border border-border shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-[0.1rem] text-white shadow-xl">
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
              <div className="flex items-center gap-4 p-5 rounded-[0.1rem] bg-slate-50 border border-dashed border-slate-200 group hover:bg-slate-900 group-hover:border-slate-800 transition cursor-pointer">
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
        <div className="p-8 rounded-[0.1rem] bg-indigo-900 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Zap size={120} />
           </div>
           <h4 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60 mb-4">Strategic Bulletin</h4>
           <h2 className="text-2xl font-black tracking-tighter mb-6 italic">Global Strategy Notice</h2>
           <p className="text-xs font-medium text-indigo-200 leading-relaxed uppercase">
             ?쒖뒪???꾨컲??湲濡쒕쾶 蹂댁븞 ?꾨왂 諛??뺤콉 ?낅뜲?댄듃媛 ?꾨즺?섏뿀?듬땲?? <br />
             ?곗씠???ㅼ??ㅽ듃?덉씠???붿쭊??理쒖쟻???곹깭瑜??뺤씤?섏꽭??
           </p>
        </div>
        <div className="p-8 rounded-[0.1rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group border-l-4 border-primary">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
              <Cpu size={120} />
           </div>
           <h4 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60 mb-4">Resource Allocation</h4>
           <h2 className="text-2xl font-black tracking-tighter mb-6 italic">Resource Provisioning</h2>
           <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase">
             而댄벂???몃뱶 諛??ㅽ넗由ъ? 由ъ냼?ㅼ쓽 ?숈쟻 ?꾨줈鍮꾩??앹씠 吏꾪뻾 以묒엯?덈떎. <br />
             ?꾩옱 ?쒖뒪??遺??遺꾩궛???꾪븳 吏?ν삎 ?ㅻ뵫 ?묒뾽???섑뻾?섍퀬 ?덉뒿?덈떎.
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
            className="p-8 h-full rounded-[0.1rem] bg-white border-2 border-slate-50 shadow-xl hover:border-primary/30 transition-colors cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("p-3.5 rounded-[0.1rem] border-2 transition-transform group-hover:rotate-6 shadow-inner", colorMap[color])}>
                {icon}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-[0.1rem] border border-slate-100">
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{trend}</span>
                <ArrowUpRight size={14} className="text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-700 tracking-[0.4em] uppercase font-mono flex items-center gap-2">
                {title}
                <span className="e2e-label">
                  {title === 'ID ?덉??ㅽ듃由? ? 'IDENTITY_RESOURCES' : 
                   title === '蹂댁븞 嫄곕쾭?뚯뒪' ? 'CLUSTER_POLICY' : 
                   title === '?댁쁺 ?명뀛由ъ쟾?? ? 'OPERATIONAL_INTELLIGENCE' : 
                   title === '?낅Т ?명뀛由ъ쟾?? ? 'BUSINESS_INTELLIGENCE' : ''}
                </span>
              </p>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums group-hover:text-primary transition-colors leading-none">{value}</h2>
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
      <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {title} ?곸꽭 ?섏씠吏濡??대룞
      </TooltipContent>
    </Tooltip>
  );
}
