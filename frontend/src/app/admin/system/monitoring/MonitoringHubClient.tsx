'use client';

import { useState, useMemo, useTransition } from 'react';
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
  Zap,
  LogIn,
  Download,
  Trash2,
  ShieldCheck,
  MonitorCheck,
  Database,
  Network,
  CheckCircle2,
  AlertCircle,
  Share2 } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { Skeleton } from '@/components/ui/skeleton';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { commentAdminService } from '@/services/foundation/system/CommentAdminService';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { monitoringAdminService } from '@/services/foundation/system/MonitoringAdminService';
import { motion, AnimatePresence } from 'framer-motion';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
// dynamic fallback 은 실제 차트와 동일 높이를 잡아 청크 도착 시 레이아웃 시프트(CLS)를 없앤다.
const GaugeChart = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.GaugeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-full rounded-lg" />
});
const RealtimeSparkline = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.RealtimeSparkline), {
  ssr: false,
  loading: () => <Skeleton className="h-[110px] w-full rounded-lg" />
});
const SystemStatusRadar = dynamic(() => import('@/app/components/ui/observability-charts').then(mod => mod.SystemStatusRadar), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-lg" />
});

const TopologyMap = dynamic(() => import('@/app/components/ui/topology-map').then(mod => mod.TopologyMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] flex flex-col items-center justify-center bg-surface-inverse rounded-lg space-y-6">
      <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-bold tracking-tight text-white/30 animate-pulse">Initializing Topology Stream...</p>
    </div>
  )
});
import { StandardModal } from '@/app/components/ui/standard-modal';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SampleDataBadge, NavButton, StatusIndicator, HarnessDashboardOverview, SkillDetailView, TestDetailView } from './components/MonitoringPanels';
import { LOGIN_LOG_EXPORT_HEADERS } from './log-export-headers';

export type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS' | 'TOPOLOGY' | 'HARNESS';

const MONITORING_TABS: MonitoringTab[] = ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY', 'COMMENTS', 'TOPOLOGY', 'HARNESS'];

/** 목록 탭(서버 데이터 조회 + 페이저를 쓰는 탭) 여부 */
const LIST_TABS: MonitoringTab[] = ['SECURITY', 'SYSTEM', 'LOGIN', 'COMMENTS'];

const PAGE_SIZE = 50;

/**
 * 에이전트 하네스 아틀라스의 스킬 카탈로그.
 * ⚠ 실측 계측이 아니라 저장소의 `.agent/skills/` 목록을 옮겨둔 **정적 카탈로그**다.
 * 과거 이 배열이 렌더 함수와 상세 조회에 각각 중복 정의되어 있어 한쪽만 수정되는 사고가 있었다.
 */
const HARNESS_SKILLS = [
  { id: "SKILL_ENG_01", name: "Deep Context Mapper", desc: "1M+ 대용량 메모리 기반 다중 모듈 및 DB 위상 맵 로드", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_02", name: "API Contract Guardian", desc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마 연쇄 거울 동기화", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_03", name: "OWASP Security Auditor", desc: "Spring Security, Next.js 미들웨어, JWT Red Team 검증", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_04", name: "Resilience Debugger", desc: "DB Bridge 및 로컬 프로세스 좀비 포트 정리 및 자가복구", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_05", name: "Zero-Downtime Planner", desc: "PostgreSQL 스키마 변경 시 무중단 Expand-and-Contract 설계", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_06", name: "Mutation Testing Auditor", desc: "의도적 버그 주입으로 단위/통합 테스트 방어력 실증", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_07", name: "Visual Auditor", desc: "브라우저 subagent 네이티브 픽셀 비교 regression 오디팅", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_08", name: "Docs-as-Code Sync", desc: "로직 변경에 따른 Markdown 가이드 및 Mermaid 다이어그램 동적 갱신", status: "ACTIVE", type: "SKILL" as const }
];

/**
 * JPA 가드레일 계측 예시 로그.
 * ⚠ 실측 소스가 없는 **샘플 데이터**다. 화면에서도 '샘플' 배지로 명시한다.
 */
const HARNESS_SAMPLE_TESTS = [
  { id: "TEST_01", testName: "QueryCountGuardrailIntegrationTest.queryCountGuardrail_successWithinLimit", queries: 12, max: 15, status: "SAFE", time: "방금 전", type: "TEST" as const },
  { id: "TEST_02", testName: "ScheduleServiceTest.deleteSchedule_fail_notCreator", queries: 2, max: 10, status: "SAFE", time: "3분 전", type: "TEST" as const },
  { id: "TEST_03", testName: "NoteServiceImplTest.getReceivedNotes", queries: 4, max: 10, status: "SAFE", time: "8분 전", type: "TEST" as const },
  { id: "TEST_04", testName: "InstitutionCodeServiceTest.verifyCodeRetrievalWithCaching", queries: 1, max: 5, status: "SAFE", time: "15분 전", type: "TEST" as const }
];

/** CSV 반출 컬럼 매핑 — 백엔드 DTO(SysLogDto / LoginLog / CommentDetail)의 실제 필드명을 따른다. */
const SYS_LOG_EXPORT_HEADERS = [
  { label: '시스템 로그 일련번호', key: 'sysLogSn' },
  { label: '요청ID', key: 'dmndId' },
  { label: '서비스명', key: 'srvcNm' },
  { label: '메서드', key: 'methodNm' },
  { label: '처리구분', key: 'prcsSeCd' },
  { label: '요청자', key: 'dmndUserId' },
  { label: '요청IP', key: 'rqesterIp' },
  { label: '발생일자', key: 'ocrnYmd' },
  { label: '처리시간(ms)', key: 'prcsTm' }
];

const COMMENT_EXPORT_HEADERS = [
  { label: '댓글번호', key: 'ansSn' },
  { label: '내용', key: 'ansCn' },
  { label: '작성자ID', key: 'wrterId' },
  { label: '작성자명', key: 'wrterNm' },
  { label: '작성일시', key: 'crtDt' },
  { label: '게시판ID', key: 'bbsId' },
  { label: '게시글ID', key: 'pstSn' }
];

/**
 * 목록 탭의 조회 상태 묶음.
 * 탭마다 행 타입이 달라(SysLogDto / LoginLog / CommentDetail) 단일 제네릭으로 좁힐 수 없으므로,
 * 파일 내 기존 `Column<any>` 규약과 동일하게 느슨한 행 타입을 유지한다.
 */
interface ListTabConfig {
  columns: Column<any>[];
  data: any[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  keyField: string;
  rowId: (item: any) => string | number;
  totalPage: number;
  totalCount?: number;
  searchable: boolean;
  emptyMessage: string;
  exportName: string;
  exportHeaders: { label: string; key: string }[];
  label: string;
}

/** 실측 소스가 없는 위젯에 붙이는 공용 '샘플 데이터' 배지 */
export default function MonitoringHubClient({ defaultTab = 'SECURITY' }: { defaultTab?: MonitoringTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get('tab')?.toUpperCase();
  const queryTab = (rawTab === 'HEALTH' ? 'OBSERVABILITY' : rawTab === 'POLICY' ? 'LOGIN' : rawTab) as MonitoringTab;

  const activeTab = (queryTab && MONITORING_TABS.includes(queryTab))
    ? queryTab
    : defaultTab;

  // [P1-7] 페이지도 URL 파생값으로 둔다 → 공유·새로고침·뒤로가기가 조회 위치까지 복원한다.
  //        (검색어는 개인정보 노출 우려로 URL 에 싣지 않는다 — 감사 D-13 절충안)
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [isPending, startTransition] = useTransition();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // [P1-8] 타이핑 한 글자마다 서버 요청이 나가던 문제 → 300ms 디바운스 후에만 조회한다.
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  /**
   * 현재 경로를 유지한 채 쿼리스트링만 바꾼다.
   * 과거에는 `/admin/system/monitoring` 로 하드코딩 push 해서 `/hub`·`/admin/system/comments`
   * 진입 시 사이드바 활성 메뉴가 풀리고 중복 라우트로 이탈했다(감사 mr-04 / sys-mon-18).
   */
  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  const setActiveTab = (tab: MonitoringTab) => {
    setSelectedItemId(null);
    setSearchKeyword('');
    updateQuery({ tab: tab.toLowerCase(), page: null });
  };

  const setPage = (nextPage: number) => {
    updateQuery({ page: nextPage <= 1 ? null : String(nextPage) });
  };

  /** [P1-8] 검색어 변경 시 페이지를 1로 되돌린다(3페이지에서 검색 → 빈 화면 방지). */
  const handleSearchKeywordChange = (value: string) => {
    setSearchKeyword(value);
    if (page !== 1) setPage(1);
  };

  const { data: auditData, isLoading: isAuditLoading, error: auditError, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-logs', debouncedKeyword, page],
    queryFn: () => auditAdminService.getAuditLogs({ page: page - 1, size: PAGE_SIZE, keyword: debouncedKeyword }),
    enabled: activeTab === 'SECURITY'
  });
  const auditLogs = useMemo(() => auditData?.list || [], [auditData]);

  const { data: systemLogData, isLoading: isSystemLoading, error: systemLogError, refetch: refetchSystemLogs } = useQuery({
    queryKey: ['admin-system-logs', debouncedKeyword, page],
    queryFn: () => systemLogAdminService.getSystemLogs({ page: page - 1, size: PAGE_SIZE, searchWrd: debouncedKeyword }),
    enabled: activeTab === 'SYSTEM'
  });
  const systemLogs = useMemo(() => systemLogData?.list || [], [systemLogData]);

  const { data: loginLogData, isLoading: isLoginLoading, error: loginLogError, refetch: refetchLoginLogs } = useQuery({
    queryKey: ['admin-login-logs', debouncedKeyword, page],
    queryFn: () => systemLogAdminService.getLoginLogs({ page: page - 1, size: PAGE_SIZE, searchWrd: debouncedKeyword }),
    enabled: activeTab === 'LOGIN'
  });
  const loginLogs = useMemo(() => loginLogData?.list || [], [loginLogData]);

  // ⚠ 백엔드 CommentApiController 는 키워드 검색을 지원하지 않는다(CommentAdminService 주석 참조).
  //    따라서 COMMENTS 탭에서는 검색 입력을 렌더하지 않고, queryKey 에도 검색어를 넣지 않는다.
  const { data: commentData, isLoading: isCommentLoading, error: commentError, refetch: refetchComments } = useQuery({
    queryKey: ['admin-comments', page],
    queryFn: () => commentAdminService.getComments({ page: page - 1, size: PAGE_SIZE }),
    enabled: activeTab === 'COMMENTS'
  });
  const comments = useMemo(() => commentData?.list || [], [commentData]);

  // Real-time Metrics Queries
  const { data: healthData, error: healthError, isLoading: isHealthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => monitoringAdminService.getHealth(),
    refetchInterval: 30000,
    enabled: activeTab === 'OBSERVABILITY'
  });

  /**
   * [P1-1] 액추에이터 조회 실패를 '0%'/'정상'으로 위장하지 않는다.
   * ⚠ CPU·메모리 게이지는 `MonitoringAdminService` 가 내부 catch 로 0 을 반환해 실패와 유휴가
   *   구분되지 않는다(서비스 파일 소유자 정정 필요 — `number | null` 반환으로 승격).
   *   여기서는 health 조회 실패를 근거로 액추에이터 미가용을 화면에 명시한다.
   */
  const isActuatorUnavailable = activeTab === 'OBSERVABILITY' && !isHealthLoading && (Boolean(healthError) || !healthData);

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
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '';
      toast(message || '댓글 삭제 중 오류가 발생했습니다.', 'error');
    }
  });

  /**
   * 댓글 삭제(복구 불가·물리 삭제)는 반드시 확인 모달을 거친다.
   * 과거에는 서비스 경로 오조립(404)으로 삭제가 "잠복"해 있었을 뿐, 무확인 1클릭 삭제 구조였다.
   */
  const handleDeleteComment = async (comment: { ansSn?: number | null; ansCn?: string; wrterId?: string }) => {
    if (comment?.ansSn === undefined || comment?.ansSn === null) return;
    const ansSn = comment.ansSn;
    const preview = (comment.ansCn || '').trim();
    const isConfirmed = await confirm({
      title: '댓글 영구 삭제',
      message: `${preview ? `"${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}" ` : ''}댓글(작성자: ${comment.wrterId || '알 수 없음'})을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '영구 삭제',
      variant: 'destructive'
    });
    if (!isConfirmed) return;
    deleteCommentMutation.mutate(ansSn);
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    const idStr = String(selectedItemId);
    if (idStr.startsWith('SKILL_')) {
      return HARNESS_SKILLS.find(s => s.id === idStr) || null;
    }
    if (idStr.startsWith('TEST_')) {
      return HARNESS_SAMPLE_TESTS.find(t => t.id === idStr) || null;
    }
    if (activeTab === 'COMMENTS') return comments.find(c => c.ansSn === selectedItemId);
    if (activeTab === 'SECURITY') return auditLogs.find(l => String(l.sysLogSn) === idStr);
    if (activeTab === 'SYSTEM') return systemLogs.find(l => String(l.sysLogSn) === idStr);
    if (activeTab === 'LOGIN') return loginLogs.find(l => String(l.lgnSn) === idStr);
    return null;
  }, [selectedItemId, activeTab, auditLogs, systemLogs, loginLogs, comments]);

  const auditColumns: Column<any>[] = [
    {
      header: '보안 감사 로그',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.sysLogSn ? "bg-white/10 text-white" : "bg-primary/5 text-primary"
          )}>
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.sysLogSn ? "text-white" : "text-primary")}>{log.srvcNm}</span>
                <span className="text-xs font-bold opacity-20">{log.ocrnYmd?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.sysLogSn ? "text-white" : "text-foreground")}>{log.methodNm}</h4>
          </div>
        </div>
      )
    }
  ];

  const systemLogColumns: Column<any>[] = [
    {
      header: '시스템 로그',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.sysLogSn ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-600"
          )}>
            <Terminal size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.sysLogSn ? "text-white" : "text-emerald-700")}>{log.srvcNm}</span>
                <span className="text-xs font-bold opacity-20">{log.ocrnYmd?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.sysLogSn ? "text-white" : "text-foreground")}>{log.methodNm}</h4>
          </div>
        </div>
      )
    }
  ];

  const loginLogColumns: Column<any>[] = [
    {
      header: '접속 이력',
      accessor: (log) => (
        <div className="flex items-center gap-5 py-2">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === log.lgnSn ? "bg-white/10 text-white" : "bg-amber-50 text-amber-600"
          )}>
            <LogIn size={20} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tracking-tight opacity-40", selectedItemId === log.lgnSn ? "text-white" : "text-amber-700")}>{log.loginId}</span>
                <span className="text-xs font-bold opacity-20">{log.creatDt}</span>
            </div>
            <h4 className={cn("text-sm font-bold tracking-tighter truncate max-w-[280px]", selectedItemId === log.lgnSn ? "text-white" : "text-foreground")}>{log.loginMthd}</h4>
          </div>
        </div>
      )
    }
  ];

  const commentColumns: Column<any>[] = [
    {
      header: '댓글 및 피드백',
      accessor: (c) => (
        <div className="flex items-center gap-5 py-2 w-full pr-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === c.ansSn ? "bg-white/10 text-white" : "bg-hub-indigo/10 text-hub-indigo"
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
                disabled={deleteCommentMutation.isPending}
                onClick={(e) => { e.stopPropagation(); void handleDeleteComment(c); }}
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
      {isActuatorUnavailable && (
        <div role="alert" className="flex items-start gap-4 p-6 rounded-lg border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/40">
          <AlertCircle size={20} aria-hidden="true" className="text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-rose-900 dark:text-rose-300 leading-none">액추에이터 지표를 가져오지 못했습니다</p>
            <p className="text-xs font-medium text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
              아래 CPU·메모리 수치는 <strong>실측값이 아닐 수 있습니다</strong>. 백엔드 `/actuator` 가용 여부를 확인해 주세요.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { void refetchHealth(); }}
              className="h-9 rounded-lg text-xs font-bold"
            >
              다시 시도
            </Button>
          </div>
        </div>
      )}

      {/* 실측(액추에이터) 기반 지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <GaugeChart value={Number(cpuUsage.toFixed(1))} title="CPU_LOAD" unit="%" color="#10B981" />
        <GaugeChart value={Number(memUsage.toFixed(1))} title="MEMORY_ALLOC" unit="%" color="#3B82F6" />
      </div>

      {/*
        [P1-5] 아래 스파크라인 2종과 레이더 차트는 실측 소스가 없는 고정 배열이다.
        삭제 대신 '샘플 데이터' 배지를 명시해 운영 판단 근거로 오인되지 않게 한다(원칙 (c)).
        실제 배선 시 actuator 의 http.server.requests / hikaricp.connections 등으로 교체할 것.
      */}
      <div className="space-y-4 rounded-lg border-2 border-dashed border-amber-200 dark:border-amber-900/40 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">추세 · 다차원 상태(미연동)</h4>
          <SampleDataBadge />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
           title="HEURISTIC_SYSTEM_HEALTH (샘플)"
           data={[
              { subject: '가용성', A: healthData?.status === 'UP' ? 100 : 0 },
              { subject: '보안성', A: 95 },
              { subject: '응답속도', A: 88 },
              { subject: '무결성', A: 100 },
              { subject: '확장성', A: 75 },
              { subject: '안정성', A: 92 },
           ]}
        />
      </div>

      <div className="rounded-lg p-12 bg-surface-inverse text-surface-inverse-foreground shadow-2xl relative overflow-hidden group border-none">
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
            {/* [P1-5] Redis 는 고정 '안정' 표기였으나 실제 health 컴포넌트를 조회하도록 정정.
                액추에이터에 해당 컴포넌트가 없으면 'UNKNOWN'(주황)으로 정직하게 표기된다. */}
            <StatusIndicator label="API Microservices" status={healthData?.status || 'UNKNOWN'} icon={Network} />
            <StatusIndicator label="PostgreSQL Cluster" status={healthData?.components?.db?.status || 'UNKNOWN'} icon={Database} />
            <StatusIndicator label="Redis Cache Fabric" status={healthData?.components?.redis?.status || 'UNKNOWN'} icon={CheckCircle2} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHarness = () => {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-foreground">
        {/* --- Section 1: 8대 독점 네이티브 엔진 리스트 (2열 배치) --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">8대 네이티브 오케스트레이션 엔진</h4>
            <SampleDataBadge />
            <div className="h-px bg-muted flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HARNESS_SKILLS.map((skill, index) => (
              <button
                key={skill.id}
                type="button"
                aria-label={`${skill.name} 엔진 상세 보기`}
                aria-pressed={selectedItemId === skill.id}
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
        <div className="rounded-xl border-2 border-border bg-card p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground leading-none">JPA Performance Guardrail Telemetry</h4>
                {/* '실시간 계측'이라는 표현은 사실이 아니므로 제거 — 아래 목록은 예시 로그다. */}
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">테스트-타임 SQL 쿼리 가드레일 예시 보드</p>
              </div>
            </div>
            <SampleDataBadge />
          </div>

          {/* Test list */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {HARNESS_SAMPLE_TESTS.map(log => (
              <button
                key={log.id}
                type="button"
                aria-label={`${log.testName} 계측 상세 보기`}
                aria-pressed={selectedItemId === log.id}
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
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1 relative">
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

          <div className="p-4 bg-hub-indigo/5 border border-hub-indigo/10 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-card rounded-lg shadow-sm border border-hub-indigo/20 text-primary shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="space-y-0.5">
              <h6 className="text-xs font-bold text-hub-indigo uppercase tracking-tight leading-none">Shift-Left Quality Assurance</h6>
              <p className="text-[10px] font-bold text-hub-indigo leading-tight">
                테스트 가동 시 스레드 로컬 카운터가 데이터베이스 질의를 자동 카운팅하며, 임계값 초과 시 즉각 테스트를 강제 실패시켜 N+1 발생을 실시간 경보합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 현재 탭의 목록 상태(데이터·로딩·오류·재시도·페이저·반출 스키마)를 한 곳에 모은다.
   * 과거에는 4중 삼항 연산자가 prop 마다 반복돼 error/onRetry 를 붙일 자리가 없었고,
   * 그 결과 404·500 이 전부 '데이터가 없습니다'로 위장됐다(감사 P1-1 / sys-mon-05).
   */
  const listConfig: ListTabConfig | null = LIST_TABS.includes(activeTab)
    ? ((): ListTabConfig => {
        switch (activeTab) {
          case 'SYSTEM':
            return {
              columns: systemLogColumns,
              data: systemLogs,
              loading: isSystemLoading,
              error: systemLogError,
              refetch: () => { void refetchSystemLogs(); },
              keyField: 'sysLogSn',
              rowId: (item: any) => item.sysLogSn,
              totalPage: systemLogData?.totalPage || 1,
              totalCount: systemLogData?.total,
              searchable: true,
              emptyMessage: '조회 조건에 해당하는 시스템 로그가 없습니다.',
              exportName: '시스템로그',
              exportHeaders: SYS_LOG_EXPORT_HEADERS,
              label: '시스템 로그 엔진'
            };
          case 'LOGIN':
            return {
              columns: loginLogColumns,
              data: loginLogs,
              loading: isLoginLoading,
              error: loginLogError,
              refetch: () => { void refetchLoginLogs(); },
              keyField: 'lgnSn',
              rowId: (item: any) => item.lgnSn,
              totalPage: loginLogData?.totalPage || 1,
              totalCount: loginLogData?.total,
              searchable: true,
              emptyMessage: '조회 조건에 해당하는 접속 이력이 없습니다.',
              exportName: '접속이력',
              exportHeaders: LOGIN_LOG_EXPORT_HEADERS,
              label: '인증 접속 히스토리'
            };
          case 'COMMENTS':
            return {
              columns: commentColumns,
              data: comments,
              loading: isCommentLoading,
              error: commentError,
              refetch: () => { void refetchComments(); },
              keyField: 'ansSn',
              rowId: (item: any) => item.ansSn,
              totalPage: commentData?.totalPage || 1,
              totalCount: commentData?.total,
              // 백엔드가 댓글 키워드 검색을 지원하지 않아 검색 입력을 노출하지 않는다.
              searchable: false,
              emptyMessage: '등록된 댓글이 없습니다.',
              exportName: '댓글목록',
              exportHeaders: COMMENT_EXPORT_HEADERS,
              label: '서비스 피드백 관리'
            };
          case 'SECURITY':
          default:
            return {
              columns: auditColumns,
              data: auditLogs,
              loading: isAuditLoading,
              error: auditError,
              refetch: () => { void refetchAudit(); },
              keyField: 'sysLogSn',
              rowId: (item: any) => item.sysLogSn,
              totalPage: auditData?.totalPage || 1,
              totalCount: auditData?.total,
              searchable: true,
              emptyMessage: '조회 조건에 해당하는 감사 로그가 없습니다.',
              exportName: '보안감사로그',
              exportHeaders: SYS_LOG_EXPORT_HEADERS,
              label: '보안 감사 매트릭스'
            };
        }
      })()
    : null;

  /**
   * [P2] 인자 없는 `invalidateQueries()` 는 메뉴·알림까지 앱 전역 쿼리를 재요청한다.
   * 현재 탭의 쿼리만 다시 가져오도록 좁힌다.
   */
  const handleRefreshActiveTab = () => {
    if (listConfig) {
      listConfig.refetch();
      return;
    }
    if (activeTab === 'OBSERVABILITY') {
      void queryClient.invalidateQueries({ queryKey: ['admin-health'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics-cpu'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics-mem'] });
    }
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
        subtitle="전사 인프라 로깅 프로토콜 및 데이터 무결성 관찰 시스템"
        icon={Activity}
        actions={
          // [P1-6] 핸들러가 없던 '알림 정책' 버튼 제거(백엔드 알림 정책 API 부재).
          //        '리포트 스냅샷'은 삭제 대신 실제 CSV 반출(DataExportExcel)로 배선했다.
          <div className="flex gap-4 p-2">
            <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="h-11 px-8 rounded-lg border-2 border-border bg-card text-foreground font-bold text-xs tracking-tight gap-3 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-sm flex items-center justify-center group outline-none cursor-pointer"
            >
              <Download size={18} aria-hidden="true" className="group-hover:translate-y-0.5 transition-transform shrink-0" />
              <span>리포트 스냅샷</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 px-2 min-h-[900px]">
        {/* --- Navigation Side Panel --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8 h-fit lg:sticky lg:top-8">
          {/* [P2] 수제 탭에 WAI-ARIA 탭 시맨틱 부여 — 스크린리더가 '탭 3/7'로 읽고 방향키 탐색이 가능해진다. */}
          <div
            role="tablist"
            aria-label="모니터링 허브 영역 선택"
            aria-orientation="vertical"
            className="rounded-lg p-4 bg-card/40 backdrop-blur-xl border-2 border-border shadow-xl space-y-3"
          >
            <NavButton tab="SECURITY" icon={<ShieldAlert size={22} />} label="보안 감사 매트릭스" active={activeTab === 'SECURITY'} onClick={() => setActiveTab('SECURITY')} />
            <NavButton tab="SYSTEM" icon={<Terminal size={22} />} label="시스템 로그 엔진" active={activeTab === 'SYSTEM'} onClick={() => setActiveTab('SYSTEM')} />
            <NavButton tab="LOGIN" icon={<LogIn size={22} />} label="인증 접속 히스토리" active={activeTab === 'LOGIN'} onClick={() => setActiveTab('LOGIN')} />
            <NavButton tab="OBSERVABILITY" icon={<MonitorCheck size={22} />} label="인프라 가동성 정보" active={activeTab === 'OBSERVABILITY'} onClick={() => setActiveTab('OBSERVABILITY')} />
            <NavButton tab="TOPOLOGY" icon={<Share2 size={22} />} label="인프라 토폴로지 맵" active={activeTab === 'TOPOLOGY'} onClick={() => setActiveTab('TOPOLOGY')} />
            <NavButton tab="HARNESS" icon={<Zap size={22} className={activeTab === 'HARNESS' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} />} label="에이전트 하네스 아틀라스" active={activeTab === 'HARNESS'} onClick={() => setActiveTab('HARNESS')} />
            <NavButton tab="COMMENTS" icon={<MessageSquare size={22} />} label="서비스 피드백 관리" active={activeTab === 'COMMENTS'} onClick={() => setActiveTab('COMMENTS')} />
          </div>

          {/*
            [P1-5] '보안 수준: 최상' 고정 문구 제거 — 어떤 보안 계측도 하지 않으면서
            운영자에게 상시 안전 신호를 주던 근거 없는 지표였다.
            권한 정책 실 관리 화면으로 이동하는 딥링크로 대체한다(P1-6 '권한 설정' 배선 규약).
          */}
          <div className="bg-surface-inverse text-surface-inverse-foreground rounded-lg p-10 space-y-6 text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="w-20 h-11 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner transition-transform hover:rotate-12 duration-500">
              <ShieldCheck size={40} className="text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tighter">감사 프로토콜</h3>
                <p className="text-xs font-bold text-white/40 tracking-tight leading-relaxed">
                  로그·접속 이력은 좌측 탭에서 조회합니다.<br />권한 부여 정책은 별도 화면에서 관리합니다.
                </p>
            </div>
            <Link
              href="/admin/security/authority"
              className="text-xs font-bold tracking-tight px-6 py-3 rounded-lg bg-white/10 hover:bg-primary hover:text-white transition-colors"
            >
              권한 정책 관리로 이동
            </Link>
          </div>
        </div>

        {/* --- Central Intelligence Stream --- */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 h-full">
          <div
            role="tabpanel"
            id={`monitoring-panel-${activeTab}`}
            aria-labelledby={`monitoring-tab-${activeTab}`}
            className="rounded-lg bg-card border-2 border-border shadow-2xl flex-1 flex flex-col p-12 space-y-10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border pb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-muted-foreground tracking-tight">데이터 스트림</h3>
                <p className="text-2xl font-bold tracking-tighter text-foreground">인베스티게이션</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="데이터 스트림 새로고침"
                onClick={handleRefreshActiveTab}
                className="h-11 w-14 rounded-lg bg-muted hover:bg-primary hover:text-white transition-all shadow-inner group"
              >
                <RefreshCcw size={20} aria-hidden="true" className="group-active:rotate-180 transition-transform duration-500" />
              </Button>
            </div>

            {/*
              [P1-8] 검색은 디바운스된 값으로만 서버에 나간다.
              COMMENTS 탭은 백엔드가 키워드 검색을 지원하지 않아(입력해도 결과 불변) 입력 자체를 노출하지 않는다.
            */}
            {listConfig?.searchable && (
              <div className="relative group/search z-10">
                <Search aria-hidden="true" className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  className="pl-16 h-11 bg-muted border-none rounded-lg text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                  placeholder="서비스명·메서드·계정 검색.."
                  aria-label="로그 검색어"
                  value={searchKeyword}
                  onChange={(e) => handleSearchKeywordChange(e.target.value)}
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
                  {activeTab === 'OBSERVABILITY' ? renderObservability() : activeTab === 'TOPOLOGY' ? <TopologyMap /> : activeTab === 'HARNESS' ? renderHarness() : listConfig ? (
                    <StandardDataTable
                        columns={listConfig.columns}
                        data={listConfig.data}
                        loading={listConfig.loading || isPending}
                        /* [P1-1] 조회 실패를 '데이터가 없습니다'로 위장하지 않는다 — 오류 + 재시도 노출 */
                        error={listConfig.error}
                        onRetry={listConfig.refetch}
                        onRowClick={(item) => setSelectedItemId(listConfig.rowId(item))}
                        keyField={listConfig.keyField}
                        isPremium={false}
                        className="bg-transparent border-none shadow-none"
                        emptyMessage={listConfig.emptyMessage}
                        pagination={{
                            currentPage: page,
                            totalPages: listConfig.totalPage,
                            totalCount: listConfig.totalCount,
                            pageSize: PAGE_SIZE,
                            onPageChange: (p) => setPage(p)
                        }}
                    />
                  ) : null}
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
                <div className="rounded-lg bg-card border-2 border-border shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-14 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="border-b border-border pb-12 relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                        <h3 className="text-xs font-bold text-muted-foreground tracking-tight">
                          {selectedItem && (selectedItem as any).type === 'SKILL' ? '아틀라스 엔진 명세' : selectedItem && (selectedItem as any).type === 'TEST' ? 'JPA SQL 계측 예시' : '인스턴스 메타데이터'}
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

                  {/* [P1-6] 핸들러가 없던 '유지보수 파이프라인 실행' 버튼과 '결정 매트릭스' 장식 제거
                       (백엔드에 대응 엔드포인트가 없어 클릭해도 아무 일도 일어나지 않았다). */}

                  <div className="absolute left-0 top-0 w-full h-2 bg-primary/10" />
                </div>
              </motion.div>
            ) : activeTab === 'HARNESS' ? (
              <HarnessDashboardOverview />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40 select-none grayscale rounded-lg border-4 border-dashed border-border bg-muted/50 group transition-all hover:bg-card hover:border-primary/20 duration-1000">
                <div className="w-24 h-24 rounded-lg bg-card border-2 border-border flex items-center justify-center mb-10 shadow-xl group-hover:rotate-12 transition-transform duration-700">
                    <Activity size={100} aria-hidden="true" className="text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
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
         {/*
            [P1-6] '리포트 스냅샷'은 과거 PDF/XLSX 생성을 약속하고 아무 핸들러도 없는 껍데기였다
            (진행 바까지 그려 생성 중인 것처럼 보였다). 백엔드 리포트 엔드포인트가 없으므로,
            이미 동작이 검증된 CSV 반출 컴포넌트(DataExportExcel, UTF-8 BOM)로 실제 기능을 부여한다.
         */}
         <div className="p-10 space-y-8 font-sans">
            <div className="space-y-2">
               <h4 className="text-sm font-bold text-foreground tracking-tight">현재 조회 결과 반출</h4>
               <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  {listConfig
                    ? `‘${listConfig.label}’ 탭에서 현재 조회된 ${listConfig.data.length}건을 엑셀(CSV · UTF-8 BOM)로 내려받습니다. 서버 전량 반출은 지원하지 않으며, 페이지를 이동한 뒤 다시 실행하면 해당 페이지가 반출됩니다.`
                    : '현재 탭은 목록 데이터가 없어 반출할 수 없습니다. 보안 감사·시스템 로그·접속 이력·서비스 피드백 탭에서 실행해 주세요.'}
               </p>
            </div>

            {listConfig && listConfig.data.length > 0 ? (
               <DataExportExcel
                  data={listConfig.data}
                  headers={listConfig.exportHeaders}
                  filename={listConfig.exportName}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight hover:bg-primary transition-all"
               />
            ) : (
               <div className="p-6 rounded-lg border-2 border-dashed border-border bg-muted/40 text-xs font-bold text-muted-foreground text-center">
                  반출할 데이터가 없습니다.
               </div>
            )}

            <div className="flex gap-4">
               <Button variant="outline" onClick={() => setIsReportModalOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight">
                  닫기
               </Button>
            </div>
         </div>
      </StandardModal>
    </div>
  );
}

