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
  Globe
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { GaugeChart, RealtimeSparkline } from '@/app/components/ui/observability-charts';
import { VisualAuditTimeline, AuditLog } from '@/app/components/ui/visual-audit-timeline';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    action: 'UPDATE',
    entityName: '권한 설정 변경',
    performedBy: 'Admin_Master',
    timestamp: '2026-03-19 14:15:22',
    ipAddress: '192.168.1.102',
    severity: 'medium',
    changes: [
      { field: 'ROLE_ADMIN', before: 'false', after: 'true' }
    ]
  },
  {
    id: 'audit-2',
    action: 'CREATE',
    entityName: '보안 정책 생성',
    performedBy: 'System_Auto',
    timestamp: '2026-03-19 13:30:11',
    ipAddress: '127.0.0.1',
    severity: 'low'
  },
  {
    id: 'audit-3',
    action: 'DELETE',
    entityName: '만료된 API 키',
    performedBy: 'Security_Officer',
    timestamp: '2026-03-19 12:12:45',
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
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0 pb-20 animate-in fade-in duration-700">
      <PageHeader
        title="시스템 대시보드"
        breadcrumbs={[{ label: '관리자' }, { label: '실시간 가시성' }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-foreground tracking-tight">노드-01 활성</span>
            </div>
            <Button size="sm" className="font-bold text-[11px] h-9">
              데이터 동기화
            </Button>
          </div>
        }
      />

      {/* Hub Entry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard 
          title="사용자 레지스트리" 
          value="1,284" 
          icon={<Users className="w-5 h-5" />} 
          trend="+12 신규" 
          color="blue" 
          link="/admin/user/manage"
          description="통합 계정 및 조직 관리"
        />
        <DashboardStatCard 
          title="보안 거버넌스" 
          value="LEVEL 4" 
          icon={<ShieldCheck className="w-5 h-5" />} 
          trend="안정적" 
          color="emerald" 
          link="/admin/security/authority"
          description="접근 제어 및 감사 정책"
        />
        <DashboardStatCard 
          title="시스템 모듈" 
          value="82" 
          icon={<Box className="w-5 h-5" />} 
          trend="정상 가동" 
          color="amber" 
          link="/admin/system/programs"
          description="프로그램 및 리소스 관리"
        />
        <DashboardStatCard 
          title="데이터 처리" 
          value="98.2%" 
          icon={<Activity className="w-5 h-5" />} 
          trend="최적화됨" 
          color="rose" 
          link="/admin/stats"
          description="실시간 트래픽 가시성"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Health Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm overflow-hidden relative group">
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
            
            <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-background/5 to-transparent pointer-events-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Database Status */}
             <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                      <Database size={18} />
                    </div>
                    <span className="text-sm font-bold text-foreground">데이터 소스</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold">안정</Badge>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-3xl font-bold tracking-tight">2.4 TB</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">전체 가용 용량 중 64% 점유</p>
                  </div>
                  <div className="w-16 h-16">
                    <GaugeChart value={64} color="var(--primary)" title="Storage" />
                  </div>
                </div>
             </div>

             {/* Network Latency */}
             <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                      <Globe size={18} />
                    </div>
                    <span className="text-sm font-bold text-foreground">글로벌 지연시간</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp size={12} />
                    <span className="text-[10px] font-bold">-4ms</span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-3xl font-bold tracking-tight">12 ms</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">평균 응답 속도 (아시아/서울)</p>
                  </div>
                  <div className="w-24 h-8 bg-muted/40 rounded-lg animate-pulse" />
                </div>
             </div>
          </div>
        </div>

        {/* Audit Timeline Sidebar */}
        <div className="space-y-8">
           <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                    <Clock size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">보안 감사 추적</h3>
                </div>
                <Link href="/admin/security/authority" className="text-[10px] font-bold text-primary hover:underline">모두 보기</Link>
              </div>

              <div className="flex-1">
                <VisualAuditTimeline logs={MOCK_AUDIT_LOGS} />
              </div>

              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-dashed border-border group hover:bg-muted/40 transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">데이터 무결성 검사</p>
                    <p className="text-[10px] font-medium text-muted-foreground">마지막 검사: 2시간 전</p>
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
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl border transition-transform group-hover:scale-110", colorMap[color])}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            {trend}
            <ArrowUpRight size={12} className="opacity-40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground tracking-tight uppercase">{title}</p>
          <h4 className="text-2xl font-bold text-foreground tracking-tight tabular-nums group-hover:text-primary transition-colors">{value}</h4>
          <p className="text-[10px] font-medium text-muted-foreground/60 leading-tight">
            {description}
          </p>
        </div>
        
        {/* Subtle decorative background element */}
        <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.02] rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
          <LayoutDashboard size={100} />
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
