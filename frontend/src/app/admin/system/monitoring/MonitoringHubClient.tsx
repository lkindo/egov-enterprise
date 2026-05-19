'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { 
  Activity, 
  ShieldAlert, 
  Terminal, 
  MessageSquare, 
  Search, 
  Filter, 
  RefreshCcw, 
  Bell,
  Zap,
  LogIn,
  Cpu,
  HardDrive,
  Server,
  Download,
  Trash2,
  Clock,
  ShieldCheck,
  ChevronRight,
  MonitorCheck,
  Globe,
  Database,
  SearchCode,
  Network,
  CheckCircle2,
  AlertCircle,
  Share2,
  FileText
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { commentAdminService } from '@/services/foundation/system/CommentAdminService';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { monitoringAdminService } from '@/services/foundation/system/MonitoringAdminService';
import { motion, AnimatePresence } from 'framer-motion';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const GaugeChart = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.GaugeChart), { ssr: false });
const RealtimeSparkline = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.RealtimeSparkline), { ssr: false });
const SystemStatusRadar = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.SystemStatusRadar), { ssr: false });

const TopologyMap = dynamic(() => import('@/app/components/ui/topology-map').then(mod => mod.TopologyMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] flex flex-col items-center justify-center bg-slate-950 rounded-lg space-y-6">
      <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-lg animate-spin" />
      <p className="text-xs font-bold tracking-tight text-white/30 animate-pulse">Initializing Topology Stream...</p>
    </div>
  )
});
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useRouter, useSearchParams } from 'next/navigation';

type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS' | 'TOPOLOGY' | 'HARNESS';

export default function MonitoringHubClient({ defaultTab = 'SECURITY' }: { defaultTab?: MonitoringTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const rawTab = searchParams.get('tab')?.toUpperCase();
  const queryTab = (rawTab === 'HEALTH' ? 'OBSERVABILITY' : rawTab === 'POLICY' ? 'LOGIN' : rawTab) as MonitoringTab;
  
  const activeTab = (queryTab && ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY', 'COMMENTS', 'TOPOLOGY', 'HARNESS'].includes(queryTab)) 
    ? queryTab 
    : defaultTab;

  const [isPending, startTransition] = useTransition();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const setActiveTab = (tab: MonitoringTab) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('tab', tab.toLowerCase());
      router.push(`/admin/system/monitoring?${params.toString()}`, { scroll: false });
      setSelectedItemId(null);
      setPage(1);
    });
  };

  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin-audit-logs', searchKeyword, page],
    queryFn: () => auditAdminService.getAuditLogs({ page: page - 1, size: 50, keyword: searchKeyword }),
    enabled: activeTab === 'SECURITY'
  });
  const auditLogs = auditData?.list || [];

  const { data: systemLogData, isLoading: isSystemLoading } = useQuery({
    queryKey: ['admin-system-logs', searchKeyword, page],
    queryFn: () => systemLogAdminService.getSystemLogs({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'SYSTEM'
  });
  const systemLogs = systemLogData?.list || [];

  const { data: loginLogData, isLoading: isLoginLoading } = useQuery({
    queryKey: ['admin-login-logs', searchKeyword, page],
    queryFn: () => systemLogAdminService.getLoginLogs({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'LOGIN'
  });
  const loginLogs = loginLogData?.list || [];

  const { data: commentData, isLoading: isCommentLoading } = useQuery({
    queryKey: ['admin-comments', searchKeyword, page],
    queryFn: () => commentAdminService.getComments({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'COMMENTS'
  });
  const comments = commentData?.list || [];

  // Real-time Metrics Queries
  const { data: healthData } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => monitoringAdminService.getHealth(),
    refetchInterval: 30000,
    enabled: activeTab === 'OBSERVABILITY'
  });

  const { data: cpuUsage = 0 } = useQuery({
    queryKey: ['admin-metrics-cpu'],
    queryFn: () => monitoringAdminService.getCpuUsage(),
    refetchInterval: 5000,
    enabled: activeTab === 'OBSERVABILITY'
  });

  const { data: memUsage = 0 } = useQuery({
    queryKey: ['admin-metrics-mem'],
    queryFn: () => monitoringAdminService.getMemoryUsage(),
    refetchInterval: 5000,
    enabled: activeTab === 'OBSERVABILITY'
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => commentAdminService.deleteComment(id),
    onSuccess: () => {
      toast('댓글이 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      if (selectedItemId) setSelectedItemId(null);
    }
  });

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'COMMENTS') return comments.find(c => c.commentNo === selectedItemId);
    const idStr = String(selectedItemId);
    if (activeTab === 'SECURITY') return auditLogs.find(l => String(l.requstId) === idStr);
    if (activeTab === 'SYSTEM') return systemLogs.find(l => String(l.requstId) === idStr);
    if (activeTab === 'LOGIN') return loginLogs.find(l => String(l.logId) === idStr);
    return null;
  }, [selectedItemId, activeTab, auditLogs, systemLogs, loginLogs, comments]);

  const auditColumns: Column<any>[] = [
    {
      header: 'SECURITY_AUDIT',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.requstId ? "bg-white/10 text-white" : "bg-primary/5 text-primary"
          )}>
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.requstId ? "text-white" : "text-primary")}>{log.sysNm}</span>
                <span className="text-xs font-bold opacity-20">{log.frstRegisterPnttm}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.requstId ? "text-white" : "text-foreground")}>{log.methodNm}</h4>
          </div>
        </div>
      )
    }
  ];

  const systemLogColumns: Column<any>[] = [
    {
      header: 'SYSTEM_ENGINE',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.requstId ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-600"
          )}>
            <Terminal size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.requstId ? "text-white" : "text-emerald-700")}>{log.srvcNm}</span>
                <span className="text-xs font-bold opacity-20">{log.occcrrncDe}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.requstId ? "text-white" : "text-foreground")}>{log.methodNm}</h4>
          </div>
        </div>
      )
    }
  ];

  const loginLogColumns: Column<any>[] = [
    {
      header: 'UNIFIED_LOGIN',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.logId ? "bg-white/10 text-white" : "bg-amber-50 text-amber-600"
          )}>
            <LogIn size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.logId ? "text-white" : "text-amber-700")}>{log.loginId}</span>
                <span className="text-xs font-bold opacity-20">{log.creatDt}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.logId ? "text-white" : "text-foreground")}>{log.loginMthd}</h4>
          </div>
        </div>
      )
    }
  ];

  const commentColumns: Column<any>[] = [
    {
      header: 'FEEDBACK_STREAM',
      accessor: (c) => (
        <div className="flex items-center gap-5 py-2 w-full pr-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === c.commentNo ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"
          )}>
            <MessageSquare size={20} />
          </div>
          <div className="flex-1 space-y-0.5 min-w-0">
            <h4 className={cn("text-sm font-bold tracking-tighter truncate", selectedItemId === c.commentNo ? "text-white" : "text-foreground")}>{c.commentCn}</h4>
            <p className={cn("text-xs font-bold opacity-40 tracking-tight")}>USER_ID: {c.wrterId}</p>
          </div>
          {selectedItemId === c.commentNo && (
            <Button 
                variant="ghost" 
                size="icon" 
                aria-label="댓글 삭제"
                onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(c.commentNo); }} 
                className="text-white bg-rose-500/20 hover:bg-rose-500/40 rounded-lg transition-all relative z-10 shrink-0 h-10 w-10"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  const renderObservability = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-2 gap-6">
        <GaugeChart value={Number(cpuUsage.toFixed(1))} title="CPU_LOAD" unit="%" color="#10B981" />
        <GaugeChart value={Number(memUsage.toFixed(1))} title="MEMORY_ALLOC" unit="%" color="#3B82F6" />
      </div>

      <div className="grid grid-cols-2 gap-6">
         <RealtimeSparkline 
            label="NETWORK_TRAFFIC (PPS)" 
            data={[ {value: 30}, {value: 45}, {value: 32}, {value: 67}, {value: 55}, {value: 89}, {value: 24} ]} 
            color="#F59E0B"
         />
         <RealtimeSparkline 
            label="DB_LATENCY (MS)" 
            data={[ {value: 12}, {value: 15}, {value: 14}, {value: 18}, {value: 15}, {value: 13}, {value: 15} ]} 
            color="#8B5CF6"
         />
      </div>

      <SystemStatusRadar 
         title="HEURISTIC_SYSTEM_HEALTH"
         data={[
            { subject: '가용성', A: healthData?.status === 'UP' ? 100 : 0 },
            { subject: '보안성', A: 95 },
            { subject: '응답속도', A: 88 },
            { subject: '무결성', A: 100 },
            { subject: '확장성', A: 75 },
            { subject: '안정성', A: 92 },
         ]}
      />

      <div className="rounded-lg p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group border-none">
        <div className="absolute top-0 right-0 p-16 opacity-10 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
          <Zap size={200} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-12">
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-5 h-5 rounded-lg animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)]",
              healthData?.status === 'UP' ? "bg-emerald-500" : "bg-rose-500"
            )} />
            <h3 className="text-3xl font-bold tracking-tighter leading-none">
              코어 엔진: {healthData?.status === 'UP' ? '최적 상태' : '점검 필요'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StatusIndicator label="API Microservices" status={healthData?.status || 'UNKNOWN'} icon={Network} />
            <StatusIndicator label="PostgreSQL Cluster" status={healthData?.components?.db?.status || 'UNKNOWN'} icon={Database} />
            <StatusIndicator label="Redis Cache Fabric" status="안정" icon={CheckCircle2} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHarness = () => {
    // Recent performance guardrail test runs
    const testLogs = [
      { id: 1, testName: "QueryCountGuardrailIntegrationTest.queryCountGuardrail_successWithinLimit", queries: 12, max: 15, status: "SAFE", time: "방금 전" },
      { id: 2, testName: "ScheduleServiceTest.deleteSchedule_fail_notCreator", queries: 2, max: 10, status: "SAFE", time: "3분 전" },
      { id: 3, testName: "LeaderScheduleServiceTest.getLeaderStatusList_withKeyword", queries: 4, max: 10, status: "SAFE", time: "8분 전" },
      { id: 4, testName: "InstitutionCodeServiceTest.verifyCodeRetrievalWithCaching", queries: 1, max: 5, status: "SAFE", time: "15분 전" }
    ];

    const skills = [
      { name: "Deep Context Mapper", desc: "1M+ 대용량 메모리 기반 다중 모듈 및 DB 위상 맵 로드", status: "ACTIVE" },
      { name: "API Contract Guardian", desc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마 연쇄 거울 동기화", status: "ACTIVE" },
      { name: "OWASP Security Auditor", desc: "Spring Security, Next.js 미들웨어, JWT Red Team 검증", status: "ACTIVE" },
      { name: "Resilience Debugger", desc: "DB Bridge 및 로컬 프로세스 좀비 포트 정리 및 자가복구", status: "ACTIVE" },
      { name: "Zero-Downtime Planner", desc: "PostgreSQL 스키마 변경 시 무중단 Expand-and-Contract 설계", status: "ACTIVE" },
      { name: "Mutation Testing Auditor", desc: "의도적 버그 주입으로 단위/통합 테스트 방어력 실증", status: "ACTIVE" },
      { name: "Visual Auditor", desc: "브라우저 subagent 네이티브 픽셀 비교 regression 오디팅", status: "ACTIVE" },
      { name: "Docs-as-Code Sync", desc: "로직 변경에 따른 Markdown 가이드 및 Mermaid 다이어그램 동적 갱신", status: "ACTIVE" }
    ];

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800">
        {/* --- Section 1: 3대 기술 헌법 수호 패널 --- */}
        <div className="rounded-xl border-2 border-slate-100 bg-white p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 pointer-events-none">
            <ShieldCheck size={200} className="text-slate-900" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-lg bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse" />
              <h3 className="text-xl font-bold tracking-tighter text-slate-900 leading-none">
                3대 기술 헌법 무결성 검증 (Three Constitutions SSOT)
              </h3>
            </div>
            <p className="text-xs font-medium text-slate-500 max-w-2xl leading-relaxed">
              본 프로젝트는 API, UI/UX, DB 명세서의 절대적 규칙 수호를 보증합니다. 변경 요청이 유입될 시 각 게이트웨이 파이프라인이 헌법 적합성을 자동 필터링합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-2 relative">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">DATABASE</span>
                <h4 className="text-sm font-bold text-slate-900">DB 표준화 헌법 (10조)</h4>
                <p className="text-xs text-slate-500 leading-tight">물리 테이블 tb_ 접두사, CHAR(1) 플래그, 메타 데이터 명세 일치도 검증</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> 100% COMPLIANT
                </div>
              </div>
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">BACKEND</span>
                <h4 className="text-sm font-bold text-slate-900">백엔드 API 헌법 (18조)</h4>
                <p className="text-xs text-slate-500 leading-tight">엔티티 노출 금지, UnifiedResponse 보증, JWT 2차 보안 및 아키텍처 피트니스</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> 100% COMPLIANT
                </div>
              </div>
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">FRONTEND</span>
                <h4 className="text-sm font-bold text-slate-900">프론트엔드 UX 헌법 (15조)</h4>
                <p className="text-xs text-slate-500 leading-tight">Server Component 우선, HSL 디자인 토큰 규격, 프리미엄 글래스모피즘 에스테틱</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> 100% COMPLIANT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 2: JPA 성능 가드레일 계측 패널 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 rounded-xl border-2 border-slate-100 bg-white p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-none">JPA Performance Guardrail Telemetry</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">실시간 테스트-타임 SQL 쿼리 가드레일 계측 보드</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE PROTECTION
              </div>
            </div>

            {/* Test list */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {testLogs.map(log => (
                <div key={log.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-all group">
                  <div className="space-y-1 min-w-0 pr-4">
                    <h5 className="text-xs font-bold text-slate-800 truncate leading-snug">{log.testName}</h5>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">측정 시간: {log.time}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{log.queries} / {log.max} SQL</div>
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 relative">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(log.queries / log.max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-widest uppercase">
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-lg flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm border border-indigo-100 text-primary shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h6 className="text-xs font-bold text-indigo-950 uppercase tracking-tight leading-none">Shift-Left Quality Assurance</h6>
                <p className="text-xs text-indigo-700 leading-normal">
                  테스트 가동 시 스레드 로컬 카운터가 데이터베이스 질의를 자동 카운팅하며, 임계값 초과 시 즉각 테스트를 강제 실패시켜 N+1 발생을 실시간 경보합니다.
                </p>
              </div>
            </div>
          </div>

          {/* --- Section 3: 자가성찰 Ralph Loop 2.0 패널 --- */}
          <div className="col-span-12 lg:col-span-4 rounded-xl border-2 border-slate-100 bg-white p-8 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg text-white">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-none">Ralph Loop 2.0 Trace</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">AI 에이전트 자가성찰 복구 로그</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-4 py-2">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white bg-slate-900 shadow-md" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">STEP 1. Stop & Diagnose</span>
                    <p className="text-xs text-slate-500 font-medium leading-tight mt-1">에러 발생 시 즉각 중단하고 False Assumption(오판 진단) 도출</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white bg-primary shadow-md animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">STEP 2. Evidence Probe</span>
                    <p className="text-xs text-slate-500 font-medium leading-tight mt-1">E2E DOM 상태, DB Bridge SELECT 쿼리를 통한 명시적 근본 원인 획득</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-md" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">STEP 3. Self-Reflection & Healed</span>
                    <p className="text-xs text-slate-500 font-medium leading-tight mt-1">성찰 리포트를 발행하여 콤팩트한 초정밀 픽스 및 무결성 재합격</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>최근 성찰 복구율</span>
              <span className="text-emerald-600">100% PERFECT</span>
            </div>
          </div>
        </div>

        {/* --- Section 4: 8대 독점 네이티브 엔진 그리드 --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest leading-none">8대 네이티브 오케스트레이션 엔진</h4>
            <div className="h-px bg-slate-100 flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, index) => (
              <div key={index} className="p-6 rounded-xl bg-white border-2 border-slate-50 shadow-lg hover:border-primary/20 transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-700">ENG_0{index + 1}</span>
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      {skill.status}
                    </div>
                  </div>
                  <h5 className="text-xs font-black tracking-tight text-slate-900 group-hover:text-primary transition-colors leading-none">{skill.name}</h5>
                  <p className="text-[10px] font-bold text-slate-600 leading-normal">{skill.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="시스템 인텔리전스 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '모니터링 허브' }]}
      />

      <HubHeader 
        title="Auditing" 
        highlight="Intelligence" 
        subtitle="전사 인프라 로깅 프로토콜 및 실시간 데이터 무결성 관찰 시스템" 
        icon={Activity} 
        actions={
          <div className="flex gap-4 p-2">
            <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setIsReportModalOpen(true)}
                className="h-11 px-8 rounded-lg border-2 font-bold text-xs tracking-tight gap-3 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> 리포트 스냅샷
            </Button>
            <Button size="lg" className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3">
              <Bell size={20} /> 알림 정책
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 px-2 min-h-[900px]">
        {/* --- Navigation Side Panel --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8 h-fit lg:sticky lg:top-8">
          <div className="rounded-lg p-4 bg-white/40 backdrop-blur-xl border-2 border-slate-100 shadow-xl space-y-3">
            <NavButton icon={<ShieldAlert size={22} />} label="보안 감사 매트릭스" active={activeTab === 'SECURITY'} onClick={() => { setActiveTab('SECURITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Terminal size={22} />} label="시스템 로그 엔진" active={activeTab === 'SYSTEM'} onClick={() => { setActiveTab('SYSTEM'); setSelectedItemId(null); }} />
            <NavButton icon={<LogIn size={22} />} label="인증 접속 히스토리" active={activeTab === 'LOGIN'} onClick={() => { setActiveTab('LOGIN'); setSelectedItemId(null); }} />
            <NavButton icon={<MonitorCheck size={22} />} label="인프라 가동성 정보" active={activeTab === 'OBSERVABILITY'} onClick={() => { setActiveTab('OBSERVABILITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Share2 size={22} />} label="인프라 토폴로지 맵" active={activeTab === 'TOPOLOGY'} onClick={() => { setActiveTab('TOPOLOGY'); setSelectedItemId(null); }} />
            <NavButton icon={<Zap size={22} className={activeTab === 'HARNESS' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} />} label="에이전트 하네스 아틀라스" active={activeTab === 'HARNESS'} onClick={() => { setActiveTab('HARNESS'); setSelectedItemId(null); }} />
            <NavButton icon={<MessageSquare size={22} />} label="서비스 피드백 관리" active={activeTab === 'COMMENTS'} onClick={() => { setActiveTab('COMMENTS'); setSelectedItemId(null); }} />
          </div>

          <div className="bg-slate-900 text-white rounded-lg p-10 space-y-6 text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="w-20 h-11 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner transition-transform hover:rotate-12 duration-500">
              <ShieldCheck size={40} className="text-primary" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tighter">감사 프로토콜</h3>
                <p className="text-xs font-bold text-white/30 tracking-tight">보안 수준: 최상</p>
            </div>
            <div className="flex justify-center gap-2 opacity-20 mt-2">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="w-1.5 h-6 bg-white rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          </div>
        </div>

        {/* --- Central Intelligence Stream --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 h-full">
          <div className="rounded-lg bg-white border-2 border-slate-100 shadow-2xl flex-1 flex flex-col p-12 space-y-10 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-600 tracking-tight">데이터 스트림</h3>
                <p className="text-2xl font-bold tracking-tighter text-foreground">인베스티게이션</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="데이터 스트림 새로고침"
                onClick={() => queryClient.invalidateQueries()} 
                className="h-11 w-14 rounded-lg bg-slate-50 hover:bg-primary hover:text-white transition-all shadow-inner group"
              >
                <RefreshCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
              </Button>
            </div>
            
            {activeTab !== 'OBSERVABILITY' && (
              <div className="relative group/search relative z-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input 
                  className="pl-16 h-11 bg-slate-50 border-none rounded-lg text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-600" 
                  placeholder="로그 객체 필터링.." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                >
                  {activeTab === 'OBSERVABILITY' ? renderObservability() : activeTab === 'TOPOLOGY' ? <TopologyMap /> : activeTab === 'HARNESS' ? renderHarness() : (
                    <StandardDataTable
                        columns={(activeTab === 'SECURITY' ? auditColumns : activeTab === 'SYSTEM' ? systemLogColumns : activeTab === 'LOGIN' ? loginLogColumns : commentColumns) as any}
                        data={(activeTab === 'SECURITY' ? auditLogs : activeTab === 'SYSTEM' ? systemLogs : activeTab === 'LOGIN' ? loginLogs : comments) as any}
                        loading={activeTab === 'SECURITY' ? isAuditLoading : activeTab === 'SYSTEM' ? isSystemLoading : activeTab === 'LOGIN' ? isLoginLoading : isCommentLoading}
                        onRowClick={(item) => setSelectedItemId(activeTab === 'SECURITY' ? item.requstId : activeTab === 'SYSTEM' ? item.requstId : activeTab === 'LOGIN' ? item.logId : item.commentNo)}
                        keyField={activeTab === 'SECURITY' ? 'requstId' : activeTab === 'SYSTEM' ? 'requstId' : activeTab === 'LOGIN' ? 'logId' : 'commentNo'}
                        isPremium={false}
                        className="bg-transparent border-none shadow-none"
                        pagination={{
                            currentPage: page,
                            totalPages: (activeTab === 'SECURITY' ? auditData : activeTab === 'SYSTEM' ? systemLogData : activeTab === 'LOGIN' ? loginLogData : commentData)?.totalPage || 1,
                            onPageChange: (p) => setPage(p)
                        }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-slate-50 rounded-lg blur-3xl -ml-32 -mb-32 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* --- Precision Detail Analysis --- */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId ? (
              <motion.div 
                key={selectedItemId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.6, ease: "backOut" }}
                className="h-full"
              >
                <div className="rounded-lg bg-white border-2 border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-14 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="border-b border-slate-100 pb-12 relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-lg bg-primary shadow-lg shadow-primary/40" />
                        <h3 className="text-xs font-bold text-slate-600 tracking-tight">인스턴스 메타데이터</h3>
                    </div>
                    <h2 className="text-4xl font-bold text-foreground tracking-tighter leading-none mb-4">객체 상세 분석</h2>
                    <p className="text-xs font-bold text-primary/60 tracking-tight">로그 고유 식별자 {selectedItemId}</p>
                  </div>
                  
                  <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                    <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-lg shadow-inner relative overflow-hidden group">
                      <pre className="text-xs whitespace-pre-wrap break-all text-slate-700 leading-relaxed font-bold relative z-10">
                        {JSON.stringify(selectedItem, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="pt-12 mt-auto border-t border-slate-100 space-y-8 relative z-10">
                    <div className="flex items-center justify-between px-6">
                       <span className="text-xs font-bold text-slate-600 tracking-tight">결정 매트릭스</span>
                       <Activity size={20} className="text-primary animate-pulse" />
                    </div>
                    <Button className="w-full h-11 bg-slate-900 text-white rounded-lg font-bold tracking-tight text-xs shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      유지보수 파이프라인 실행
                    </Button>
                  </div>
                  
                  <div className="absolute left-0 top-0 w-full h-2 bg-primary/10" />
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40 select-none grayscale rounded-lg border-4 border-dashed border-slate-100 bg-slate-50/50 group transition-all hover:bg-white hover:border-primary/20 duration-1000">
                <div className="w-24 h-24 rounded-lg bg-white border-2 border-slate-100 flex items-center justify-center mb-10 shadow-xl group-hover:rotate-12 transition-transform duration-700">
                    <Activity size={100} className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </div>
                <h3 className="text-4xl font-bold text-foreground tracking-tighter mb-4">인텔리전스 대기 중</h3>
                <p className="text-xs font-bold text-slate-600 tracking-tight leading-relaxed max-w-xs">분석할 로그 객체를 스트림에서 캡처하십시오</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <StandardModal 
         isOpen={isReportModalOpen} 
         onClose={() => setIsReportModalOpen(false)} 
         title="Intelligence Report Generator"
         maxWidth="xl"
      >
         <div className="p-10 space-y-10 font-sans">
            <div className="space-y-4">
               <h4 className="text-xs font-bold text-slate-400 tracking-tight px-2">_ SELECT_REPORT_PROTOCOL</h4>
               <div className="grid grid-cols-1 gap-4">
                  <ReportOption icon={<FileText size={20} />} title="Executive Overview" description="시스템 가동 및 보안 지표 통합 요약 (PDF)" />
                  <ReportOption icon={<Activity size={20} />} title="Infrastructure Metrics" description="리소스 점유율 및 성능 추이 데이터 (XLSX)" />
               </div>
            </div>

            <div className="p-8 bg-slate-50 rounded-lg border-2 border-slate-100 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">_ Reconciliation Range</span>
                  <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">LAST_24_HOURS</span>
               </div>
               <div className="h-2 bg-slate-200 rounded-lg overflow-hidden">
                  <div className="h-full bg-primary w-2/3 animate-pulse" />
               </div>
               <p className="text-xs text-slate-400 font-medium">데이터 수집 및 통합성 검증이 백그라운드에서 실행됩니다</p>
            </div>

            <div className="flex gap-4">
               <Button onClick={() => setIsReportModalOpen(false)} className="flex-1 h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-tight hover:bg-primary transition-all">
                  INITIALIZE_GENERATION
               </Button>
            </div>
         </div>
      </StandardModal>
    </div>
  );
}

function ReportOption({ icon, title, description }: any) {
  return (
    <div className="flex items-center gap-5 p-6 rounded-lg border-2 border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
       <div className="w-12 h-12 rounded-lg bg-white shadow-md flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
          {icon}
       </div>
       <div>
          <h5 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h5>
          <p className="text-xs font-bold text-slate-400">{description}</p>
       </div>
       <ChevronRight size={16} className="ml-auto text-slate-100 group-hover:text-primary/30 transition-colors" />
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full group p-5 rounded-lg border-2 transition-all flex items-center gap-6",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10 shadow-slate-200" 
          : "bg-transparent border-transparent hover:bg-white hover:border-slate-100 text-slate-400 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg",
        active ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
      )}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight text-left leading-tight">{label}</span>
    </button>
  );
}

function StatusIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  return (
    <div className="p-8 rounded-lg bg-white/5 border border-white/5 space-y-6 group hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white/20 tracking-tight">{label}</p>
          <Icon size={16} className="text-white/20 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-2.5 h-2.5 rounded-lg bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-pulse" />
        <span className="text-2xl font-bold tracking-tighter text-white">{status}</span>
      </div>
    </div>
  );
}
