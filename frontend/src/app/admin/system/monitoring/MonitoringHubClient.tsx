'use client';

import { useState, useMemo, useRef, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
;
import { Button } from '@/components/ui/button';
;
import {
  ShieldAlert,
  Terminal,
  MessageSquare,
  RefreshCcw,
  Zap,
  LogIn,
  Download,
  Trash2,
  MonitorCheck,
  Database,
  Network,
  CheckCircle2,
  AlertCircle,
  Share2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { Skeleton } from '@/components/ui/skeleton';
import { auditAdminService } from '@/services/foundation/system/AuditAdminService';
import { commentAdminService } from '@/services/foundation/system/CommentAdminService';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { monitoringAdminService } from '@/services/foundation/system/MonitoringAdminService';
import { attachmentIntegrityService } from '@/services/foundation/system/AttachmentIntegrityService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
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
      <p className="text-xs font-bold tracking-tight text-white/30 animate-pulse">구성도를 불러오는 중입니다…</p>
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

/** 페이지당 건수 기본값. 사용자가 바꾸면 화면 상태가 이긴다(A1 필수 — 페이지당 건수 선택). */
const DEFAULT_PAGE_SIZE = 50;

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
  // [2026-08-27] POLICY → LOGIN 별칭 제거. 이 허브에는 POLICY 탭이 없는데 별칭이 그 요청을
  //   LOGIN(로그인 **로그** 목록)으로 떨어뜨려, 정책을 열려던 사용자가 로그 목록을 보고도
  //   자기가 다른 화면에 있다는 것을 알 수 없었다. 로그인 정책의 정본은
  //   /admin/security/login-policy 이고 개인정보 정책은 /admin/user/indvdl-info-policy 다.
  //   이제 ?tab=policy 는 어떤 탭에도 맞지 않아 기본 탭으로 내려간다 — 없는 탭을 있는 척하지 않는다.
  const queryTab = (rawTab === 'HEALTH' ? 'OBSERVABILITY' : rawTab) as MonitoringTab;

  const activeTab = (queryTab && MONITORING_TABS.includes(queryTab))
    ? queryTab
    : defaultTab;

  // [P1-7] 페이지도 URL 파생값으로 둔다 → 공유·새로고침·뒤로가기가 조회 위치까지 복원한다.
  //        (검색어는 개인정보 노출 우려로 URL 에 싣지 않는다 — 감사 D-13 절충안)
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [isPending, startTransition] = useTransition();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
  /* 페이지당 건수는 URL 에 싣지 않는다 — 새 query producer 를 만들지 않는다는 기존 계약을 따른다. */
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const deleteCommentPendingRef = useRef(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // [P1-8] 타이핑 한 글자마다 서버 요청이 나가던 문제 → 300ms 디바운스 후에만 조회한다.


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
    setPeriod(EMPTY_PERIOD);
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
    queryKey: ['admin-audit-logs', searchKeyword, page, pageSize, periodToParams(period)],
    queryFn: () => auditAdminService.getAuditLogs({
      page: page - 1,
      size: pageSize,
      // 서버는 BaseSearchDto.searchKeyword 로 바인딩한다 — `keyword` 는 무시됐다.
      searchKeyword,
      ...periodToParams(period),
    }),
    enabled: activeTab === 'SECURITY'
  });
  const auditLogs = useMemo(() => auditData?.list || [], [auditData]);

  const { data: systemLogData, isLoading: isSystemLoading, error: systemLogError, refetch: refetchSystemLogs } = useQuery({
    queryKey: ['admin-system-logs', searchKeyword, page, pageSize, periodToParams(period)],
    queryFn: () => systemLogAdminService.getSystemLogs({
      page: page - 1,
      size: pageSize,
      searchWrd: searchKeyword,
      ...periodToParams(period),
    }),
    enabled: activeTab === 'SYSTEM'
  });
  const systemLogs = useMemo(() => systemLogData?.list || [], [systemLogData]);

  const { data: loginLogData, isLoading: isLoginLoading, error: loginLogError, refetch: refetchLoginLogs } = useQuery({
    queryKey: ['admin-login-logs', searchKeyword, page, pageSize, periodToParams(period)],
    queryFn: () => systemLogAdminService.getLoginLogs({
      page: page - 1,
      size: pageSize,
      searchWrd: searchKeyword,
      ...periodToParams(period),
    }),
    enabled: activeTab === 'LOGIN'
  });
  const loginLogs = useMemo(() => loginLogData?.list || [], [loginLogData]);

  // ⚠ 백엔드 CommentApiController 는 키워드 검색을 지원하지 않는다(CommentAdminService 주석 참조).
  //    따라서 COMMENTS 탭에서는 검색 입력을 렌더하지 않고, queryKey 에도 검색어를 넣지 않는다.
  const { data: commentData, isLoading: isCommentLoading, error: commentError, refetch: refetchComments } = useQuery({
    queryKey: ['admin-comments', page, pageSize],
    queryFn: () => commentAdminService.getComments({ page: page - 1, size: pageSize }),
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

  /**
   * 첨부 정합성 점검 — DB 레코드와 저장소 실물 대조.
   *
   * ⚠ 주기 조회를 걸지 않는다(`enabled: false`). 이 점검은 첨부를 <b>전량</b> 훑으므로
   * 배경에서 30초마다 돌면 진단이 그 자체로 부하가 된다. 관리자가 누를 때만 실행한다.
   */
  const {
    data: integrityReport,
    error: integrityError,
    isFetching: isIntegrityRunning,
    refetch: runIntegrityScan,
  } = useQuery({
    queryKey: ['admin-attachment-integrity'],
    queryFn: () => attachmentIntegrityService.scan(),
    enabled: false,
    retry: false,
    gcTime: 0,
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
    if (comment?.ansSn === undefined || comment?.ansSn === null || deleteCommentPendingRef.current) return;
    const ansSn = comment.ansSn;
    deleteCommentPendingRef.current = true;
    setDeletingCommentId(ansSn);
    try {
      const preview = (comment.ansCn || '').trim();
      const isConfirmed = await confirm({
        title: '댓글 영구 삭제',
        message: `${preview ? `"${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}" ` : ''}댓글(작성자: ${comment.wrterId || '알 수 없음'})을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmText: '영구 삭제',
        variant: 'destructive'
      });
      if (!isConfirmed) return;
      try {
        await deleteCommentMutation.mutateAsync(ansSn);
      } catch {
        // mutation onError가 오류 안내를 소유하며 선택된 댓글은 그대로 보존한다.
      }
    } finally {
      deleteCommentPendingRef.current = false;
      setDeletingCommentId(null);
    }
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
                aria-label={deletingCommentId === c.ansSn ? '댓글 삭제 중' : '댓글 삭제'}
                aria-busy={deletingCommentId === c.ansSn || undefined}
                disabled={deletingCommentId !== null}
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

      {/*
        [2026-08-26] DB↔저장소 정합성.
        DB 와 파일 저장소는 분리 운영이 정상이고 어긋나는 것도 정상 운영에서 생긴다
        (저장소 경로 변경·다른 환경 DB 연결·백업 복원 시점 불일치). 문제는 어긋났을 때
        알 방법이 없어 사용자가 깨진 이미지로 먼저 발견했다는 점이다. 여기서 먼저 본다.
      */}
      <div className="space-y-4 rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">
              첨부 정합성 (DB ↔ 저장소)
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              첨부 레코드와 저장소 실물을 대조합니다. 전량을 훑으므로 누를 때만 실행됩니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { void runIntegrityScan(); }}
            disabled={isIntegrityRunning}
            className="h-9 rounded-lg text-xs font-bold shrink-0"
          >
            {isIntegrityRunning ? '점검 중…' : '점검 실행'}
          </Button>
        </div>

        {integrityError && (
          <div role="alert" className="text-xs font-medium text-destructive-emphasis">
            점검을 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {integrityReport && !integrityError && (
          integrityReport.missing === 0 ? (
            <p role="status" className="text-xs font-bold text-success-emphasis">
              첨부 {integrityReport.checked.toLocaleString()}건 모두 저장소에 실물이 있습니다.
            </p>
          ) : (
            <div role="alert" className="space-y-3">
              <p className="text-xs font-bold text-destructive-emphasis">
                첨부 {integrityReport.checked.toLocaleString()}건 중{' '}
                <strong>{integrityReport.missing.toLocaleString()}건</strong>이 저장소에 없습니다.
                저장소 설정이 바뀌었거나 파일이 유실됐습니다.
              </p>
              {/*
                레코드를 자동으로 지우지 않는다 — 실물이 없는 이유가 '유실' 일 수도
                '저장소 설정이 잠깐 틀렸다' 일 수도 있는데, 후자에서 지우면 복구 가능한
                상황을 복구 불가능하게 만든다. 화면은 대상만 알려주고 판단은 사람이 한다.
              */}
              {integrityReport.samples.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                    조치 대상 예시 (최대 {integrityReport.samples.length}건)
                  </p>
                  <ul className="max-h-48 overflow-y-auto rounded border border-border bg-muted/40 p-3 space-y-1">
                    {integrityReport.samples.map((sample) => (
                      <li key={sample} className="text-[11px] font-mono text-muted-foreground break-all">
                        {sample}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}

        {/*
          [2026-08-29] 역방향 — 저장소에는 있는데 DB 레코드가 없는 실물.
          ⚠ '고아' 가 아니라 '후보' 로 부른다. 업로드는 실물을 먼저 쓰고 트랜잭션이 커밋돼야
            행이 보이므로, 커밋 전 파일과 진짜 고아는 저장소에서 완전히 같은 모습이다.
            확정처럼 말하면 사람이 살아 있는 업로드를 지운다.
        */}
        {integrityReport && !integrityError && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              저장소 → DB 역방향
            </p>
            <p className="text-xs font-medium text-muted-foreground break-all">
              훑은 범위: <span className="font-mono">{integrityReport.storageRoot}</span>
            </p>
            {integrityReport.orphanCandidates === 0 && integrityReport.undecidable === 0 ? (
              <p role="status" className="text-xs font-bold text-success-emphasis">
                저장소 실물 {integrityReport.storedFilesChecked.toLocaleString()}건 모두 DB 레코드가 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">
                  저장소 실물 {integrityReport.storedFilesChecked.toLocaleString()}건 중{' '}
                  <strong>{integrityReport.orphanCandidates.toLocaleString()}건</strong>이 DB 레코드를 찾지 못했고,{' '}
                  <strong>{integrityReport.undecidable.toLocaleString()}건</strong>은 판정하지 않았습니다.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  후보는 <strong>업로드가 아직 커밋되지 않은 파일일 수 있습니다.</strong> 지우기 전에
                  시간을 두고 다시 점검해 같은 항목이 남는지 확인해 주세요. 판정하지 않은 항목은
                  옛 저장 규약이라 이 점검이 대응 레코드를 찾을 수 없는 것이며, 고아라는 뜻이 아닙니다.
                </p>
                {integrityReport.orphanSamples.length > 0 && (
                  <ul className="max-h-48 overflow-y-auto rounded border border-border bg-muted/40 p-3 space-y-1">
                    {integrityReport.orphanSamples.map((sample) => (
                      <li key={sample} className="text-[11px] font-mono text-muted-foreground break-all">
                        {sample}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

  const TAB_DESCRIPTION: Record<MonitoringTab, string> = {
    SECURITY: '보안 감사 로그를 조회합니다. 한 건을 선택하면 아래에 상세가 표시됩니다.',
    SYSTEM: '시스템 로그를 조회합니다. 한 건을 선택하면 아래에 상세가 표시됩니다.',
    LOGIN: '사용자 접속 이력을 조회합니다. 한 건을 선택하면 아래에 상세가 표시됩니다.',
    COMMENTS: '서비스에 등록된 사용자 의견을 조회하고 관리합니다.',
    OBSERVABILITY: '애플리케이션 가동 상태와 자원 사용량을 조회합니다.',
    TOPOLOGY: '연동된 계측 소스가 있을 때 인프라 구성도를 표시합니다.',
    HARNESS: '에이전트 하네스의 스킬·검증 자산을 조회합니다.',
  };

  const NAV_ITEMS: Array<{ tab: MonitoringTab; icon: React.ReactNode; label: string }> = [
    { tab: 'SECURITY', icon: <ShieldAlert size={14} />, label: '보안 감사 매트릭스' },
    { tab: 'SYSTEM', icon: <Terminal size={14} />, label: '시스템 로그 엔진' },
    { tab: 'LOGIN', icon: <LogIn size={14} />, label: '인증 접속 히스토리' },
    { tab: 'OBSERVABILITY', icon: <MonitorCheck size={14} />, label: '인프라 가동성 정보' },
    { tab: 'TOPOLOGY', icon: <Share2 size={14} />, label: '인프라 토폴로지 맵' },
    { tab: 'HARNESS', icon: <Zap size={14} />, label: '에이전트 하네스 아틀라스' },
    { tab: 'COMMENTS', icon: <MessageSquare size={14} />, label: '서비스 피드백 관리' },
  ];

  /** 선택 항목의 상세. 종전에는 우측 3열 패널이었고, 미선택 시 '인텔리전스 대기 중' 장식이 자리를 채웠다. */
  const detailKind = selectedItem && (selectedItem as any).type === 'SKILL'
    ? 'SKILL'
    : selectedItem && (selectedItem as any).type === 'TEST' ? 'TEST' : 'RECORD';

  return (
    <>
    <WorkListPage
      title="시스템 인텔리전스 거버넌스"
      description={TAB_DESCRIPTION[activeTab]}
      breadcrumbItems={[{ label: '시스템관리' }, { label: '모니터링 허브' }]}
      filterStateKey="system-monitoring"
      totalCount={listConfig && !listConfig.error ? listConfig.totalCount : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* 종전에는 좌측 3열을 통째로 쓰던 세로 내비게이션이었다. 영역 전환은 조회 조건이 아니라
              조회 대상 전환이라 헤더에 두고, 본문 폭을 데이터에 돌려준다. */}
          <div
            role="tablist"
            aria-label="모니터링 허브 영역 선택"
            className="flex flex-wrap rounded-md border border-border p-0.5"
          >
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.tab}
                tab={item.tab}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.tab}
                onClick={() => setActiveTab(item.tab)}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsReportModalOpen(true)}>
            <Download size={16} aria-hidden="true" /> 리포트 스냅샷
          </Button>
        </div>
      }
      filter={
        /* COMMENTS 탭은 백엔드가 키워드 검색을 지원하지 않아(입력해도 결과 불변) 입력 자체를 노출하지 않는다. */
        listConfig?.searchable ? (
          /*
            [2026-08-29] 라벨 하나가 세 탭에 공유되는데 **탭마다 서버 술어가 다르다.**
            - SECURITY·SYSTEM 탭: 둘 다 /logs/system 을 부르고, 술어는
              `srvcNm.contains OR dmndId.contains` 다(SysLogRepositoryImpl).
            - LOGIN 탭: /logs/login 이고 술어는 `userId.contains OR lgnIpAddr.contains` 다
              (LoginLogRepositoryImpl).
            종전 '서비스명 · 메서드 · 계정' 은 어느 탭에서도 사실이 아니었다 — 메서드로도
            계정으로도 걸리지 않고, 로그인 탭에서는 서비스명조차 축이 아니다. 조회 조건이
            틀려도 오류가 나지 않고 빈 결과만 나오므로 "그 계정 기록이 없다" 로 오독된다.
          */
          <KeywordFilter
            label={activeTab === 'LOGIN' ? '사용자ID · 접속IP' : '서비스명 · 요청ID'}
            placeholder={activeTab === 'LOGIN' ? '사용자ID, 접속IP 검색' : '서비스명, 요청ID 검색'}
            value={searchKeyword}
            onSearch={handleSearchKeywordChange}
          >
            <PeriodFilter
              label="조회 기간(발생일자)"
              value={period}
              onChange={(next) => { setPeriod(next); setPage(1); }}
            />
          </KeywordFilter>
        ) : undefined
      }
      toolbarActions={
        <Button
          variant="outline"
          size="sm"
          aria-label="데이터 스트림 새로고침"
          onClick={handleRefreshActiveTab}
        >
          <RefreshCcw size={16} aria-hidden="true" />
        </Button>
      }
    >
      <div
        role="tabpanel"
        id="monitoring-panel"
        aria-labelledby={`monitoring-tab-${activeTab}`}
        className="space-y-4"
      >
        {activeTab === 'OBSERVABILITY' ? renderObservability()
          : activeTab === 'TOPOLOGY' ? <TopologyMap />
          : activeTab === 'HARNESS' ? renderHarness()
          : listConfig ? (
            <StandardDataTable
              columns={listConfig.columns}
              data={listConfig.data}
              loading={listConfig.loading || isPending}
              /* [P1-1] 조회 실패를 '데이터가 없습니다'로 위장하지 않는다 — 오류 + 재시도 노출 */
              error={listConfig.error}
              onRetry={listConfig.refetch}
              onRowClick={(item) => setSelectedItemId(listConfig.rowId(item))}
              rowActionLabel={(item) => `${listConfig.label} ${String(listConfig.rowId(item))} 상세 열기`}
              keyField={listConfig.keyField}
              emptyMessage={listConfig.searchable
                ? emptyResultMessage(searchKeyword, listConfig.emptyMessage)
                : listConfig.emptyMessage}
              pagination={{
                currentPage: page,
                totalPages: listConfig.totalPage,
                // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
                pageSize,
                onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
                onPageChange: (p) => setPage(p)
              }}
            />
          ) : null}

        {/* 하네스 탭은 선택 전에도 자체 요약을 갖는다(빈 자리를 채우는 장식이 아니라 그 탭의 내용이다). */}
        {activeTab === 'HARNESS' && !selectedItem && <HarnessDashboardOverview />}

        {selectedItem && (
          <section
            aria-label="선택 항목 상세"
            className="rounded-md border border-border bg-card"
          >
            <header className="flex items-start justify-between gap-2 border-b border-border p-[var(--filter-pad)]">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {detailKind === 'SKILL' ? '엔진 아키텍처'
                    : detailKind === 'TEST' ? '가드레일 검증'
                      : '선택 항목 상세'}
                </h2>
                <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
                  식별자 {selectedItemId}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>닫기</Button>
            </header>
            <div className="p-[var(--filter-pad)]">
              {detailKind === 'SKILL' ? (
                <SkillDetailView skill={selectedItem as any} />
              ) : detailKind === 'TEST' ? (
                <TestDetailView test={selectedItem as any} />
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-border bg-muted p-3 text-xs text-foreground">
                  {JSON.stringify(selectedItem, null, 2)}
                </pre>
              )}
            </div>
          </section>
        )}
      </div>
    </WorkListPage>

      <StandardModal 
         isOpen={isReportModalOpen} 
         onClose={() => setIsReportModalOpen(false)} 
         title="현재 조회 결과 반출"
         maxWidth="xl"
      >
         {/*
            [P1-6] '리포트 스냅샷'은 과거 PDF/XLSX 생성을 약속하고 아무 핸들러도 없는 껍데기였다
            (진행 바까지 그려 생성 중인 것처럼 보였다). 백엔드 리포트 엔드포인트가 없으므로,
            이미 동작이 검증된 CSV 반출 컴포넌트(DataExportExcel, UTF-8 BOM)로 실제 기능을 부여한다.
         */}
         <div className="p-10 space-y-8 font-sans">
            <div className="space-y-2">
               {/* 다이얼로그 제목이 이미 같은 문구를 소유한다 — 소제목을 중복시키면
                   같은 텍스트가 두 번 잡혀 접근 이름이 모호해진다(CI e2e strict-mode 위반 실측). */}
               <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  {listConfig
                    ? `‘${listConfig.label}’ 탭에서 현재 조회된 ${listConfig.data.length}건을 엑셀(CSV · UTF-8 BOM)로 내려받습니다. 이 모달은 현재 페이지만 반출하며, 페이지를 이동한 뒤 다시 실행하면 해당 페이지가 반출됩니다.`
                    : '현재 탭은 목록 데이터가 없어 반출할 수 없습니다. 보안 감사·시스템 로그·접속 이력·서비스 피드백 탭에서 실행해 주세요.'}
               </p>
            </div>

            {listConfig && listConfig.data.length > 0 ? (
               <DataExportExcel
            scope="page"
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
    </>
  );
}

