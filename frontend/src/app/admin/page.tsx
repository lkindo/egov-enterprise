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
 entityName: 'User Permissions',
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
 entityName: 'Security Policy',
 performedBy: 'System_Auto',
 timestamp: '2026-03-19 13:30:11',
 ipAddress: '127.0.0.1',
 severity: 'low'
 },
 {
 id: 'audit-3',
 action: 'DELETE',
 entityName: 'Legacy API Key',
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
 <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 px-4 md:px-0 pb-20 animate-in fade-in duration-1000">
 <PageHeader
 title="관리 지휘 허브"
 breadcrumbs={[{ label: '관리자' }, { label: '지능형 대시보드' }]}
 actions={
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-800">
 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
 <span className="text-[10px] font-black tracking-tight italic">노드-01 활성</span>
 </div>
 <Button className="h-10 px-6 rounded-xl bg-primary text-white font-black tracking-tight text-[9px] shadow-lg shadow-primary/20">
 글로벌 동기화
 </Button>
 </div>
 }
 />

 {/* Hub Entry Stat Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 <DashboardStatCard 
 title="ID 레지스트리" 
 value="1,284" 
 icon={<Users className="w-6 h-6" />} 
 trend="+12 활성" 
 color="blue" 
 link="/admin/user/manage"
 description="통합 사용자 및 조직 관리"
 />
 <DashboardStatCard 
 title="보안 거버넌스" 
 value="레벨 4" 
 icon={<ShieldCheck className="w-6 h-6" />} 
 trend="보호됨" 
 color="emerald" 
 link="/admin/security/authority"
 description="RBAC 및 고급 권한 허브"
 />
 <DashboardStatCard 
 title="운영 인텔리전스" 
 value="99.9%" 
 icon={<Activity className="w-6 h-6" />} 
 trend="실시간" 
 color="amber" 
 link="/admin/system/monitoring"
 description="로그, 감사 및 관찰 센터"
 />
 <DashboardStatCard 
 title="업무 인텔리전스" 
 value="84 점" 
 icon={<LayoutDashboard className="w-6 h-6" />} 
 trend="+5% 수익률" 
 color="indigo" 
 link="/admin/work-hub"
 description="일정, 작업 및 보고서 허브"
 />
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Real-time Infrastructure Monitoring */}
 <div className="lg:col-span-2 space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="responsive-card p-8 space-y-8 bg-white/40 backdrop-blur-xl border-slate-100 shadow-2xl shadow-slate-100/50">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-black text-slate-400 tracking-[0.3em] flex items-center gap-3 italic">
 <Cpu className="w-4 h-4 text-blue-500" />
 인프라 클러스터
 </h3>
 <Link href="/admin/system/monitoring" className="text-[10px] font-black text-primary hover:underline tracking-tight italic">
 노드 탐색 →
 </Link>
 </div>
 <div className="flex flex-col gap-8">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <p className="text-[10px] font-black text-slate-400 tracking-tight opacity-60">프로세서 부하</p>
 <span className="text-[10px] font-black text-blue-600 italic">24% 평균</span>
 </div>
 <RealtimeSparkline data={MOCK_METRICS.cpu} label="CPU" color="#3B82F6" />
 </div>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <p className="text-[10px] font-black text-slate-400 tracking-tight opacity-60">메모리 할당</p>
 <span className="text-[10px] font-black text-emerald-600 italic">4.2 GB 사용 중</span>
 </div>
 <RealtimeSparkline data={MOCK_METRICS.memory} label="MEM" color="#10B981" />
 </div>
 </div>
 </div>

 <div className="responsive-card p-8 flex flex-col items-center justify-center bg-slate-50/50 border-slate-100 shadow-2xl">
 <div className="relative w-full aspect-square flex items-center justify-center">
 <GaugeChart 
 value={72} 
 title="DB 상태" 
 color="#F59E0B" 
 className="border-none shadow-none p-0 scale-125"
 />
 <div className="absolute inset-x-0 bottom-4 text-center">
 <p className="text-[10px] font-black text-amber-600 tracking-tight">최적화됨</p>
 </div>
 </div>
 <div className="mt-4 text-center space-y-1">
 <p className="text-base font-black text-slate-900 tracking-tighter italic ">데이터베이스 인텔리전스</p>
 <p className="text-[9px] font-bold text-slate-400 tracking-tight leading-none">Latency: 12ms | Queries: 2.1k/s</p>
 </div>
 </div>
 </div>

 {/* Audit Timeline */}
 <div className="bg-white rounded-[3.5rem] p-4 shadow-2xl shadow-slate-200 border border-slate-50 ring-1 ring-slate-100/50">
 <VisualAuditTimeline logs={MOCK_AUDIT_LOGS} title="거버넌스 감사 추적" />
 </div>
 </div>

 {/* Sidebar Insights */}
 <div className="space-y-8">
 <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
 <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl opacity-50 transition-opacity group-hover:opacity-100" />
 <div className="relative z-10 space-y-8">
 <div className="flex items-center gap-3">
 <Server className="w-5 h-5 text-primary" />
 <span className="text-[10px] font-black text-white/40 tracking-[0.5em] italic">클러스터 프로필</span>
 </div>
 <h3 className="text-3xl font-black tracking-tighter italic leading-tight">
 Prod Alpha <br /> 
 <span className="text-primary italic opacity-80 underline underline-offset-8 decoration-2 decoration-primary/30">Lkind-Core-7</span>
 </h3>
 <div className="space-y-4 pt-10">
 <InsightLine label="글로벌 노드" value="Seoul (AP-NE-2)" />
 <InsightLine label="스케일링 그룹" value="활성 (12 인스턴스)" />
 <InsightLine label="프로토콜" value="HTTP/3 (QUIC)" />
 </div>
 <div className="pt-6">
 <Button className="w-full h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[11px] font-black tracking-[0.4em] transition-all italic">
 노드 설정
 </Button>
 </div>
 </div>
 </div>

 <div className="responsive-card p-10 space-y-8 border-slate-100 shadow-xl relative overflow-hidden">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
 <AlertCircle className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <h3 className="text-sm font-black text-slate-900 tracking-[0.2em] italic leading-none">유지보수</h3>
 <p className="text-[9px] font-bold text-slate-400 mt-1">상태: 대기 중</p>
 </div>
 </div>
 <div className="p-6 rounded-2xl bg-amber-50/50 border-2 border-dashed border-amber-200 space-y-4">
 <p className="text-sm font-black text-amber-900 tracking-tighter leading-tight italic">v5.2 코어로의 클라우드 인프라 마이그레이션</p>
 <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 italic">
 <Clock className="w-4 h-4" />
 MARCH 20, 23:00 (UTC+9)
 </div>
 </div>
 <Button variant="ghost" className="w-full text-[10px] font-black tracking-tight text-slate-400 italic">
 작업 연기
 </Button>
 </div>

 <div className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-900/20 flex flex-col items-center text-center space-y-6">
 <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/5">
 <Globe size={32} />
 </div>
 <div className="space-y-2">
 <h4 className="text-lg font-black tracking-tight italic leading-tight">협업 연결</h4>
 <p className="text-[10px] font-bold text-white/50 leading-relaxed italic">기업 동기화를 위한 통합 메시징 및 연락처 저장소.</p>
 </div>
 <Link href="/admin/collaboration/mail-history" className="w-full">
 <Button className="w-full h-14 bg-white text-indigo-600 hover:bg-white/90 rounded-2xl text-[10px] font-black tracking-tight">
 협업 허브 입장
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}

function InsightLine({ label, value }: { label: string, value: string }) {
 return (
 <div className="flex items-center justify-between py-2 border-b border-white/5">
 <span className="text-[10px] font-bold text-white/30 tracking-tight">{label}</span>
 <span className="text-[11px] font-black italic">{value}</span>
 </div>
 );
}

function DashboardStatCard({ title, value, icon, trend, color, link, description }: any) {
 const colorVariants: any = {
 blue: "text-blue-500 bg-blue-500/10",
 emerald: "text-emerald-500 bg-emerald-500/10",
 amber: "text-amber-500 bg-amber-500/10",
 indigo: "text-indigo-500 bg-indigo-500/10",
 };

 return (
 <Link 
 href={link}
 className="responsive-card p-8 hover:border-primary/50 transition-all hover:-translate-y-2 group bg-white border-slate-100 shadow-xl shadow-slate-100/50"
 >
 <div className="flex flex-col gap-6">
 <div className="flex items-center justify-between">
 <div className={cn("p-4 rounded-2xl shadow-inner", colorVariants[color])}>
 {icon}
 </div>
 <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full tracking-tight italic">
 <TrendingUp className="w-3 h-3" />
 {trend}
 </div>
 </div>
 <div className="space-y-2">
 <h4 className="text-4xl font-black tracking-tighter text-slate-900 tabular-nums italic ">{value}</h4>
 <div className="space-y-1">
 <p className="text-[11px] font-black text-slate-900 tracking-tight flex items-center justify-between group-hover:text-primary transition-colors">
 {title}
 <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0" />
 </p>
 <p className="text-[9px] font-bold text-slate-400 tracking-tight leading-none">{description}</p>
 </div>
 </div>
 </div>
 </Link>
 );
}
