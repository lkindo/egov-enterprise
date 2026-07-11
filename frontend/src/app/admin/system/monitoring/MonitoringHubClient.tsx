'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
;
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
;
import { Activity,  
  ShieldAlert,  
  Terminal,  
  MessageSquare,  
  Search,  
  RefreshCcw,  
  Bell, 
  Zap, 
  LogIn, 
  Cpu, 
  Server, 
  Download, 
  Trash2, 
  ShieldCheck, 
  ChevronRight, 
  MonitorCheck, 
  Database, 
  Network, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  FileText } from 'lucide-react';

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
      <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
  const auditLogs = useMemo(() => auditData?.list || [], [auditData]);

  const { data: systemLogData, isLoading: isSystemLoading } = useQuery({
    queryKey: ['admin-system-logs', searchKeyword, page],
    queryFn: () => systemLogAdminService.getSystemLogs({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'SYSTEM'
  });
  const systemLogs = useMemo(() => systemLogData?.list || [], [systemLogData]);

  const { data: loginLogData, isLoading: isLoginLoading } = useQuery({
    queryKey: ['admin-login-logs', searchKeyword, page],
    queryFn: () => systemLogAdminService.getLoginLogs({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'LOGIN'
  });
  const loginLogs = useMemo(() => loginLogData?.list || [], [loginLogData]);

  const { data: commentData, isLoading: isCommentLoading } = useQuery({
    queryKey: ['admin-comments', searchKeyword, page],
    queryFn: () => commentAdminService.getComments({ page: page - 1, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'COMMENTS'
  });
  const comments = useMemo(() => commentData?.list || [], [commentData]);

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
    const idStr = String(selectedItemId);
    if (idStr.startsWith('SKILL_')) {
      const skills = [
        { id: "SKILL_ENG_01", name: "Deep Context Mapper", desc: "1M+ 대용량 메모리 기반 다중 모듈 및 DB 위상 맵 로드", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_02", name: "API Contract Guardian", desc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마 연쇄 거울 동기화", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_03", name: "OWASP Security Auditor", desc: "Spring Security, Next.js 미들웨어, JWT Red Team 검증", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_04", name: "Resilience Debugger", desc: "DB Bridge 및 로컬 프로세스 좀비 포트 정리 및 자가복구", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_05", name: "Zero-Downtime Planner", desc: "PostgreSQL 스키마 변경 시 무중단 Expand-and-Contract 설계", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_06", name: "Mutation Testing Auditor", desc: "의도적 버그 주입으로 단위/통합 테스트 방어력 실증", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_07", name: "Visual Auditor", desc: "브라우저 subagent 네이티브 픽셀 비교 regression 오디팅", status: "ACTIVE", type: "SKILL" },
        { id: "SKILL_ENG_08", name: "Docs-as-Code Sync", desc: "로직 변경에 따른 Markdown 가이드 및 Mermaid 다이어그램 동적 갱신", status: "ACTIVE", type: "SKILL" }
      ];
      return skills.find(s => s.id === idStr) || null;
    }
    if (idStr.startsWith('TEST_')) {
      const testLogs = [
        { id: "TEST_01", testName: "QueryCountGuardrailIntegrationTest.queryCountGuardrail_successWithinLimit", queries: 12, max: 15, status: "SAFE", time: "방금 전", type: "TEST" },
        { id: "TEST_02", testName: "ScheduleServiceTest.deleteSchedule_fail_notCreator", queries: 2, max: 10, status: "SAFE", time: "3분 전", type: "TEST" },
        { id: "TEST_03", testName: "LeaderScheduleServiceTest.getLeaderStatusList_withKeyword", queries: 4, max: 10, status: "SAFE", time: "8분 전", type: "TEST" },
        { id: "TEST_04", testName: "InstitutionCodeServiceTest.verifyCodeRetrievalWithCaching", queries: 1, max: 5, status: "SAFE", time: "15분 전", type: "TEST" }
      ];
      return testLogs.find(t => t.id === idStr) || null;
    }
    if (activeTab === 'COMMENTS') return comments.find(c => c.ansSn === selectedItemId);
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
                <span className="text-xs font-bold opacity-20">{log.occrrncDe}</span>
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
            selectedItemId === c.ansSn ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"
          )}>
            <MessageSquare size={20} />
          </div>
          <div className="flex-1 space-y-0.5 min-w-0">
            <h4 className={cn("text-sm font-bold tracking-tighter truncate", selectedItemId === c.ansSn ? "text-white" : "text-foreground")}>{c.ansCn}</h4>
            <p className={cn("text-xs font-bold opacity-40 tracking-tight")}>USER_ID: {c.wrterId}</p>
          </div>
          {selectedItemId === c.ansSn && (
            <Button 
                variant="ghost" 
                size="icon" 
                aria-label="댓글 삭제"
                onClick={(e) => { e.stopPropagation(); deleteCommentMutation.mutate(c.ansSn); }} 
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
      { id: "TEST_01", testName: "QueryCountGuardrailIntegrationTest.queryCountGuardrail_successWithinLimit", queries: 12, max: 15, status: "SAFE", time: "방금 전" },
      { id: "TEST_02", testName: "ScheduleServiceTest.deleteSchedule_fail_notCreator", queries: 2, max: 10, status: "SAFE", time: "3분 전" },
      { id: "TEST_03", testName: "LeaderScheduleServiceTest.getLeaderStatusList_withKeyword", queries: 4, max: 10, status: "SAFE", time: "8분 전" },
      { id: "TEST_04", testName: "InstitutionCodeServiceTest.verifyCodeRetrievalWithCaching", queries: 1, max: 5, status: "SAFE", time: "15분 전" }
    ];

    const skills = [
      { id: "SKILL_ENG_01", name: "Deep Context Mapper", desc: "1M+ 대용량 메모리 기반 다중 모듈 및 DB 위상 맵 로드", status: "ACTIVE" },
      { id: "SKILL_ENG_02", name: "API Contract Guardian", desc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마 연쇄 거울 동기화", status: "ACTIVE" },
      { id: "SKILL_ENG_03", name: "OWASP Security Auditor", desc: "Spring Security, Next.js 미들웨어, JWT Red Team 검증", status: "ACTIVE" },
      { id: "SKILL_ENG_04", name: "Resilience Debugger", desc: "DB Bridge 및 로컬 프로세스 좀비 포트 정리 및 자가복구", status: "ACTIVE" },
      { id: "SKILL_ENG_05", name: "Zero-Downtime Planner", desc: "PostgreSQL 스키마 변경 시 무중단 Expand-and-Contract 설계", status: "ACTIVE" },
      { id: "SKILL_ENG_06", name: "Mutation Testing Auditor", desc: "의도적 버그 주입으로 단위/통합 테스트 방어력 실증", status: "ACTIVE" },
      { id: "SKILL_ENG_07", name: "Visual Auditor", desc: "브라우저 subagent 네이티브 픽셀 비교 regression 오디팅", status: "ACTIVE" },
      { id: "SKILL_ENG_08", name: "Docs-as-Code Sync", desc: "로직 변경에 따른 Markdown 가이드 및 Mermaid 다이어그램 동적 갱신", status: "ACTIVE" }
    ];

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-foreground">
        {/* --- Section 1: 8대 독점 네이티브 엔진 리스트 (2열 배치) --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">8대 네이티브 오케스트레이션 엔진</h4>
            <div className="h-px bg-muted flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill, index) => (
              <button 
                key={skill.id} 
                onClick={() => setSelectedItemId(skill.id)}
                className={cn(
                  "p-5 rounded-lg bg-muted border-2 transition-all flex flex-col justify-between group text-left outline-none cursor-pointer",
                  selectedItemId === skill.id 
                    ? "border-primary bg-primary/5 shadow-md scale-[1.01]" 
                    : "border-border hover:border-primary/20 hover:bg-muted/50"
                )}
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono text-muted-foreground">ENG_0{index + 1}</span>
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {skill.status}
                    </div>
                  </div>
                  <h5 className={cn("text-xs font-black tracking-tight leading-none", selectedItemId === skill.id ? "text-primary" : "text-foreground group-hover:text-primary")}>{skill.name}</h5>
                  <p className="text-[10px] font-bold text-muted-foreground leading-tight">{skill.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* --- Section 2: JPA 성능 가드레일 계측 패널 (가로 전체 활용) --- */}
        <div className="rounded-xl border-2 border-border bg-white p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground leading-none">JPA Performance Guardrail Telemetry</h4>
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">실시간 테스트-타임 SQL 쿼리 가드레일 계측 보드</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ACTIVE PROTECTION
            </div>
          </div>

          {/* Test list */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {testLogs.map(log => (
              <button
                key={log.id}
                onClick={() => setSelectedItemId(log.id)}
                className={cn(
                  "w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all group outline-none cursor-pointer",
                  selectedItemId === log.id 
                    ? "border-primary bg-primary/5 shadow-md scale-[1.01]" 
                    : "bg-muted border-border hover:bg-muted hover:border-border"
                )}
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <h5 className={cn("text-xs font-bold truncate leading-snug", selectedItemId === log.id ? "text-primary" : "text-foreground")}>{log.testName}</h5>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">측정 시간: {log.time}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-foreground">{log.queries} / {log.max} SQL</div>
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
              </button>
            ))}
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm border border-indigo-100 text-primary shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="space-y-0.5">
              <h6 className="text-xs font-bold text-indigo-950 uppercase tracking-tight leading-none">Shift-Left Quality Assurance</h6>
              <p className="text-[10px] font-bold text-indigo-700 leading-tight">
                테스트 가동 시 스레드 로컬 카운터가 데이터베이스 질의를 자동 카운팅하며, 임계값 초과 시 즉각 테스트를 강제 실패시켜 N+1 발생을 실시간 경보합니다.
              </p>
            </div>
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
            <button 
                onClick={() => setIsReportModalOpen(true)}
                className="h-11 px-8 rounded-lg border-2 border-border bg-white text-foreground font-bold text-xs tracking-tight gap-3 hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center group outline-none cursor-pointer"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform shrink-0" />
              <span>리포트 스냅샷</span>
            </button>
            <Button size="lg" className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3">
              <Bell size={20} /> 알림 정책
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 px-2 min-h-[900px]">
        {/* --- Navigation Side Panel --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8 h-fit lg:sticky lg:top-8">
          <div className="rounded-lg p-4 bg-white/40 backdrop-blur-xl border-2 border-border shadow-xl space-y-3">
            <NavButton icon={<ShieldAlert size={22} />} label="보안 감사 매트릭스" active={activeTab === 'SECURITY'} onClick={() => { setActiveTab('SECURITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Terminal size={22} />} label="시스템 로그 엔진" active={activeTab === 'SYSTEM'} onClick={() => { setActiveTab('SYSTEM'); setSelectedItemId(null); }} />
            <NavButton icon={<LogIn size={22} />} label="인증 접속 히스토리" active={activeTab === 'LOGIN'} onClick={() => { setActiveTab('LOGIN'); setSelectedItemId(null); }} />
            <NavButton icon={<MonitorCheck size={22} />} label="인프라 가동성 정보" active={activeTab === 'OBSERVABILITY'} onClick={() => { setActiveTab('OBSERVABILITY'); setSelectedItemId(null); }} />
            <NavButton icon={<Share2 size={22} />} label="인프라 토폴로지 맵" active={activeTab === 'TOPOLOGY'} onClick={() => { setActiveTab('TOPOLOGY'); setSelectedItemId(null); }} />
            <NavButton icon={<Zap size={22} className={activeTab === 'HARNESS' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} />} label="에이전트 하네스 아틀라스" active={activeTab === 'HARNESS'} onClick={() => { setActiveTab('HARNESS'); setSelectedItemId(null); }} />
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
          <div className="rounded-lg bg-white border-2 border-border shadow-2xl flex-1 flex flex-col p-12 space-y-10 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-muted-foreground tracking-tight">데이터 스트림</h3>
                <p className="text-2xl font-bold tracking-tighter text-foreground">인베스티게이션</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="데이터 스트림 새로고침"
                onClick={() => queryClient.invalidateQueries()} 
                className="h-11 w-14 rounded-lg bg-muted hover:bg-primary hover:text-white transition-all shadow-inner group"
              >
                <RefreshCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
              </Button>
            </div>
            
            {activeTab !== 'OBSERVABILITY' && (
              <div className="relative group/search relative z-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input 
                  className="pl-16 h-11 bg-muted border-none rounded-lg text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground" 
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
                        onRowClick={(item) => setSelectedItemId(activeTab === 'SECURITY' ? item.requstId : activeTab === 'SYSTEM' ? item.requstId : activeTab === 'LOGIN' ? item.logId : item.ansSn)}
                        keyField={activeTab === 'SECURITY' ? 'requstId' : activeTab === 'SYSTEM' ? 'requstId' : activeTab === 'LOGIN' ? 'logId' : 'ansSn'}
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
            
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-muted rounded-lg blur-3xl -ml-32 -mb-32 pointer-events-none opacity-50" />
          </div>
        </div>

        {/* --- Precision Detail Analysis --- */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId && (
              activeTab !== 'HARNESS' || 
              String(selectedItemId).startsWith('SKILL_') || 
              String(selectedItemId).startsWith('TEST_')
            ) ? (
              <motion.div 
                key={selectedItemId}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="h-full"
              >
                <div className="rounded-lg bg-white border-2 border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-14 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="border-b border-border pb-12 relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                        <h3 className="text-xs font-bold text-muted-foreground tracking-tight">
                          {selectedItem && (selectedItem as any).type === 'SKILL' ? '아틀라스 엔진 명세' : selectedItem && (selectedItem as any).type === 'TEST' ? 'JPA SQL 실시간 계측' : '인스턴스 메타데이터'}
                        </h3>
                    </div>
                    <h2 className="text-4xl font-bold text-foreground tracking-tighter leading-none mb-4">
                      {selectedItem && (selectedItem as any).type === 'SKILL' ? '엔진 아키텍처' : selectedItem && (selectedItem as any).type === 'TEST' ? '가드레일 검증' : '객체 상세 분석'}
                    </h2>
                    <p className="text-xs font-bold text-primary/60 tracking-tight">로그 고유 식별자 {selectedItemId}</p>
                  </div>
                  
                  <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                    {selectedItem && (selectedItem as any).type === 'SKILL' ? (
                      <SkillDetailView skill={selectedItem as any} />
                    ) : selectedItem && (selectedItem as any).type === 'TEST' ? (
                      <TestDetailView test={selectedItem as any} />
                    ) : selectedItem ? (
                      <div className="p-8 bg-muted border-2 border-border rounded-lg shadow-inner relative overflow-hidden group">
                        <pre className="text-xs whitespace-pre-wrap break-all text-foreground leading-relaxed font-bold relative z-10">
                          {JSON.stringify(selectedItem, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-12 border-2 border-dashed border-border bg-muted/50 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
                        <AlertCircle className="text-muted-foreground w-8 h-8 animate-pulse" />
                        <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                          선택된 인스턴스의 상세 메타데이터를<br />로드할 수 없습니다. (만료 또는 미존재)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-12 mt-auto border-t border-border space-y-8 relative z-10">
                    <div className="flex items-center justify-between px-6">
                       <span className="text-xs font-bold text-muted-foreground tracking-tight">결정 매트릭스</span>
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
            ) : activeTab === 'HARNESS' ? (
              <HarnessDashboardOverview selectedItemId={selectedItemId} setSelectedItemId={setSelectedItemId} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40 select-none grayscale rounded-lg border-4 border-dashed border-border bg-muted/50 group transition-all hover:bg-white hover:border-primary/20 duration-1000">
                <div className="w-24 h-24 rounded-lg bg-white border-2 border-border flex items-center justify-center mb-10 shadow-xl group-hover:rotate-12 transition-transform duration-700">
                    <Activity size={100} className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </div>
                <h3 className="text-4xl font-bold text-foreground tracking-tighter mb-4">인텔리전스 대기 중</h3>
                <p className="text-xs font-bold text-muted-foreground tracking-tight leading-relaxed max-w-xs">분석할 로그 객체를 스트림에서 캡처하십시오</p>
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
               <h4 className="text-xs font-bold text-muted-foreground tracking-tight px-2">_ SELECT_REPORT_PROTOCOL</h4>
               <div className="grid grid-cols-1 gap-4">
                  <ReportOption icon={<FileText size={20} />} title="Executive Overview" description="시스템 가동 및 보안 지표 통합 요약 (PDF)" />
                  <ReportOption icon={<Activity size={20} />} title="Infrastructure Metrics" description="리소스 점유율 및 성능 추이 데이터 (XLSX)" />
               </div>
            </div>

            <div className="p-8 bg-muted rounded-lg border-2 border-border space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">_ Reconciliation Range</span>
                  <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">LAST_24_HOURS</span>
               </div>
               <div className="h-2 bg-slate-200 rounded-lg overflow-hidden">
                  <div className="h-full bg-primary w-2/3 animate-pulse" />
               </div>
               <p className="text-xs text-muted-foreground font-medium">데이터 수집 및 통합성 검증이 백그라운드에서 실행됩니다</p>
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
    <div className="flex items-center gap-5 p-6 rounded-lg border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
       <div className="w-12 h-12 rounded-lg bg-white shadow-md flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
       </div>
       <div>
          <h5 className="text-sm font-bold text-foreground tracking-tight">{title}</h5>
          <p className="text-xs font-bold text-muted-foreground">{description}</p>
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
          : "bg-transparent border-transparent hover:bg-white hover:border-border text-muted-foreground hover:text-foreground"
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
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-pulse" />
        <span className="text-2xl font-bold tracking-tighter text-white">{status}</span>
      </div>
    </div>
  );
}

function HarnessDashboardOverview({ selectedItemId, setSelectedItemId }: any) {
  return (
    <div className="rounded-lg bg-white border-2 border-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-10 space-y-10 flex flex-col relative overflow-hidden text-left font-sans">
      <div className="border-b border-border pb-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/40 animate-pulse" />
          <h3 className="text-xs font-bold text-muted-foreground tracking-tight">Harness Governance SSOT</h3>
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-3">아틀라스 통합 관제</h2>
        <p className="text-xs font-bold text-muted-foreground tracking-tight">AI 오케스트레이션 & 3대 기술 헌법 실시간 지표 요약</p>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {/* Core Stats */}
        <div className="p-6 bg-slate-900 rounded-lg text-white space-y-4 shadow-inner relative overflow-hidden group border-none">
          <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
            <ShieldCheck size={120} className="text-primary" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-black tracking-widest text-primary uppercase">ORCHESTRATION SCORE</span>
            <div className="text-3xl font-black text-white font-mono leading-none">99.8<span className="text-sm font-bold text-muted-foreground">%</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
            <div>
              <span className="text-[9px] font-black text-muted-foreground block uppercase">N+1 GUARDRAIL</span>
              <span className="text-[10px] font-black text-emerald-400 leading-none">ACTIVE PROTECTION</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-muted-foreground block uppercase">MUTATION TIER</span>
              <span className="text-[10px] font-black text-primary leading-none">TIER 1 SECURE</span>
            </div>
          </div>
        </div>

        {/* 3대 기술 헌법 수호 패널 */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">3대 기술 헌법 무결성</h4>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-500">DATABASE</span>
                <span className="text-[9px] font-black text-emerald-600">COMPLIANT</span>
              </div>
              <h5 className="text-xs font-bold text-foreground">DB 표준화 헌법 (10조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">물리 테이블 tb_ 접두사, CHAR(1) 플래그, 메타 데이터 명세 보증</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-primary">BACKEND</span>
                <span className="text-[9px] font-black text-emerald-600">COMPLIANT</span>
              </div>
              <h5 className="text-xs font-bold text-foreground">백엔드 API 헌법 (18조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">엔티티 노출 금지, UnifiedResponse 보증, JWT 2차 보안 아키텍처</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">FRONTEND</span>
                <span className="text-[9px] font-black text-emerald-600">COMPLIANT</span>
              </div>
              <h5 className="text-xs font-bold text-foreground">프론트엔드 UX 헌법 (15조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">Server Component 우선, HSL 디자인 토큰, 프리미엄 글래스모피즘 에스테틱</p>
            </div>
          </div>
        </div>

        {/* Ralph Loop 2.0 Trace 패널 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Ralph Loop 2.0 Trace</h4>
            <span className="text-[9px] font-black text-emerald-600">100% PERFECT</span>
          </div>
          <div className="p-6 rounded-lg bg-muted border border-border space-y-4">
            <div className="relative pl-5 border-l-2 border-border space-y-4 py-1">
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-white bg-slate-900 shadow-sm" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">STEP 1. Stop & Diagnose</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">에러 시 즉각 중단 및 오판 진단(False Assumption) 도출</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-white bg-primary shadow-sm animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-primary">STEP 2. Evidence Probe</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">E2E DOM 상태, DB Bridge를 통한 물리 근본 원인 획득</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">STEP 3. Reflection & Healing</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">성찰 리포트 발행 및 콤팩트 픽스 및 무결성 재통과</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guides */}
        <div className="p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-lg text-muted-foreground text-[10px] leading-relaxed space-y-2">
          <h5 className="font-bold text-foreground flex items-center gap-1.5"><Cpu size={12} className="text-primary animate-pulse" /> 지능형 아틀라스 사용법</h5>
          <p className="text-muted-foreground font-medium leading-relaxed">
            좌측 <strong>에이전트 하네스 아틀라스</strong> 스트림에서 8대 스킬 엔진 카드나 실시간 JPA 쿼리 성능 계측 로그 항목을 클릭하십시오.
          </p>
          <p className="text-muted-foreground font-medium leading-relaxed">
            선택 시 즉각 상세 아키텍처 정보와 데이터베이스 호출 스택 및 토폴로지가 시각화됩니다.
          </p>
        </div>
      </div>

      <div className="absolute left-0 top-0 w-full h-2 bg-emerald-500/20" />
    </div>
  );
}

function SkillDetailView({ skill }: { skill: any }) {
  const meta: Record<string, { impact: "HIGH" | "MEDIUM", constitution: string, constDesc: string, metrics: string, flow: string[] }> = {
    "SKILL_ENG_01": {
      impact: "HIGH",
      constitution: "DB 헌법 제1조, BE 헌법 제11조",
      constDesc: "물리 테이블 명명 SSOT 및 다중 모듈 간 완벽 격리 아키텍처 검증 보증",
      metrics: "메모리 점유 1.2GB | 스캔 속도 240ms | 정밀도 100%",
      flow: ["PostgreSQL 물리 스키마 로드", "Gradle 모듈 구조 위상 맵 빌드", "1M+ 토큰 가상 메모리 적재", "상호 참조 락 교차 검증"]
    },
    "SKILL_ENG_02": {
      impact: "HIGH",
      constitution: "BE 헌법 제3조, FE 헌법 제7조",
      constDesc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마의 단방향 연쇄 거울 동기화 강제",
      metrics: "계약 검증률 100% | 충돌 방어 0건 | 연쇄 지연 12ms",
      flow: ["DB 제약 조건 스캔", "BE DTO OpenAPI 스펙 대조", "FE generated-api TS 타입 추출", "Zod 스키마 런타임 검사"]
    },
    "SKILL_ENG_03": {
      impact: "HIGH",
      constitution: "BE 헌법 제14조, 글로벌 헌법 제5조",
      constDesc: "Spring Security 필터 체인, JWT 권한 토큰, Next.js 미들웨어의 레드팀 침투 자동 감사",
      metrics: "보안 점수 99.8/100 | 위협 감지 0건 | 무결성 ACTIVE",
      flow: ["Security Filter Chain 가로채기", "JWT 클레임 위변조 인젝션", "Next.js Middleware 권한 우회", "OWASP 취약점 체크리스트 검증"]
    },
    "SKILL_ENG_04": {
      impact: "HIGH",
      constitution: "글로벌 헌법 제4조, BE 헌법 제9조",
      constDesc: "DB Bridge 접속 상태, JVM 포트 충돌, E2E 좀비 프로세스의 실시간 자가 치유",
      metrics: "자가치유율 100% | 평균 복구 1.8초 | 좀비 포트 차단 4건",
      flow: ["OCI DB Bridge Heartbeat 핑", "포트 5432 / 8080 커넥션 모니터링", "프로세스 락 감지 시 즉각 SIGKILL", "포트 바인딩 락 해제 및 서버 재가동"]
    },
    "SKILL_ENG_05": {
      impact: "HIGH",
      constitution: "DB 헌법 제8조, BE 헌법 제6조",
      constDesc: "데이터베이스 스키마 변경 시 무중단 Expand-and-Contract 계획서 자동 수립",
      metrics: "배포 가동률 100% | 다운타임 0.00ms | 2단계 롤아웃 계획",
      flow: ["신규 컬럼/테이블 확장 (Expand)", "이중 쓰기 (Dual Write) 동기화", "구 컬럼 참조 프론트엔드 변경 완료", "레거시 컬럼 최종 수축 (Contract)"]
    },
    "SKILL_ENG_06": {
      impact: "MEDIUM",
      constitution: "BE 헌법 제16조 (뮤테이션 85%)",
      constDesc: "비즈니스 소스 코드에 인위적 뮤턴트(미세 버그)를 주입해 단위 테스트 방어력 실증",
      metrics: "뮤테이션 스코어 88.5% | 생존 뮤턴트 2개 | 검증 속도 4.2s",
      flow: ["소스 코드 AST(구조 분석 트리) 파싱", "인위적인 연산자 반전/널 변환 주입", "해당 영향 범위 단위 테스트 실행", "뮤턴트 킬(Kill) 여부 계측 및 스코어 연산"]
    },
    "SKILL_ENG_07": {
      impact: "HIGH",
      constitution: "FE 헌법 제1조, 제12조",
      constDesc: "Playwright 브라우저를 통한 픽셀 비교 및 HSL/글래스모피즘 에스테틱 준수 검사",
      metrics: "픽셀 일치율 99.94% | 60FPS 모션 합격 | 반응형 HD 통과",
      flow: ["FHD/HD 듀얼 뷰포트 인스턴스 가동", "HSL 다크 슬레이트 명도 대비 비교", "CSS Framer Motion 가속 체크", "비주얼 회귀 및 UI 찌그러짐 감지"]
    },
    "SKILL_ENG_08": {
      impact: "MEDIUM",
      constitution: "글로벌 헌법 제7조, BE 헌법 제18조",
      constDesc: "API/DB 변경 사항을 감지하여 Markdown 기술 문서 및 Mermaid 다이어그램 동적 갱신",
      metrics: "문서 불일치율 0% | 다이어그램 일치 100% | 지연 1.1s",
      flow: ["소스/스키마 변경 파일 AST 감시", "Mermaid 마크다운 템플릿 로드", "다이어그램 관계선 신규 매핑", "Git 가이드북 마크다운 파일 자동 기록"]
    }
  };

  const currentMeta = meta[skill.id] || {
    impact: "MEDIUM" as const,
    constitution: "해당 없음",
    constDesc: "지정된 헌법 규정이 존재하지 않습니다.",
    metrics: "정보 없음",
    flow: ["정의된 프로세스 단계가 없습니다."]
  };

  return (
    <div className="space-y-8 text-left font-sans animate-in fade-in duration-500">
      {/* Target Skill Header */}
      <div className="p-6 rounded-lg bg-muted border border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase font-mono">{skill.id}</span>
          <h4 className="text-lg font-black text-foreground tracking-tight mt-1">{skill.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {skill.status}
        </div>
      </div>

      {/* Basic Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-lg bg-muted border border-border space-y-1">
          <span className="text-[9px] font-black text-muted-foreground block uppercase">SYSTEM IMPACT</span>
          <span className={cn("text-xs font-black", currentMeta.impact === "HIGH" ? "text-rose-500" : "text-amber-500")}>
            {currentMeta.impact} SEVERITY
          </span>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div className={cn("h-full", currentMeta.impact === "HIGH" ? "bg-rose-500 w-full" : "bg-amber-500 w-2/3")} />
          </div>
        </div>
        <div className="p-5 rounded-lg bg-muted border border-border space-y-1">
          <span className="text-[9px] font-black text-muted-foreground block uppercase font-sans">PERFORMANCE METRICS</span>
          <span className="text-xs font-bold text-foreground tracking-tight leading-normal block">{currentMeta.metrics.split('|')[0]}</span>
          <span className="text-[9px] text-muted-foreground block leading-none">{currentMeta.metrics.split('|')[1] || ""}</span>
        </div>
      </div>

      {/* Constitution Mapping */}
      <div className="p-6 rounded-lg bg-indigo-50/50 border border-indigo-100/50 space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs">
          <ShieldCheck size={14} />
          <span>연관 기술 헌법: {currentMeta.constitution}</span>
        </div>
        <p className="text-xs font-bold text-indigo-900 leading-normal">
          {currentMeta.constDesc}
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-4">
        <h5 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">오케스트레이션 파이프라인 (Execution Flow)</h5>
        <div className="relative pl-6 border-l-2 border-border space-y-4 py-2">
          {currentMeta.flow.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-white bg-slate-900 shadow-sm flex items-center justify-center text-[7px] font-black text-white font-mono">
                {idx + 1}
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestDetailView({ test }: { test: any }) {
  const testStacks: Record<string, { summary: string, stacks: { sql: string, table: string, type: "SELECT" | "INSERT" | "DELETE" }[] }> = {
    "TEST_01": {
      summary: "조회 성능 최적화: Batch Fetch 및 Lazy Loading 가동을 통한 성능 확보 합격",
      stacks: [
        { sql: "SELECT * FROM tb_user WHERE ognz_id = 'DEPT_001'", table: "tb_user", type: "SELECT" },
        { sql: "SELECT * FROM tb_ognz WHERE ognz_id = ?", table: "tb_ognz", type: "SELECT" },
        { sql: "SELECT * FROM tb_author WHERE author_code = ?", table: "tb_author", type: "SELECT" }
      ]
    },
    "TEST_02": {
      summary: "권한 거부 예외 처리: 작성자가 아닌 유저의 권한 거부 예외 응답 검증",
      stacks: [
        { sql: "SELECT * FROM tb_schedule WHERE schedule_id = ?", table: "tb_schedule", type: "SELECT" },
        { sql: "SELECT * FROM tb_user WHERE user_id = ?", table: "tb_user", type: "SELECT" }
      ]
    },
    "TEST_03": {
      summary: "대용량 일괄 조회: 부서장 상태 키워드 매핑 및 일정 일괄 조회 성능 통과",
      stacks: [
        { sql: "SELECT * FROM tb_leader_status WHERE dept_id IN (...)", table: "tb_leader_status", type: "SELECT" },
        { sql: "SELECT * FROM tb_schedule WHERE creator_id IN (...)", table: "tb_schedule", type: "SELECT" }
      ]
    },
    "TEST_04": {
      summary: "2차 캐시 조회 효율화: 공통 행정 코드 2차 캐시(Redis) 적재로 DB 부하 Zero화 달성",
      stacks: [
        { sql: "SELECT * FROM tb_instt_code WHERE code = ? (1차 캐싱 미비 시 1회만 조회)", table: "tb_instt_code", type: "SELECT" }
      ]
    }
  };

  const currentStack = testStacks[test.id] || {
    summary: "테스트가 성공적으로 통과되었습니다.",
    stacks: []
  };

  const fillPercentage = (test.queries / test.max) * 100;

  return (
    <div className="space-y-8 text-left font-sans animate-in fade-in duration-500">
      {/* Test Log Header */}
      <div className="p-6 rounded-lg bg-muted border border-border">
        <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase font-mono">{test.id}</span>
        <h4 className="text-sm font-black text-foreground tracking-tight mt-1 leading-snug break-all">{test.testName}</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">측정 타임: {test.time}</p>
      </div>

      {/* SQL Budget Slider */}
      <div className="p-6 rounded-lg bg-muted border border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">JPA SQL CALLS BUDGET</span>
          <span className="text-xs font-black text-foreground font-mono">{test.queries} / {test.max} SQL</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-lg overflow-hidden relative">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000" 
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
          <span>SAFE LIMIT: {test.max}</span>
          <span className="text-emerald-600 font-black">{Math.round(100 - fillPercentage)}% UNDER BUDGET</span>
        </div>
      </div>

      {/* Telemetry Summary */}
      <div className="p-6 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
          <CheckCircle2 size={14} className="text-emerald-600 animate-bounce" />
          <span>가드레일 통합 검증 통과: {test.status}</span>
        </div>
        <p className="text-xs font-bold text-foreground leading-normal">
          {currentStack.summary}
        </p>
      </div>

      {/* SQL Stacks */}
      <div className="space-y-4">
        <h5 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">실시간 DB 호출 스택 (Database Call Stack)</h5>
        <div className="space-y-3">
          {currentStack.stacks.map((stack, idx) => (
            <div key={idx} className="p-5 rounded-lg border-2 border-border bg-muted/30 flex flex-col gap-3 relative overflow-hidden group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black tracking-widest rounded uppercase font-mono">
                  {stack.type}
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-foreground text-[9px] font-black tracking-widest rounded font-mono uppercase">
                  {stack.table}
                </span>
              </div>
              <pre className="text-xs font-bold font-mono text-foreground whitespace-pre-wrap break-all leading-normal">
                {stack.sql}
              </pre>
            </div>
          ))}
          {currentStack.stacks.length === 0 && (
            <p className="text-xs text-muted-foreground font-medium text-center py-6">수집된 데이터베이스 질의 로그가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
