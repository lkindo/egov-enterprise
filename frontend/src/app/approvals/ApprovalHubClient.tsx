'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { Check, X, User, Calendar, Info, Plus, RefreshCcw, Trash2, MessageSquareReply, Copy, PencilLine, Keyboard, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalConfirmRequestSchema } from '@/types/generated-zod';
import {
  SANCTION_STATUS,
  type InformalSanctionDto,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';
import { Badge } from '@/components/ui/badge';
import { PagePagination } from '@/components/common/PagePagination';
import { usePageClamp } from '@/lib/hooks/use-page-clamp';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { PeriodFilter, EMPTY_PERIOD, type PeriodValue } from '@/app/components/patterns/period-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { ApprovalStepper } from './ApprovalStepper';
import { ApprovalDraftDialog } from './ApprovalDraftDialog';
import { ApprovalCollaborationPanel } from './ApprovalCollaborationPanel';
import { ApprovalReferencePanel } from './ApprovalReferencePanel';
import {
  APPROVAL_UNDO_MS,
  cancelApprovalCommit,
  commitApprovalNow,
  flushApprovalCommits,
  pendingApprovalCommits,
  scheduleApprovalCommit,
  subscribeApprovalCommits,
} from './approval-undo-queue';
import {
  approvalKeys,
  approvalMutationOptions,
  approvalQueryOptions,
  type ApprovalTab,
} from '@/queries/approval-query-options';
import { canPermission } from '@/lib/auth/permissions';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { linkedTab } from './approval-tabs';

const EMPTY_APPROVALS: InformalSanctionDto[] = [];
const NO_QUEUED: number[] = [];

/**
 * 마스터 목록 페이지 크기.
 *
 * [2026-09-05] 종전에는 `{ page: 0, size: 50 }` 한 페이지만 받고 페이저가 없어 51번째 문서부터
 * 화면에서 도달할 수 없었다. 페이지 상태는 URL 에 싣지 않는다(승인된 URL-state 부류가 아니다).
 */
const PAGE_SIZE = 20;

/** 문서 상태 조건(2026-09-26 DIP B5 F4) — 대기 탭에서는 쓰지 않는다. */
const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: '' | SanctionStatusCode; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'A', label: '대기 중' },
  { value: 'C', label: '승인 완료' },
  { value: 'R', label: '반려' },
  { value: 'W', label: '회수' },
];

/**
 * 탭 이름은 실제 질의 축을 말한다.
 *
 * [2026-09-05] 종전 두 번째 탭은 라벨이 "처리 이력" 이면서 `/approvals/my` — 즉 **내가 올린
 * 결재(신청자 기준)** 를 불렀다. 결재자가 승인·반려한 문서를 다시 볼 탭은 없었고, 신청자는 자기
 * 신청서를 엉뚱한 이름 아래서 찾아야 했다. 서버가 처리한 결재만 주는 `/approvals/processed` 를
 * 신설해 분리한다.
 */
const TAB_LABELS: Record<ApprovalTab, string> = {
  PENDING: '대기 중인 결재',
  SUBMITTED: '내가 올린 결재',
  PROCESSED: '내가 처리한 결재',
  // [2026-10-04 D4] 내가 참조자로 지정된 결재 — 읽기만 한다. 대기 건수·차례에는 섞이지 않는다.
  REFERENCED: '참조된 결재',
};

const EMPTY_MESSAGES: Record<ApprovalTab, string> = {
  PENDING: '대기 중인 결재가 없습니다.',
  SUBMITTED: '올린 결재가 없습니다. 오른쪽 위 \'새 결재 기안\' 으로 상신할 수 있습니다.',
  PROCESSED: '승인하거나 반려한 결재가 없습니다.',
  REFERENCED: '참조된 결재가 없습니다. 다른 사람이 나를 참조자로 지정하면 여기에서 읽을 수 있습니다.',
};

const APPROVAL_DECISION_LABELS = {
  reason: '결재 의견',
  status: '결재 상태',
};

const approvalDecisionSchema = ApprovalConfirmRequestSchema
  .transform((request) => ({ ...request, reason: request.reason?.trim() }))
  .superRefine((request, context) => {
    if (request.status === SANCTION_STATUS.REJECTED && !request.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: '반려 사유를 입력해 주세요.',
      });
    }
  });

/**
 * 알림이 여는 주소(2026-10-03 D1). 탭과 문서 번호만 읽고 그 밖의 값은 버린다. 이 화면이 URL 에 쓰는 것은 연 링크를
 * 지우는 일뿐이다(링크 효과 참고) — 상태 값은 싣지 않는다. 탭 해석(linkedTab)은 approval-tabs.ts 에 있다.
 */
function linkedDocument(value: string | null): string | null {
  return value && /^[1-9]\d{0,17}$/.test(value) ? value : null;
}

/**
 * 상태 코드를 배지로. 색만으로 상태를 전달하지 않도록 라벨을 함께 낸다(카탈로그 A4 금지 항목).
 *
 * ⚠ 코드는 서버 열거형 그대로다 — 승인 'C', 반려 'R', 신청(대기) 'A'. 종전에는 'Y'/'N' 과 비교해
 *   모든 건이 '대기 중'으로 보였고, 하필 'R' 은 서버에서 **반려**인데 화면은 그것을 대기로 읽었다.
 */
function ApprovalStatusBadge({ aprvYn }: { aprvYn?: string }) {
  if (aprvYn === SANCTION_STATUS.APPROVED) {
    return <Badge variant="success" className="shrink-0 text-xs font-bold">승인 완료</Badge>;
  }
  if (aprvYn === SANCTION_STATUS.REJECTED) {
    return <Badge variant="destructive" className="shrink-0 text-xs font-bold">반려됨</Badge>;
  }
  if (aprvYn === SANCTION_STATUS.WITHDRAWN) return <Badge variant="secondary" className="shrink-0 text-xs font-bold">회수됨</Badge>;
  return <Badge variant="secondary" className="shrink-0 text-xs font-bold">대기 중</Badge>;
}

/** YYYYMMDD 8자리 저장 형식을 사람이 읽는 날짜로. 형식이 다르면 원문을 그대로 보여준다. */
function formatYmd(value?: string): string {
  if (!value) return '-';
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

/** 목록·상세·ref 키로 쓰는 문서 식별자. 서버 타입이 optional 이라 문자열로 정규화한다. */
function sanctionKey(item: InformalSanctionDto): string {
  return String(item.ifmlAtrzSn ?? '');
}

function documentLabel(item: InformalSanctionDto): string {
  return item.docTtl || `#${item.ifmlAtrzSn}`;
}

/**
 * 서버 일시의 한국 날짜(yyyyMMdd). 시간대 표기가 없는 값은 서버 시각(Asia/Seoul) 그대로이므로 날짜 부분을 읽는다.
 * 브라우저 시간대로 해석하지 않는다 — 해외·UTC 환경에서 날짜가 하루 밀린다.
 */
function seoulYmd(value: string): string | null {
  if (/T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : getTodayYmd(new Date(time));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

/** 두 yyyyMMdd 사이의 달력 날 수. */
function calendarDaysBetween(from: string, to: string): number {
  const utc = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * 지금 차례인 사람과 그 단계가 시작된 뒤 지난 날(진행 중인 문서만).
 *
 * [2026-10-03] '오늘 차례가 됨' 은 한국 달력 날짜로 판정한다 — 재알림의 '하루' 와 같은 기준이다. 종전에는 경과
 * 24시간으로 세어 어제 저녁 차례가 된 문서를 오늘 아침에도 '오늘' 이라고 했다.
 */
function currentTurn(item: InformalSanctionDto, now: number) {
  if (item.aprvYn !== SANCTION_STATUS.REQUESTED) return null;
  const stage = item.stages?.find(entry => entry.status === 'ACTIVE');
  const waiting = (stage?.approvers ?? []).filter(person => person.status === 'ACTIVE');
  const since = item.currentStageSince ? seoulYmd(item.currentStageSince) : null;
  const days = since === null ? null : Math.max(0, calendarDaysBetween(since, getTodayYmd(new Date(now))));
  return { waiting, days };
}

/** 처리 동사에 목적격 조사를 붙인다 — '승인을', '동의를'. */
function withObjectParticle(actionNm: string): string {
  return actionNm === '동의' ? '동의를' : `${actionNm}을`;
}

/** 이 단계가 합의(전원 동의) 단계인가 — 처리 동사를 '승인' 대신 '동의' 로 부른다. */
function isAgreementStage(item: InformalSanctionDto): boolean {
  return item.stages?.find(stage => stage.status === 'ACTIVE')?.kind === 'AGREEMENT';
}

/**
 * 보는 사람이 이 문서의 보이는 결재선에 있는가(차례가 온 사람·아직 차례 전인 사람 모두). 이전 차수 참조자가 이 차수 결재자가 되면
 * 서버는 referenceViewer 를 참으로 주지만, 그 사람에게 문서는 '참조로 받은 읽기 전용' 이 아니라 결재할 문서다(D4 개정 1).
 */
function onVisibleLine(item: InformalSanctionDto, esntlId: string | undefined): boolean {
  if (!esntlId) return false;
  return (item.stages ?? []).some(stage => (stage.approvers ?? []).some(person => person.userId === esntlId));
}

/**
 * 참조로 받은 읽기 전용 문서인가 — 서버 판정(referenceViewer)으로만 본다. 이전 차수 참조자가 이 차수 결재자가 되면 처리할
 * 차례가 있는 문서이므로 참조로 부르지 않는다(처리 힌트가 있거나 보이는 결재선에 있으면 결재 문서다). 목록 배지와 상세 안내가
 * 같은 판정을 쓴다.
 */
function isReadOnlyReference(item: InformalSanctionDto, esntlId: string | undefined): boolean {
  return Boolean(item.referenceViewer) && !item.canApprove && !item.canRequestSupplement && !onVisibleLine(item, esntlId);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** 화면 위에 대화상자(기안·확인·사람 고르기·명령 센터)가 열려 있는가. Radix 는 키 이벤트의 전파를 막지 않는다. */
function hasOpenDialog(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]') !== null;
}

/** 되돌리기 대기열에 오른 승인 — 배너가 부를 문서 이름과, 되돌리거나 실패했을 때 되살릴 의견을 문서별로 둔다. */
interface QueuedApproval {
  title: string;
  actionNm: string;
  item: InformalSanctionDto;
  reason?: string;
}

/**
 * 결재 허브 — A2(마스터-디테일) archetype.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2.
 *
 * 이 화면의 과업은 **왼쪽에서 문서를 고르고 오른쪽에서 결재선·의견을 보고 처리**하는 마스터-디테일이다.
 *
 * [2026-10-03 결재 동선 개선] 세 동선을 다시 짰다.
 * - 처리: 의견 칸 바로 옆에 승인·반려·보완 요청을 둔다. 단건 승인은 확인 대화상자 대신 10초 동안 되돌릴 수
 *   있다({@link scheduleApprovalCommit}). 반려는 되돌릴 수 없어 확인을 거친다. 여러 건은 고른 뒤 한 번 확인하고
 *   보낸다(업무 구분별로 한꺼번에 고를 수 있다). 키보드만으로 처리하는 집중 모드가 있다.
 * - 추적: 목록이 지금 차례인 사람과 기다린 날을 보이고, 기안자는 재알림·결재자 바꾸기·보완 답변을 상세에서 한다.
 * - 진입: 알림 링크(`?tab=…&doc=…`)가 그 문서를 바로 연다.
 */
export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = linkedTab(searchParams?.get('tab') ?? null);
  const docParam = linkedDocument(searchParams?.get('doc') ?? null);
  const [activeTab, setActiveTab] = useState<ApprovalTab>(tabParam ?? 'PENDING');
  const [page, setPage] = useState(1);
  // [2026-09-26 DIP B5 F4] 제목·요청일 기간·문서 상태로 좁힌다. 조건은 서버가 적용한다.
  const [keyword, setKeyword] = useState('');
  const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
  const [statusFilter, setStatusFilter] = useState<'' | SanctionStatusCode>('');
  const statusFilterId = useId();
  const pendingCountId = useId();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(docParam);
  // 알림으로 연 문서. 목록의 현재 페이지에 없어도 상세를 연다.
  const [linkedId, setLinkedId] = useState<string | null>(docParam);
  const [appliedLink, setAppliedLink] = useState(`${tabParam}|${docParam}`);
  const [isDraftOpen, setDraftOpen] = useState(false);
  const [resubmission, setResubmission] = useState<InformalSanctionDto | undefined>();
  const [draftTemplate, setDraftTemplate] = useState<InformalSanctionDto | undefined>();
  const [rejectReason, setRejectReason] = useState('');
  const [opinionDocument, setOpinionDocument] = useState<InformalSanctionDto | null>(null);
  if (appliedLink !== `${tabParam}|${docParam}`) {
    // 같은 화면에서 다른 알림을 눌렀을 때. 렌더 중 상태 조정이라 effect 로 한 번 더 그리지 않는다.
    setAppliedLink(`${tabParam}|${docParam}`);
    if (tabParam) setActiveTab(tabParam);
    if (docParam) { setSelectedItemId(docParam); setLinkedId(docParam); setPage(1); }
    // 작성 중 의견이 있었다면 이동 전에 '변경 버리고 이동' 을 이미 확인받았다. 의견을 그대로 두면 그 문서가 계속
    // 선택되어 링크 문서가 열리지 않는다.
    if (tabParam || docParam) { setRejectReason(''); setOpinionDocument(null); }
  }
  const [pendingAction, setPendingAction] = useState<SanctionStatusCode | 'CANCEL' | 'ASK' | 'BULK' | 'REVISE' | null>(null);
  const [committingIds, setCommittingIds] = useState<number[]>([]);
  const [actionError, setActionError] = useState('');
  const [needsActionReview, setNeedsActionReview] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  // 집중 모드는 대기함의 도구다. 탭을 옮기면(탭 전환·상신 직후·알림 링크) 끈다 — 토글 버튼도 대기함에만 있다.
  if (focusMode && activeTab !== 'PENDING') setFocusMode(false);
  const [announcement, setAnnouncement] = useState('');
  const [now] = useState(() => Date.now());
  const [queuedDocs, setQueuedDocs] = useState<Record<number, QueuedApproval>>({});
  // 되돌리거나 실패한 승인의 의견 — 다른 문서에 의견을 쓰는 중이라 덮지 않고 맡아 두었다가, 그 문서를 다시 열 때 채운다.
  const [parkedOpinions, setParkedOpinions] = useState<Record<string, string>>({});
  // 처리 예정 영역 밖에서 끝난 승인의 실패 — 지금 보고 있는 다른 문서의 상세에 붙이지 않는다.
  const [queueNotice, setQueueNotice] = useState('');
  const pendingActionRef = useRef(false);
  const itemButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const queueButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);
  // 집중 모드에서 R·Q 로 의견 칸에 들어왔을 때 Ctrl+Enter 로 마칠 동작.
  const focusIntent = useRef<'REJECT' | 'ASK' | null>(null);
  const queued = useSyncExternalStore(subscribeApprovalCommits, pendingApprovalCommits, () => NO_QUEUED);
  const decisionValidation = useManualFormValidation(approvalDecisionSchema, {
    focusTargets: { reason: () => rejectReasonRef.current },
    labels: APPROVAL_DECISION_LABELS,
  });
  const navigate = useUnsavedChanges({ dirty: Boolean(rejectReason.trim()), pending: pendingAction !== null });

  // 되돌리기 대기 중인 승인은 화면을 떠나면 바로 보낸다. 탭을 닫으려 하면 브라우저가 한 번 묻게 한다.
  useEffect(() => () => { void flushApprovalCommits(); }, []);
  useEffect(() => {
    if (queued.length === 0) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [queued.length]);
  /*
    알림 링크는 연 뒤 주소에서 지운다. 주소가 그대로면 같은 링크(예: 같은 문서의 재알림)를 다시 눌러도 주소가 바뀌지
    않아 아무 일도 일어나지 않았다 — 다른 탭·문서로 옮겨 가 있었어도 그 자리에 머물렀다. 처음 연 뒤의 링크는
    그 문서와 목록을 다시 읽는다(알림이 왔다는 것은 무언가 바뀌었다는 뜻이다).
    useRouter 는 미저장 변경 보호를 거쳐 작성 중 의견이 있으면 이동 확인을 한 번 더 띄운다 — 주소만 고치는 history API 를
    쓴다(App Router 가 useSearchParams 와 맞춘다).
  */
  const linkRunRef = useRef(false);
  useEffect(() => {
    const first = !linkRunRef.current;
    linkRunRef.current = true;
    if (!tabParam && !docParam) return;
    if (!first) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    window.history.replaceState(null, '', pathname || '/approvals');
  }, [tabParam, docParam, pathname, queryClient]);

  const listFilters = {
    ...(keyword ? { keyword } : {}),
    ...(period.from && period.to ? { fromYmd: period.from.replace(/-/g, ''), toYmd: period.to.replace(/-/g, '') } : {}),
    ...(activeTab !== 'PENDING' && statusFilter ? { status: statusFilter } : {}),
  };
  const hasListFilter = Object.keys(listFilters).length > 0;
  const { data: approvalData, dataUpdatedAt, isLoading, isFetching, error: approvalsError, refetch: refetchApprovals } = useQuery(
    approvalQueryOptions.list(activeTab, { page: page - 1, size: PAGE_SIZE, ...listFilters }),
  );
  // 대기 탭의 건수 배지 — 조건과 무관한 전체 대기 건수다. 처리하면 목록 무효화와 함께 다시 읽힌다.
  const { data: pendingTotal } = useQuery({
    ...approvalQueryOptions.list('PENDING', { page: 0, size: 1 }),
    select: (response) => response.total ?? 0,
  });
  const confirmMutation = useMutation(approvalMutationOptions.confirm(queryClient));
  const cancelMutation = useMutation(approvalMutationOptions.cancel(queryClient));
  const supplementMutation = useMutation(approvalMutationOptions.requestSupplement(queryClient));

  const list = approvalData?.list || EMPTY_APPROVALS;
  /*
    [2026-08-29] '총 N건' 이 전체가 아니라 **불러온 한 페이지의 길이**였다. 서버 응답에는 전체
    건수가 이미 들어 있다(PageResponse.total). [2026-09-05] 페이저를 붙여 나머지 페이지에도
    도달할 수 있게 했다.
  */
  const total = approvalData?.total ?? list.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // [2026-09-26 DIP C4] 마지막 페이지의 마지막 문서를 처리하면 그 페이지가 빈다. 한 페이지로 줄면 페이저도
  //   사라져 빈 대기함에 갇혔다 — 목록을 다시 읽은 뒤 마지막 페이지로 되돌린다.
  usePageClamp({
    page,
    totalPages,
    ready: approvalData !== undefined && !isFetching && !approvalsError,
    onPageChange: (nextPage) => {
      setPage(nextPage);
      setSelectedItemId(null);
    },
  });
  const selectedListItem = useMemo(() => {
    // 목록의 순서나 처리 상태가 새로고침되어도 작성 중 의견을 다른 문서로 옮기지 않는다.
    if (rejectReason.trim() && opinionDocument) return list.find(item => sanctionKey(item) === sanctionKey(opinionDocument)) ?? opinionDocument;
    const found = list.find(item => sanctionKey(item) === selectedItemId);
    if (found) return found;
    // 알림으로 연 문서는 목록의 이 페이지에 없어도 상세를 불러온다.
    if (selectedItemId && selectedItemId === linkedId) return { ifmlAtrzSn: Number(selectedItemId) } as InformalSanctionDto;
    return list.length > 0 ? list[0] : null;
  }, [list, selectedItemId, rejectReason, opinionDocument, linkedId]);
  const detailQuery = useQuery({
    ...approvalQueryOptions.detail(selectedListItem?.ifmlAtrzSn ?? 0),
    enabled: selectedListItem?.ifmlAtrzSn !== undefined,
  });
  const selectedItem = detailQuery.data ?? selectedListItem;
  const previousRevisions = (detailQuery.data?.history ?? []).filter(
    revision => revision.atrzCycl !== undefined && revision.atrzCycl < (selectedItem?.atrzCycl ?? 1),
  );
  const hasVisibleSelection = list.some(item => sanctionKey(item) === selectedItemId);
  // 단계가 시작된 날을 목록을 읽은 시각 기준으로 센다 — 화면을 오래 열어 두어도 다시 읽으면 날짜가 따라온다.
  const turnReference = dataUpdatedAt || now;

  // 맡아 둔 의견은 그 문서를 다시 고를 때 한 번 채운다. 고르는 순간에만 보므로, 채운 뒤 지운 글을 다시 채우지 않는다.
  const parkedKey = selectedListItem ? sanctionKey(selectedListItem) : '';
  const [parkCheckedKey, setParkCheckedKey] = useState('');
  if (parkedKey !== parkCheckedKey) {
    setParkCheckedKey(parkedKey);
    const parked = parkedOpinions[parkedKey];
    if (parked !== undefined && selectedListItem && !rejectReason.trim()) {
      setParkedOpinions((current) => {
        const next = { ...current };
        delete next[parkedKey];
        return next;
      });
      setOpinionDocument(selectedListItem);
      setRejectReason(parked);
    }
  }

  // 되돌리기 대기열의 승인은 누른 순간이 아니라 10초 뒤에 끝난다. 그때의 탭·목록·작성 중 의견을 읽도록 ref 로 둔다.
  const live = useRef({ activeTab, list, draft: '', draftKey: '' });
  useLayoutEffect(() => {
    live.current = { activeTab, list, draft: rejectReason, draftKey: opinionDocument ? sanctionKey(opinionDocument) : '' };
  });

  const resetDecision = () => {
    setRejectReason('');
    decisionValidation.setFormErrors({}, false);
    setActionError('');
    setNeedsActionReview(false);
    focusIntent.current = null;
  };

  /** 조건이 바뀌면 1페이지로 돌아가고 선택을 푼다 — 작성 중인 반려 사유가 있으면 탭 전환과 같은 확인을 거친다. */
  const applyListFilter = (apply: () => void) => {
    if (pendingActionRef.current) return;
    void navigate(() => {
      apply();
      setPage(1);
      setSelectedItemId(null);
      setBulkSelected([]);
      resetDecision();
    });
  };

  const handleTabChange = (tab: ApprovalTab) => {
    if (pendingActionRef.current || tab === activeTab) return;
    void navigate(() => {
      setActiveTab(tab);
      setPage(1);
      // 다른 대기열의 문서 식별자를 들고 넘어가면 첫 항목이 아니라 빈 상세가 남는다.
      setSelectedItemId(null);
      setLinkedId(null);
      setBulkSelected([]);
      resetDecision();
    });
  };

  /** 페이지를 넘기면 이전 페이지의 선택은 stale 이므로 해제한다(메일 이력 A2 와 같은 규칙). */
  const handlePageChange = (nextPage: number) => {
    if (pendingActionRef.current || nextPage === page) return;
    void navigate(() => {
      setPage(nextPage);
      setSelectedItemId(null);
      setBulkSelected([]);
      resetDecision();
    });
  };

  /** 상신 직후에는 방금 올린 문서가 보이는 '내가 올린 결재' 첫 페이지로 옮겨 저장됐음을 눈으로 확인시킨다. */
  const handleDraftCreated = (ifmlAtrzSn: number) => {
    setActiveTab('SUBMITTED');
    setPage(1);
    setSelectedItemId(String(ifmlAtrzSn));
    setLinkedId(String(ifmlAtrzSn));
    setBulkSelected([]);
    resetDecision();
  };

  /** 처리한 문서의 바로 다음 문서(마지막이었으면 바로 앞)로 옮긴다. 대기함에서만 옮긴다. */
  const moveAfter = (item: InformalSanctionDto) => {
    const processedIndex = list.findIndex(entry => sanctionKey(entry) === sanctionKey(item));
    const next = processedIndex >= 0
      ? (list[processedIndex + 1] ?? list[processedIndex - 1])
      : list.find(entry => sanctionKey(entry) !== sanctionKey(item));
    if (activeTab === 'PENDING' && next) {
      setSelectedItemId(sanctionKey(next));
      requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(next))?.focus());
    } else requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(item))?.focus());
  };

  /** 처리 실패의 필드 오류·충돌 후속을 반영하고, 화면 안에 보일 사유 문장을 돌려준다. */
  const decisionFailureMessage = (error: unknown, actionNm: string) => {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) decisionValidation.setFormErrors(fieldErrors);
    // [2026-10-01] 충돌(409)은 먼저 일어난 다른 처리다 — 다른 결재자의 반려, 신청자의 회수, 다른 탭에서의 처리.
    //   서버가 무슨 일이 있었는지 말하므로 그 문구를 그대로 보이고, 목록·상세를 다시 읽어 사라진 문서를 걷는다.
    if (isConflictError(error)) {
      setNeedsActionReview(true);
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    }
    return isConflictError(error)
      ? `${failureMessage(error, '다른 사용자가 문서를 변경했습니다.')} 입력한 의견은 유지됩니다.`
      : `${failureMessage(error, `${actionNm} 처리 중 오류가 발생했습니다.`)} 입력한 의견은 유지됩니다.`;
  };

  const reportDecisionFailure = (error: unknown, actionNm: string) => {
    setActionError(decisionFailureMessage(error, actionNm));
    // 사유는 위 화면 안 안내가 말한다. 토스트는 무엇을 못 했는지만 알린다(실패 1회 = 토스트 1개).
    toast(`결재를 ${actionNm}하지 못했습니다.`, 'error');
  };

  const forgetQueued = (id: number) => setQueuedDocs((current) => {
    const next = { ...current };
    delete next[id];
    return next;
  });

  /**
   * 되돌렸거나 보내지 못한 승인의 의견을 그 문서로 되살린다.
   * - 그 문서가 지금 대기함 목록에 있고 다른 문서에 쓰는 의견이 없으면: 그 문서를 열고 의견을 채운다(restored).
   * - 다른 문서에 의견을 쓰는 중이거나 그 문서가 지금 목록에 없으면: 쓰는 글을 덮지 않고 의견을 맡아 둔다(parked).
   *   그 문서를 다시 고르면 채운다.
   */
  const settleOpinion = (item: InformalSanctionDto, reason: string | undefined): 'restored' | 'parked' | 'kept' => {
    const key = sanctionKey(item);
    const { activeTab: currentTab, list: currentList, draft, draftKey } = live.current;
    const listed = currentTab === 'PENDING' && currentList.some(entry => sanctionKey(entry) === key);
    const otherDraft = draft.trim() !== '' && draftKey !== key;
    if (!listed || otherDraft) {
      if (!reason || draftKey === key) return 'kept';
      setParkedOpinions(current => ({ ...current, [key]: reason }));
      return 'parked';
    }
    setSelectedItemId(key);
    // 같은 문서에 새로 쓰기 시작한 글이 있으면 그 글이 더 최근의 뜻이다 — 덮지 않는다.
    if (reason && !draft.trim()) {
      setOpinionDocument(item);
      setRejectReason(reason);
    }
    return 'restored';
  };

  /** 처리 예정 행이 사라진 뒤 포커스를 둘 곳 — 남은 대기열의 다음 행, 없으면 지금 고른 문서. */
  const focusAfterQueueRow = (id: number) => {
    const index = queued.indexOf(id);
    const rest = queued.filter(entry => entry !== id);
    const next = rest[Math.min(Math.max(index, 0), rest.length - 1)];
    const fallbackKey = selectedKey;
    requestAnimationFrame(() => {
      const target = (next !== undefined ? queueButtonRefs.current.get(next) : undefined) ?? itemButtonRefs.current.get(fallbackKey);
      target?.focus();
    });
  };

  /**
   * 승인 — 확인 대화상자 없이 되돌리기 대기열에 올린다. 10초 안에 되돌리지 않으면 서버로 보낸다.
   * 의견은 그 순간의 값으로 묶어 두고 입력란은 다음 문서를 위해 비운다. 되돌리거나 실패하면 그 의견을 되살린다.
   */
  const scheduleApprove = (item: InformalSanctionDto, actionNm: string, reason: string | undefined) => {
    const id = item.ifmlAtrzSn;
    if (id === undefined) return;
    const title = documentLabel(item);
    const version = item.version;
    const accepted = scheduleApprovalCommit(id, async () => {
      setCommittingIds(current => [...current, id]);
      try {
        await confirmMutation.mutateAsync({ ifmlAtrzSn: id, status: SANCTION_STATUS.APPROVED, reason, version });
        toast(`‘${title}’ ${actionNm}했습니다.`, 'success');
      } catch (error) {
        // 10초 사이 사용자가 다른 문서에 의견을 쓰고 있을 수 있다 — 그 글을 덮거나 실패 안내를 그 문서에 붙이지 않는다.
        const outcome = settleOpinion(item, reason);
        if (outcome === 'restored') {
          reportDecisionFailure(error, actionNm);
        } else {
          if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
          setQueueNotice(`‘${title}’ ${actionNm}하지 못했습니다. ${failureMessage(error, `${actionNm} 처리 중 오류가 발생했습니다.`)}${
            outcome === 'parked' ? ' 작성 중인 의견은 그대로 두었고, 이 문서에 적었던 의견은 문서를 다시 열면 채웁니다.' : ''}`);
          toast(`결재를 ${actionNm}하지 못했습니다.`, 'error');
        }
      } finally {
        forgetQueued(id);
        setCommittingIds(current => current.filter(entry => entry !== id));
      }
    });
    if (!accepted) return;
    setQueuedDocs(current => ({ ...current, [id]: { title, actionNm, item, reason } }));
    // 단건으로 처리한 문서는 여러 건 승인의 선택에서 뺀다 — 되돌려도 다시 고른 것으로 남지 않는다.
    setBulkSelected(current => current.filter(entry => entry !== String(id)));
    setRejectReason('');
    setActionError('');
    setQueueNotice('');
    decisionValidation.setFormErrors({}, false);
    setAnnouncement(`‘${title}’ ${withObjectParticle(actionNm)} ${APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다. 되돌리려면 되돌리기를 누르세요.`);
    moveAfter(item);
  };

  const undoApprove = (id: number) => {
    if (!cancelApprovalCommit(id)) return;
    const entry = queuedDocs[id];
    forgetQueued(id);
    const title = entry?.title ?? `#${id}`;
    const outcome = entry ? settleOpinion(entry.item, entry.reason) : 'kept';
    if (outcome === 'restored') {
      setAnnouncement(`‘${title}’ 처리를 되돌렸습니다. 문서는 그대로 대기 중입니다.${entry?.reason ? ' 적었던 의견을 다시 채웠습니다.' : ''}`);
      requestAnimationFrame(() => itemButtonRefs.current.get(String(id))?.focus());
      return;
    }
    setAnnouncement(`‘${title}’ 처리를 되돌렸습니다. 문서는 그대로 대기 중입니다.${
      outcome === 'parked' ? ' 작성 중인 의견을 덮지 않도록, 이 문서에 적었던 의견은 문서를 다시 열면 채웁니다.' : ''}`);
    focusAfterQueueRow(id);
  };

  /** ‘지금 처리’ — 기다리지 않고 보낸다. 그 행은 바로 사라지므로 포커스를 남은 행이나 고른 문서로 옮긴다. */
  const commitNow = (id: number) => {
    focusAfterQueueRow(id);
    void commitApprovalNow(id);
  };

  const handleAction = async (
    item: InformalSanctionDto,
    aprvYn: Extract<SanctionStatusCode, 'C' | 'R'>,
  ) => {
    const isReject = aprvYn === SANCTION_STATUS.REJECTED;
    const actionNm = isReject ? '반려' : isAgreementStage(item) ? '동의' : '승인';

    if (item.ifmlAtrzSn === undefined) {
      toast('문서 번호를 확인할 수 없어 처리할 수 없습니다.', 'error');
      return;
    }

    const validatedDecision = decisionValidation.validate({
      status: aprvYn,
      reason: rejectReason || undefined,
    });
    if (!validatedDecision) return;

    if (pendingActionRef.current) return;
    if (!isReject) {
      scheduleApprove(item, actionNm, validatedDecision.reason);
      return;
    }

    // 반려는 되돌릴 수 없어 확인을 거친다. confirm 모달이 열려 있는 동안에는 mutation.isPending 이 아직 false다.
    // 같은 tick의 연속 클릭도 즉시 차단하도록 await 전에 동기 선점하고, 취소·실패를 포함해 finally에서 푼다.
    pendingActionRef.current = true;
    setPendingAction(aprvYn);
    try {
      const isConfirmed = await confirm({
        title: `결재 ${actionNm}`,
        message: `‘${documentLabel(item)}’ 문서 전체를 반려합니다. 남은 모든 결재는 종료되고 사유가 기안자에게 전달됩니다. 보완만 필요하면 반려 대신 보완 요청을 쓰세요.`,
        variant: 'destructive',
      });
      if (!isConfirmed) return;

      await confirmMutation.mutateAsync({
        ifmlAtrzSn: item.ifmlAtrzSn,
        status: validatedDecision.status,
        reason: validatedDecision.reason,
        version: item.version,
      });
      toast(`성공적으로 ${actionNm}되었습니다.`, 'success');
      setRejectReason('');
      setActionError('');
      moveAfter(item);
    } catch (error) {
      reportDecisionFailure(error, actionNm);
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  /** 보완 요청 — 의견 칸의 글이 질문이 된다. 문서는 진행 중으로 남고 기안자가 답하면 같은 결재자가 이어서 처리한다. */
  const handleSupplementRequest = async (item: InformalSanctionDto) => {
    if (item.ifmlAtrzSn === undefined || item.version === undefined || pendingActionRef.current) return;
    const question = rejectReason.trim();
    if (!question) {
      decisionValidation.setFormErrors({ reason: '보완을 요청할 내용을 의견 칸에 적어 주세요.' });
      return;
    }
    pendingActionRef.current = true;
    setPendingAction('ASK');
    try {
      await supplementMutation.mutateAsync({ ifmlAtrzSn: item.ifmlAtrzSn, question, version: item.version });
      toast('보완을 요청했습니다. 기안자가 답하면 알림이 옵니다.', 'success');
      // 답을 기다리는 문서는 여러 건 승인에서 뺀다 — 답을 받기 전에 승인되지 않게 한다.
      setBulkSelected(current => current.filter(entry => entry !== sanctionKey(item)));
      setRejectReason('');
      setActionError('');
      moveAfter(item);
    } catch (error) {
      setActionError(decisionFailureMessage(error, '보완 요청'));
      toast('결재를 보완 요청하지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  /**
   * 고른 여러 건을 한 번 확인한 뒤 차례로 승인한다. 일부가 실패하면 실패한 문서와 사유를 밝힌다.
   *
   * [2026-10-03] 보내는 문서(targets)는 **지금 승인할 수 있는 것**(bulkEligible)과 고른 것의 교집합이다. 종전에는 고른
   * 목록을 그대로 써서, 단건 승인으로 이미 되돌리기 대기열에 오른 문서·보완 요청을 보낸 문서·승인 힌트가 꺼진 문서까지
   * 다시 보냈다(대기열의 '되돌리기' 가 이미 승인된 문서를 되돌렸다고 말했다). 확인 문구의 건수도 이 교집합이다.
   */
  const handleBulkApprove = async (targets: InformalSanctionDto[]) => {
    if (targets.length === 0 || pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction('BULK');
    try {
      const agreements = targets.filter(isAgreementStage).length;
      const ok = await confirm({
        title: '선택한 결재 승인',
        message: `선택한 ${targets.length}건을 의견 없이 승인합니다${agreements > 0 ? `(합의 단계 ${agreements}건은 동의)` : ''}. `
          + '각 문서는 결재선에 따라 다음 단계로 넘어가거나, 같은 단계의 다른 결재자를 기다리거나, 마지막 단계면 완료됩니다.',
        confirmText: `${targets.length}건 승인`,
      });
      if (!ok) return;
      const failures: string[] = [];
      for (const item of targets) {
        // 확인을 기다리는 사이 단건 승인 대기열에 오른 문서는 보내지 않는다 — 두 번 보내지 않는다.
        if (pendingApprovalCommits().includes(item.ifmlAtrzSn as number)) {
          failures.push(`‘${documentLabel(item)}’: 이미 처리 예정에 올라 있어 보내지 않았습니다.`);
          continue;
        }
        try {
          await confirmMutation.mutateAsync({ ifmlAtrzSn: item.ifmlAtrzSn as number, status: SANCTION_STATUS.APPROVED, version: item.version });
        } catch (error) {
          failures.push(`‘${documentLabel(item)}’: ${failureMessage(error, '처리하지 못했습니다.')}`);
        }
      }
      setBulkSelected([]);
      const succeeded = targets.length - failures.length;
      // 합의 단계가 섞이면 '승인' 하나로 부르지 않는다.
      const doneNm = agreements > 0 ? '처리' : '승인';
      if (failures.length === 0) {
        toast(`${succeeded}건을 ${doneNm}했습니다.`, 'success');
        setActionError('');
      } else {
        void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
        setActionError(`${succeeded}건은 ${doneNm}했고 ${failures.length}건은 처리하지 못했습니다. ${failures.join(' ')}`);
        toast(`${failures.length}건을 승인하지 못했습니다.`, 'error');
      }
    } catch (error) {
      // 문서별 실패는 위에서 모은다. 여기는 확인 대화상자나 목록 갱신처럼 승인 밖에서 난 실패다 — 고른 문서는 그대로 둔다.
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      setActionError(failureMessage(error, '선택한 결재를 승인하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.'));
      toast('선택한 결재를 승인하지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const handleCancelDraft = async (item: InformalSanctionDto) => {
    if (!item.ifmlAtrzSn || isActionPending || pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction('CANCEL');

    try {
      const ok = await confirm({
        title: '결재 회수',
        message: `‘${documentLabel(item)}’ 문서를 회수하면 진행 중인 결재와 남은 결재가 종료됩니다. 문서와 처리 이력은 보존되고 수정 후 새 차수로 재상신할 수 있습니다.`,
        confirmText: '결재 회수',
        variant: 'destructive',
      });
      if (!ok) return;

      await cancelMutation.mutateAsync({ ifmlAtrzSn: item.ifmlAtrzSn, version: item.version });
      toast('문서를 회수했습니다. 처리 이력은 보존됩니다.', 'success');
      setActionError('');
    } catch (error) {
      // 회수하려는 사이에 결재가 끝났을 수 있다 — 서버가 말한 사유를 보이고 최신 상태를 다시 읽는다.
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      setActionError(failureMessage(error, '문서를 회수하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.'));
      toast('결재를 회수하지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  /** 고쳐서 다시 올리기 — 회수와 재상신 편집을 한 동작으로 잇는다. 편집을 닫으면 문서는 회수된 채로 남는다. */
  const handleWithdrawAndRevise = async (item: InformalSanctionDto) => {
    if (!item.ifmlAtrzSn || pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction('REVISE');
    try {
      const ok = await confirm({
        title: '고쳐서 다시 올리기',
        message: `‘${documentLabel(item)}’ 문서를 회수하고 바로 고쳐 새 차수로 올립니다. 편집을 닫으면 문서는 회수된 채로 남고, 나중에 ‘수정 후 재상신’ 으로 올릴 수 있습니다.`,
        confirmText: '회수하고 고치기',
      });
      if (!ok) return;
      await cancelMutation.mutateAsync({ ifmlAtrzSn: item.ifmlAtrzSn, version: item.version });
      const latest = await queryClient.fetchQuery(approvalQueryOptions.detail(item.ifmlAtrzSn));
      if (!latest.canResubmit) {
        setActionError('문서를 회수했지만 지금은 다시 올릴 수 없습니다. 최신 상태를 확인해 주세요.');
        return;
      }
      setActionError('');
      setDraftTemplate(undefined);
      setResubmission(latest);
      setDraftOpen(true);
    } catch (error) {
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      setActionError(failureMessage(error, '문서를 회수하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.'));
      toast('결재를 회수하지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const openDraft = (options: { resubmission?: InformalSanctionDto; template?: InformalSanctionDto }) => {
    void navigate(() => {
      setRejectReason('');
      decisionValidation.setFormErrors({}, false);
      setResubmission(options.resubmission);
      setDraftTemplate(options.template);
      setDraftOpen(true);
    });
  };

  /** 이전 단일 결재 문서의 표시. stages가 있으면 서버의 실제 결재선을 우선한다. */
  const workflowSteps = useMemo(() => {
    if (!selectedItem) return [];
    return [
      {
        label: '기안',
        user: selectedItem.aplcntNm || selectedItem.aplcntId,
        status: 'completed' as const,
        date: formatYmd(selectedItem.reqYmd),
      },
      {
        label: '결재',
        user: selectedItem.aprvrNm || selectedItem.aprvrId || '결재자 미지정',
        status: selectedItem.aprvYn === SANCTION_STATUS.APPROVED ? 'completed' as const :
          selectedItem.aprvYn === SANCTION_STATUS.REJECTED ? 'rejected' as const : 'current' as const,
        date: selectedItem.atrzDt
      }
    ];
  }, [selectedItem]);

  // 단계와 참여자 권한은 서버가 판정한다. 목록 탭이나 전체 문서 상태만으로 추론하지 않는다.
  const selectedKey = selectedItem ? sanctionKey(selectedItem) : '';
  const hasListedDocument = list.some(item => sanctionKey(item) === selectedKey) || (selectedKey !== '' && selectedKey === linkedId);
  const selectedQueued = selectedItem?.ifmlAtrzSn !== undefined && (queued.includes(selectedItem.ifmlAtrzSn) || committingIds.includes(selectedItem.ifmlAtrzSn));
  // [2026-10-01] 서버 힌트는 참여 조건과 기능 권한을 함께 본다. 화면도 같은 권한으로 한 번 더 가린다 — 권한이 방금
  //   회수돼 캐시된 상세가 낡았더라도 버튼이 남지 않는다. 표시 판정일 뿐이며 서버 인가는 그대로다.
  const canDraft = canPermission(user, 'APPROVAL_CREATE');
  const canApprovePermission = canPermission(user, 'APPROVAL_APPROVE');
  const detailFresh = !needsActionReview && !detailQuery.isError && !detailQuery.isFetching;
  const canDecide = Boolean(detailQuery.data?.canApprove) && canApprovePermission && hasListedDocument && detailFresh;
  const canAsk = canDecide && Boolean(detailQuery.data?.canRequestSupplement);
  const canCancel = Boolean(detailQuery.data?.canWithdraw) && canPermission(user, 'APPROVAL_CANCEL') && detailFresh;
  const canResubmit = Boolean(detailQuery.data?.canResubmit) && canDraft && detailFresh;
  const canClone = canDraft && Boolean(detailQuery.data) && detailQuery.data?.aplcntId === user?.esntlId && Boolean(detailQuery.data?.stages?.length);
  // 기안 권한이 없으면 없는 버튼을 가리키지 않는다.
  const emptyMessage = activeTab === 'SUBMITTED' && !canDraft ? '올린 결재가 없습니다.' : EMPTY_MESSAGES[activeTab];
  const isAgreement = selectedItem ? isAgreementStage(selectedItem) : false;
  const isActionPending = pendingAction !== null;
  const decisionDisabled = isActionPending || selectedQueued;
  const rejectReasonFieldProps = decisionValidation.fieldProps('reason');
  const rejectReasonDescribedBy = [
    'reject-reason-help',
    rejectReasonFieldProps['aria-describedby'],
  ].filter(Boolean).join(' ');

  // 여러 건 승인 — 대기함에서 서버가 승인할 수 있다고 한 문서만, 보완 요청이 열려 있지 않고 대기열에 없으며 보내는 중도 아닌 것만.
  //   의존값(목록·대기열 스냅샷·보내는 중 상태)은 바뀔 때만 새 배열이 되므로, 메모해 두어야 아래 taskGroups 메모가 실제로 캐시된다.
  const bulkEligible = useMemo(() => (activeTab === 'PENDING' && canApprovePermission
    ? list.filter(item => item.canApprove && !item.openSupplement && item.ifmlAtrzSn !== undefined
      && !queued.includes(item.ifmlAtrzSn) && !committingIds.includes(item.ifmlAtrzSn))
    : EMPTY_APPROVALS), [activeTab, canApprovePermission, list, queued, committingIds]);
  const taskGroups = useMemo(() => {
    const groups = new Map<string, { label: string; keys: string[] }>();
    bulkEligible.forEach((item) => {
      const code = item.taskSeCd ?? '';
      const group = groups.get(code) ?? { label: item.taskSeNm || item.taskSeCd || '업무 구분 없음', keys: [] };
      group.keys.push(sanctionKey(item));
      groups.set(code, group);
    });
    return [...groups.values()].filter(group => group.keys.length > 1);
  }, [bulkEligible]);
  const bulkTargets = bulkEligible.filter(item => bulkSelected.includes(sanctionKey(item)));
  const visibleBulkSelected = bulkTargets.map(sanctionKey);

  // 집중 모드 — 키보드만으로 목록을 오가며 처리한다. 최신 상태를 읽도록 처리기를 ref 로 둔다.
  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  const handleFocusKey = (event: KeyboardEvent) => {
    // 대화상자(기안·확인·사람 고르기)가 열려 있으면 키는 그 대화상자의 것이다. 종전에는 기안 대화상자 안에서 누른 A 가
    //   뒤에 가려진 문서를 승인 대기열에 올렸다.
    if (isDraftOpen || hasOpenDialog()) return;
    // 의견 칸에서는 글자를 단축키로 보지 않는다. Esc 는 집중 모드를 끝내지 않고 목록으로 돌아가며,
    //   Ctrl+Enter(맥은 ⌘+Enter)는 R·Q 로 시작한 반려·보완 요청을 마친다 — 칸 안에서 R 을 다시 누르면 글자가 된다.
    if (event.target === rejectReasonRef.current) {
      if (event.key === 'Escape') {
        event.preventDefault();
        focusIntent.current = null;
        itemButtonRefs.current.get(selectedKey)?.focus();
        setAnnouncement('목록으로 돌아왔습니다. 집중 모드는 계속됩니다.');
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && focusIntent.current) {
        event.preventDefault();
        const intent = focusIntent.current;
        if (!selectedItem || !canDecide || decisionDisabled) return;
        focusIntent.current = null;
        if (intent === 'REJECT') void handleAction(selectedItem, SANCTION_STATUS.REJECTED);
        else if (canAsk) void handleSupplementRequest(selectedItem);
      }
      return;
    }
    if (event.key === 'Escape') {
      setFocusMode(false);
      setAnnouncement('집중 모드를 끝냈습니다.');
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    const index = list.findIndex(item => sanctionKey(item) === selectedKey);
    if (key === 'j' || key === 'k') {
      const target = list[index + (key === 'j' ? 1 : -1)];
      if (!target || pendingActionRef.current) return;
      event.preventDefault();
      void navigate(() => { setSelectedItemId(sanctionKey(target)); resetDecision(); });
      requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(target))?.focus());
      return;
    }
    if (!selectedItem || !canDecide || decisionDisabled) return;
    if (key === 'a') { event.preventDefault(); void handleAction(selectedItem, SANCTION_STATUS.APPROVED); }
    else if (key === 'r' || key === 'q') {
      event.preventDefault();
      if (key === 'q' && !canAsk) {
        setAnnouncement('이 문서에는 지금 보완을 요청할 수 없습니다.');
        return;
      }
      if (!rejectReason.trim()) {
        focusIntent.current = key === 'r' ? 'REJECT' : 'ASK';
        rejectReasonRef.current?.focus();
        setAnnouncement(key === 'r'
          ? '반려 사유를 적은 뒤 Ctrl+Enter 를 누르면 반려합니다. Esc 를 누르면 목록으로 돌아갑니다.'
          : '보완 요청 내용을 적은 뒤 Ctrl+Enter 를 누르면 보냅니다. Esc 를 누르면 목록으로 돌아갑니다.');
        return;
      }
      if (key === 'r') void handleAction(selectedItem, SANCTION_STATUS.REJECTED);
      else void handleSupplementRequest(selectedItem);
    }
  };
  useLayoutEffect(() => { keyHandler.current = handleFocusKey; });
  useEffect(() => {
    if (!focusMode) return undefined;
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [focusMode]);

  return (
    <>
    <MasterDetailPage
      title="결재 허브"
      description="결재를 올리고, 나에게 온 결재를 승인·반려하며, 올린 결재·처리한 결재·참조로 받은 결재를 조회합니다."
      breadcrumbItems={[{ label: '업무지원' }, { label: '전자결재' }]}
      actions={(
        <>
          <Button
            type="button"
            variant="outline"
            aria-label="결재함 목록 새로고침"
            disabled={isFetching}
            onClick={() => { void refetchApprovals(); }}
          >
            <RefreshCcw aria-hidden="true" className={cn(isFetching && 'animate-spin')} />
            새로고침
          </Button>
          {activeTab === 'PENDING' && canApprovePermission && (
            <Button type="button" variant={focusMode ? 'default' : 'outline'} aria-pressed={focusMode} onClick={() => {
              setFocusMode(current => !current);
              setAnnouncement(focusMode ? '집중 모드를 끝냈습니다.' : '집중 모드입니다. J·K 로 문서를 옮기고 A 승인, R 반려, Q 보완 요청(의견을 적고 Ctrl+Enter), Esc 로 끝냅니다.');
            }}>
              <Keyboard aria-hidden="true" /> 집중 모드
            </Button>
          )}
          {/*
            [2026-09-05] 종전에는 `/approvals/draft` 로 가는 링크였다. 그 화면은 하드코딩 양식 목업이라
            상신을 저장하지 않았고(demo-isolated 승인), demo 밖 프로필에서는 사라진 라우트였다.
            상신은 같은 화면의 다이얼로그가 실제 API 로 수행한다 — 페이지 이동이 없으므로 button 이다.
          */}
          {canDraft && (
          <Button type="button" disabled={isActionPending} onClick={() => {
            void navigate(() => { setRejectReason(''); decisionValidation.setFormErrors({}, false); setResubmission(undefined); setDraftOpen(true); });
          }}>
            <Plus aria-hidden="true" />
            새 결재 기안
          </Button>
          )}
        </>
      )}
      navigation={(
        <div className="space-y-2">
        <div role="tablist" aria-label="결재 대기열 전환" className="flex flex-wrap items-center gap-2">
          {(Object.keys(TAB_LABELS) as ApprovalTab[]).map((tab) => (
            <Button
              key={tab}
              type="button"
              role="tab"
              size="sm"
              variant={activeTab === tab ? 'default' : 'outline'}
              aria-selected={activeTab === tab}
              aria-describedby={tab === 'PENDING' && pendingTotal ? pendingCountId : undefined}
              disabled={isActionPending}
              onClick={() => handleTabChange(tab)}
            >
              {TAB_LABELS[tab]}
              {tab === 'PENDING' && pendingTotal ? (
                <span aria-hidden="true" className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs font-semibold tabular-nums">
                  {pendingTotal.toLocaleString()}
                </span>
              ) : null}
            </Button>
          ))}
          {pendingTotal ? <span id={pendingCountId} className="sr-only">대기 중인 결재 {pendingTotal.toLocaleString()}건</span> : null}
          {/*
            종전의 비활성 보관함 버튼은 걷었다. 그것이 가리키던 "처리한 문서를 다시 보는 곳" 은
            이제 세 번째 탭이 실제 API(/approvals/processed)로 제공한다(G10 — 죽은 컨트롤 금지).
          */}
        </div>
        {focusMode && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            집중 모드 · J 다음 문서 · K 이전 문서 · A 승인(10초 안에 되돌리기) · R 반려 · Q 보완 요청(의견을 적고 Ctrl+Enter, 의견 칸의 Esc 는 목록으로) · Esc 끝내기
          </p>
        )}
        <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
        {queueNotice && (
          <div role="alert" className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p>{queueNotice}</p>
            <Button type="button" size="sm" variant="ghost" onClick={() => setQueueNotice('')}>안내 닫기</Button>
          </div>
        )}
        {queued.length > 0 && (
          <section className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3" aria-label="처리 예정">
            {queued.map((id) => {
              // 이름은 대기열에 올릴 때 기억해 둔다 — 페이지·탭을 옮겨 목록에 없어도 '#번호' 로 바뀌지 않는다.
              const entry = queuedDocs[id];
              const listed = list.find(item => item.ifmlAtrzSn === id);
              const title = entry?.title ?? (listed ? documentLabel(listed) : `#${id}`);
              const actionNm = entry?.actionNm ?? '승인';
              return (
                <div key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>‘{title}’ {withObjectParticle(actionNm)} {APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다.</span>
                  <span className="flex gap-2">
                    <Button
                      ref={(node) => {
                        if (node) queueButtonRefs.current.set(id, node);
                        else queueButtonRefs.current.delete(id);
                      }}
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`‘${title}’ ${actionNm} 되돌리기`}
                      onClick={() => undoApprove(id)}
                    >
                      <Undo2 aria-hidden="true" /> 되돌리기
                    </Button>
                    <Button type="button" size="sm" aria-label={`‘${title}’ ${actionNm} 지금 처리`} onClick={() => commitNow(id)}>지금 처리</Button>
                  </span>
                </div>
              );
            })}
          </section>
        )}
        </div>
      )}
      masterTitle={TAB_LABELS[activeTab]}
      masterDescription={
        totalPages > 1
          ? `총 ${total.toLocaleString()}건 · ${page}/${totalPages} 페이지`
          : `총 ${total.toLocaleString()}건`
      }
      master={(
        <div className="space-y-3">
          <KeywordFilter
            label="제목·번호"
            placeholder="결재 문서 제목 또는 번호"
            value={keyword}
            onSearch={(next) => applyListFilter(() => setKeyword(next))}
            onReset={() => applyListFilter(() => { setKeyword(''); setPeriod(EMPTY_PERIOD); setStatusFilter(''); })}
          >
            <PeriodFilter label="요청일" value={period} onChange={(next) => applyListFilter(() => setPeriod(next))} />
            {activeTab !== 'PENDING' && (
              <div className="space-y-1">
                <label htmlFor={statusFilterId} className="text-[length:var(--font-size-body)] font-medium">문서 상태</label>
                <select
                  id={statusFilterId}
                  value={statusFilter}
                  onChange={(event) => {
                    const next = event.target.value as '' | SanctionStatusCode;
                    applyListFilter(() => setStatusFilter(next));
                  }}
                  className="h-[var(--control-h)] rounded-md border border-input bg-background px-2 text-[length:var(--font-size-body)]"
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </KeywordFilter>
          {bulkEligible.length > 1 && (
            <section className="space-y-2 rounded-md border border-border p-3" aria-label="여러 건 승인">
              <div className="flex flex-wrap items-center gap-2">
                {taskGroups.map(group => (
                  <Button key={group.label} type="button" size="sm" variant="outline" disabled={isActionPending}
                    onClick={() => setBulkSelected(group.keys)}>
                    {group.label} {group.keys.length}건 고르기
                  </Button>
                ))}
                {visibleBulkSelected.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" disabled={isActionPending} onClick={() => setBulkSelected([])}>선택 해제</Button>
                )}
              </div>
              <Button type="button" size="sm" disabled={visibleBulkSelected.length === 0 || isActionPending}
                aria-busy={pendingAction === 'BULK' || undefined}
                onClick={() => { void handleBulkApprove(bulkTargets); }}>
                <Check aria-hidden="true" /> 선택한 {visibleBulkSelected.length}건 승인
              </Button>
            </section>
          )}
          {isLoading ? (
            <div role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              결재함을 불러오는 중입니다.
            </div>
          ) : approvalsError ? (
            <div role="alert" className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive-emphasis">결재함을 불러오지 못했습니다.</p>
              <p className="text-xs text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void refetchApprovals(); }}>
                다시 시도
              </Button>
            </div>
          ) : list.length === 0 ? (
            <div role="status" className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                {keyword
                  ? emptyResultMessage(keyword, emptyMessage)
                  : hasListFilter ? '조건에 맞는 결재가 없습니다.' : emptyMessage}
              </p>
            </div>
          ) : (
            <ul aria-label={`${TAB_LABELS[activeTab]} 목록`} className="space-y-2">
              {list.map((item, index) => {
                const key = sanctionKey(item);
                // ⚠ 종전에는 undefined === undefined 라 **전 행이 동시에 선택 상태**로 렌더됐다.
                const isSelected = Boolean(key) && selectedKey === key;
                const turn = currentTurn(item, turnReference);
                const isQueued = item.ifmlAtrzSn !== undefined && queued.includes(item.ifmlAtrzSn);
                const bulkable = bulkEligible.some(entry => sanctionKey(entry) === key);
                return (
                  <li key={key || `approval-${index}`} data-testid="approval-item" className="flex items-start gap-2">
                    {bulkable && (
                      <input
                        type="checkbox"
                        className="mt-4 size-4 shrink-0"
                        aria-label={`${documentLabel(item)} 여러 건 승인에 고르기`}
                        checked={visibleBulkSelected.includes(key)}
                        disabled={isActionPending}
                        onChange={(event) => setBulkSelected(current => event.target.checked
                          ? [...current, key] : current.filter(entry => entry !== key))}
                      />
                    )}
                    <button
                      ref={(node) => {
                        if (node) itemButtonRefs.current.set(key, node);
                        else itemButtonRefs.current.delete(key);
                      }}
                      type="button"
                      data-a2-master-item
                      aria-current={isSelected ? 'true' : undefined}
                      aria-label={`${item.docTtl || item.taskSeNm || item.taskSeCd || '결재'} ${key ? `#${key}` : ''} 상세 열기`.replace(/\s+/g, ' ').trim()}
                      tabIndex={isSelected || (!hasVisibleSelection && index === 0) ? 0 : -1}
                      disabled={isActionPending}
                      onClick={() => {
                        if (key === selectedKey || pendingActionRef.current) return;
                        void navigate(() => { setSelectedItemId(key); resetDecision(); });
                      }}
                      className={cn(
                        'w-full min-w-0 rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                      )}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                          {item.docTtl || item.taskSeNm || item.taskSeCd || '일반 결재'}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {/* 참조로 받은 문서다 — 서버 판정(referenceViewer)으로만 표시한다. 이전 차수 참조자가 이 차수 결재자가 되면
                              처리할 차례가 있는 문서이므로 '참조' 로 부르지 않는다(처리 힌트가 있으면 결재 문서다). */}
                          {isReadOnlyReference(item, user?.esntlId) && <Badge variant="outline" className="shrink-0 text-xs font-bold">참조</Badge>}
                          {isQueued ? <Badge variant="secondary" className="shrink-0 text-xs font-bold">처리 예정</Badge> : <ApprovalStatusBadge aprvYn={item.aprvYn} />}
                        </span>
                      </span>
                      {item.stages?.length ? (() => {
                        const current = item.stages.find(stage => stage.status === 'ACTIVE' || stage.status === 'REJECTED') ?? item.stages[item.stages.length - 1];
                        const completed = current.approvers?.filter(person => person.status === 'APPROVED').length ?? 0;
                        return <span className="mt-1 block text-xs text-muted-foreground">{current.order}/{item.stages.length}단계 · 전원 {current.kind === 'AGREEMENT' ? '동의' : '승인'} {completed}/{current.approvers?.length ?? 0}</span>;
                      })() : null}
                      {turn && activeTab !== 'PENDING' && turn.waiting.length > 0 ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-foreground">
                          지금 차례: {turn.waiting.map(person => person.userNm || person.userId).join(', ')}
                          {turn.waiting.some(person => person.absent) && <AbsenceBadge absent />}
                          {turn.days !== null && <span className="text-muted-foreground">· {turn.days === 0 ? '오늘 차례가 됨' : `${turn.days}일째 대기`}</span>}
                        </span>
                      ) : turn && turn.days !== null && turn.days > 0 ? (
                        <span className="mt-1 block text-xs text-muted-foreground">{turn.days}일째 대기</span>
                      ) : null}
                      {item.openSupplement && <span className="mt-1 block text-xs font-semibold text-warning-emphasis">보완 요청 중</span>}
                      <span className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {/* 알림이 '결재(번호 N)' 으로 문서를 가리킨다 — 목록에서 같은 번호로 찾을 수 있어야 한다. */}
                          {item.ifmlAtrzSn !== undefined && <span className="tabular-nums">번호 {item.ifmlAtrzSn} · </span>}
                          {item.aplcntNm || item.aplcntId || '기안자 미상'}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatYmd(item.reqYmd)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && !approvalsError && totalPages > 1 && (
            <PagePagination
              total={total}
              page={page}
              size={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
      selectedItemLabel={selectedItem?.ifmlAtrzSn !== undefined ? `#${selectedItem.ifmlAtrzSn}` : undefined}
      detailTitle={selectedItem?.docTtl || selectedItem?.taskSeNm || selectedItem?.taskSeCd || '일반 결재 요청'}
      detailDescription={
        selectedItem && (selectedItem.aplcntNm || selectedItem.aplcntId)
          ? `기안자 ${selectedItem.aplcntNm || selectedItem.aplcntId}`
          : undefined
      }
      emptyDetailTitle="결재 문서를 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 문서를 고르면 결재선과 처리 의견이 표시됩니다."
      detail={selectedItem ? (
        <div className="space-y-6">
          {detailQuery.isPending && <p role="status" className="text-sm text-muted-foreground">문서 상세를 불러오는 중입니다.</p>}
          {detailQuery.isError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>문서 상세를 불러오지 못했습니다. 목록은 유지됩니다.</p><Button type="button" variant="outline" onClick={() => { void detailQuery.refetch(); }}>상세 다시 시도</Button></div>}
          {!hasListedDocument && rejectReason.length > 0 && <p role="status" className="rounded-md bg-warning/10 p-3 text-sm">작성한 의견이 있는 문서가 현재 목록에 없습니다. 입력은 이 문서에 보존했습니다. 최신 상태를 확인하거나 다른 문서를 선택해 주세요.</p>}
          {/* [2026-10-04 D4] 참조자는 읽기만 한다. 처리 버튼은 서버 힌트가 모두 거짓이라 생기지 않고, 이 안내도 서버 판정으로만 보인다.
              이전 차수 참조자가 이 차수 결재자가 됐으면 처리할 수 있으므로 '읽기만' 이라고 말하지 않는다. */}
          {detailQuery.data && isReadOnlyReference(detailQuery.data, user?.esntlId) && (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              참조로 받은 문서입니다. 읽기만 할 수 있으며, 문서가 승인·반려·회수되어도 계속 읽을 수 있습니다.
            </p>
          )}
          {actionError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>{actionError}</p><Button type="button" variant="outline" disabled={detailQuery.isFetching || isActionPending} onClick={() => { void detailQuery.refetch().then(result => { if (!result.isError) setNeedsActionReview(false); }); }}>최신 문서 확인</Button></div>}

          {(canDecide || rejectReason.length > 0) && (
            <section aria-label="결재 처리" className="space-y-3 rounded-md border border-primary/40 p-4">
              <FormErrorSummary
                errors={decisionValidation.errors}
                labels={APPROVAL_DECISION_LABELS}
                onNavigate={decisionValidation.focusError}
              />
              <label htmlFor="reject-reason" className="text-[length:var(--font-size-body)] font-semibold text-foreground">
                결재 의견 (반려·보완 요청 시 필수)
              </label>
              {/* 서버가 공백 사유를 거부하므로 반려에는 필수다. 종전에는 입력란 자체가 없어
                  반려 요청이 서버에 닿아도 실패했고, 기안자는 반려 이유를 볼 수 없었다. */}
              <p id="reject-reason-help" className="text-xs text-muted-foreground">
                승인 의견은 선택입니다. 반려하면 문서 전체가 종료되고, 보완 요청은 문서를 진행 중으로 둔 채 기안자에게 묻습니다. 입력한 의견은 문서 이력에 남습니다.
              </p>
              <textarea
                id="reject-reason"
                ref={rejectReasonRef}
                {...rejectReasonFieldProps}
                aria-label="결재 의견 (반려·보완 요청 시 필수)"
                aria-describedby={rejectReasonDescribedBy}
                value={rejectReason}
                disabled={isActionPending}
                readOnly={!canDecide}
                onChange={(event) => {
                  decisionValidation.clearError('reason');
                  setOpinionDocument(selectedItem);
                  setRejectReason(event.target.value);
                }}
                maxLength={4000}
                rows={3}
                className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                placeholder="검토 의견을 적어 주세요. 반려나 보완 요청은 무엇을 고쳐야 하는지 알려 주세요."
              />
              {decisionValidation.errors.reason ? (
                <p {...decisionValidation.messageProps('reason')} className="text-xs font-bold text-destructive-emphasis" />
              ) : null}
              {canDecide && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={decisionDisabled}
                    aria-busy={(selectedItem.ifmlAtrzSn !== undefined && committingIds.includes(selectedItem.ifmlAtrzSn)) || undefined}
                    onClick={() => { void handleAction(selectedItem, SANCTION_STATUS.APPROVED); }}
                  >
                    <Check aria-hidden="true" /> {isAgreement ? '합의 동의' : '결재 승인'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={decisionDisabled}
                    aria-busy={pendingAction === SANCTION_STATUS.REJECTED || undefined}
                    onClick={() => { void handleAction(selectedItem, SANCTION_STATUS.REJECTED); }}
                  >
                    <X aria-hidden="true" /> 결재 반려
                  </Button>
                  {canAsk && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={decisionDisabled}
                      aria-busy={pendingAction === 'ASK' || undefined}
                      onClick={() => { void handleSupplementRequest(selectedItem); }}
                    >
                      <MessageSquareReply aria-hidden="true" /> 보완 요청
                    </Button>
                  )}
                </div>
              )}
              {canDecide && <p className="text-xs text-muted-foreground">승인은 누른 뒤 {APPROVAL_UNDO_MS / 1000}초 동안 되돌릴 수 있습니다.</p>}
            </section>
          )}

          <div className="flex flex-wrap gap-2">
          {canCancel && (
        <Button
          type="button"
          variant="outline"
          disabled={isActionPending || cancelMutation.isPending}
          aria-busy={pendingAction === 'CANCEL' || cancelMutation.isPending || undefined}
          onClick={() => { void handleCancelDraft(selectedItem); }}
        >
          <Trash2 aria-hidden="true" /> 결재 회수
        </Button>
          )}
          {canCancel && canDraft && (
            <Button type="button" variant="outline" disabled={isActionPending} aria-busy={pendingAction === 'REVISE' || undefined}
              onClick={() => { void handleWithdrawAndRevise(selectedItem); }}>
              <PencilLine aria-hidden="true" /> 고쳐서 다시 올리기
            </Button>
          )}
          {canResubmit && <Button type="button" disabled={isActionPending} onClick={() => openDraft({ resubmission: selectedItem })}>수정 후 재상신</Button>}
          {canClone && <Button type="button" variant="ghost" disabled={isActionPending} onClick={() => openDraft({ template: selectedItem })}>
            <Copy aria-hidden="true" /> 복제해서 새로 기안
          </Button>}
          </div>
          {detailQuery.data && (
            <ApprovalCollaborationPanel
              // 문서와 차수가 바뀔 때만 새로 그린다. 버전으로 다시 그리면 결재자를 바꾸거나 다른 결재자가 처리할 때마다
              //   작성 중인 보완 답변·고친 본문이 사라지고 포커스가 문서 처음으로 빠졌다. 패널은 매번 최신 버전을 읽는다.
              key={`${selectedKey}-${detailQuery.data.atrzCycl ?? ''}`}
              document={detailQuery.data}
              canWrite={canDraft}
              disabled={isActionPending || !detailFresh}
            />
          )}
          <section aria-label="문서 내용" className="space-y-2 rounded-md border border-border p-4">
            <h3 className="font-semibold">{selectedItem.docTtl || '문서 내용'} · {selectedItem.atrzCycl ?? 1}차</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{selectedItem.docCn || '작성한 본문이 없습니다.'}</p>
          </section>
          <section aria-label="결재 진행 상태" className="rounded-md border border-border p-4">
            <h3 className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">결재 진행 상태</h3>
            <ApprovalStepper steps={workflowSteps} stages={selectedItem.stages} currentUserId={user?.esntlId} />
          </section>
          {detailQuery.data && (
            <ApprovalReferencePanel
              // 문서와 차수가 바뀔 때만 새로 그린다 — 참조자를 더해 버전이 올라가도 고르던 사람과 안내가 남는다.
              key={`${selectedKey}-${detailQuery.data.atrzCycl ?? ''}`}
              document={detailQuery.data}
              disabled={isActionPending || !detailFresh || selectedQueued || !hasListedDocument}
            />
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <User size={14} aria-hidden="true" /> 기안자
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {selectedItem.aplcntNm || selectedItem.aplcntId || '-'}
              </dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Calendar size={14} aria-hidden="true" /> 기안일
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {formatYmd(selectedItem.reqYmd)}
              </dd>
            </div>
          </dl>

          <section aria-label="처리 의견" className="rounded-md border border-border p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Info size={14} aria-hidden="true" /> 처리 의견
            </h3>
            {/* 서버가 내려준 의견만 보여준다 — 종전에는 의견이 없으면 '표준 프로세스에 따라
                상신되었습니다' 라는 창작 본문을 실제 문서 내용처럼 노출했다. */}
            {selectedItem.rjctRsnCn ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {selectedItem.rjctRsnCn}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">등록된 처리 의견이 없습니다.</p>
            )}
          </section>
          {previousRevisions.length ? <section aria-label="이전 차수 이력" className="space-y-3">
            <h3 className="font-semibold">이전 차수 이력</h3>
            {previousRevisions.map(revision => <details key={revision.atrzCycl} className="rounded-md border border-border p-4">
              <summary className="cursor-pointer font-semibold">{revision.atrzCycl}차 · {revision.docTtl || '제목 없음'} · {revision.aprvYn === SANCTION_STATUS.REJECTED ? '반려' : revision.aprvYn === SANCTION_STATUS.WITHDRAWN ? '회수' : revision.aprvYn === SANCTION_STATUS.APPROVED ? '승인 완료' : '대기'}</summary>
              <p className="my-3 whitespace-pre-wrap break-words text-sm">{revision.docCn || '작성한 본문이 없습니다.'}</p>
              <ApprovalStepper stages={revision.stages} currentUserId={user?.esntlId} accessibleLabel={`${revision.atrzCycl}차 결재선 진행`} />
            </details>)}
          </section> : null}
        </div>
      ) : undefined}
    />
    {/* 열릴 때만 마운트한다 — 닫았다 다시 열면 폼이 빈 상태로 시작한다. */}
    {isDraftOpen ? (
      <ApprovalDraftDialog
        isOpen
        onClose={() => { setDraftOpen(false); setDraftTemplate(undefined); }}
        onCreated={handleDraftCreated}
        resubmission={resubmission}
        template={draftTemplate}
      />
    ) : null}
    </>
  );
}
