'use client';

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { Check, X, Plus, Trash2, MessageSquareReply, Copy, PencilLine } from 'lucide-react';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useManualFormValidation, type ManualFormErrors } from '@/hooks/useManualFormValidation';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalConfirmRequestSchema } from '@/types/generated-zod';
import {
  SANCTION_STATUS,
  type InformalSanctionDto,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';
import { usePageClamp } from '@/lib/hooks/use-page-clamp';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { TabPanel } from '@/app/components/ui/standard-tabs';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { PeriodFilter, EMPTY_PERIOD, type PeriodValue } from '@/app/components/patterns/period-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { ApprovalDraftDialog } from './ApprovalDraftDialog';
import { ApprovalHubNavigation, ApprovalHubToolbar } from './ApprovalHubNavigation';
import { ApprovalQueueList } from './ApprovalQueueList';
import { ApprovalDetailNotices, ApprovalDocumentView } from './ApprovalDocumentSections';
import { APPROVAL_UNDO_MS, pendingApprovalCommits } from './approval-undo-queue';
import { useApprovalUndoQueue } from './useApprovalUndoQueue';
import { useApprovalFocusMode } from './useApprovalFocusMode';
import { useApprovalBulkSelection } from './useApprovalBulkSelection';
import {
  approvalKeys,
  approvalMutationOptions,
  approvalQueryOptions,
  type ApprovalDecision,
  type ApprovalTab,
} from '@/queries/approval-query-options';
import { canPermission } from '@/lib/auth/permissions';
import { hasDeliveryChannel } from '@/lib/delivery-channels';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { linkedTab } from './approval-tabs';
import { documentLabel, isAgreementStage } from './approval-decision';
import {
  APPROVAL_QUEUE_PANEL_ID,
  EMPTY_APPROVALS,
  EMPTY_MESSAGES,
  PAGE_SIZE,
  STATUS_FILTER_OPTIONS,
  approvalTabId,
  isReadOnlyReference,
  linkedDocument,
  sanctionKey,
  type ApprovalPendingAction,
} from './approval-hub-model';

/*
 * [2026-10-18 허브 분해] 상수·순수 판정은 approval-hub-model.ts, 머리 단추·탭·처리 예정은 ApprovalHubNavigation.tsx, 마스터 목록은
 * ApprovalQueueList.tsx, 상세의 안내·문서 영역은 ApprovalDocumentSections.tsx, 되돌리기 대기열·집중 모드·여러 건 승인 대상은
 * 각 use* 훅으로 옮겼다(동작·문구·테스트 id 그대로). 대기열 상태와 알림 링크(URL 을 읽고 지운다), 처리 동작(보완 요청·여러 건 승인·
 * 회수·고쳐서 다시 올리기), 결재 의견 칸과 처리·회수 단추는 이 파일에 남는다 — 폼 검증 census 가 처리기와 그 버튼을 이 파일의
 * 이름으로 잇고, URL 상태 census 가 이 파일의 읽기·쓰기를 센다.
 */

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

const APPROVAL_DECISION_LABELS = {
  reason: '결재 의견',
  status: '결재 상태',
};

// 화면이 입력받는 것은 상태와 사유다 — 버전은 문서에서 와서 제출 때 싣는다(서버 필수, 2026-10-27).
const approvalDecisionSchema = ApprovalConfirmRequestSchema.omit({ version: true })
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

type Navigate = ReturnType<typeof useUnsavedChanges>;

/**
 * 결재 허브의 대기열 — 탭·페이지·조회 조건·고른 문서, 알림 링크, 목록·상세 질의(2026-10-18 허브 분해 때 허브 안에서 나눴다 —
 * 상태·질의·판정 그대로). 탭·조건·페이지를 옮기는 일은 작성 중 의견 확인(navigate)을 거치고 처리 결정을 비운다(resetDecision).
 */
function useApprovalQueue({
  queryClient,
  navigate,
  resetDecision,
  pendingActionRef,
  rejectReason,
  opinionDocument,
  setRejectReason,
  setOpinionDocument,
}: {
  queryClient: QueryClient;
  navigate: Navigate;
  resetDecision: () => void;
  pendingActionRef: MutableRefObject<boolean>;
  rejectReason: string;
  opinionDocument: InformalSanctionDto | null;
  setRejectReason: (reason: string) => void;
  setOpinionDocument: (item: InformalSanctionDto | null) => void;
}) {
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(docParam);
  // 알림으로 연 문서. 목록의 현재 페이지에 없어도 상세를 연다.
  const [linkedId, setLinkedId] = useState<string | null>(docParam);
  const [appliedLink, setAppliedLink] = useState(`${tabParam}|${docParam}`);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [now] = useState(() => Date.now());
  if (appliedLink !== `${tabParam}|${docParam}`) {
    // 같은 화면에서 다른 알림을 눌렀을 때. 렌더 중 상태 조정이라 effect 로 한 번 더 그리지 않는다.
    setAppliedLink(`${tabParam}|${docParam}`);
    if (tabParam) setActiveTab(tabParam);
    if (docParam) { setSelectedItemId(docParam); setLinkedId(docParam); setPage(1); }
    // 작성 중 의견이 있었다면 이동 전에 '변경 버리고 이동' 을 이미 확인받았다. 의견을 그대로 두면 그 문서가 계속
    // 선택되어 링크 문서가 열리지 않는다.
    if (tabParam || docParam) { setRejectReason(''); setOpinionDocument(null); }
  }

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
    approvalQueryOptions.list(activeTab, { page, size: PAGE_SIZE, ...listFilters }),
  );
  // 대기 탭의 건수 배지 — 조건과 무관한 전체 대기 건수다. 처리하면 목록 무효화와 함께 다시 읽힌다.
  const { data: pendingTotal } = useQuery({
    ...approvalQueryOptions.list('PENDING', { page: 1, size: 1 }),
    select: (response) => response.total ?? 0,
  });

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
  const hasVisibleSelection = list.some(item => sanctionKey(item) === selectedItemId);
  // 단계가 시작된 날을 목록을 읽은 시각 기준으로 센다 — 화면을 오래 열어 두어도 다시 읽으면 날짜가 따라온다.
  const turnReference = dataUpdatedAt || now;

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

  return {
    activeTab, page, keyword, setKeyword, period, setPeriod, statusFilter, setStatusFilter, setSelectedItemId, linkedId,
    bulkSelected, setBulkSelected, hasListFilter, list, total, totalPages, isLoading, isFetching, approvalsError, refetchApprovals,
    pendingTotal, selectedListItem, detailQuery, selectedItem, hasVisibleSelection, turnReference,
    applyListFilter, handleTabChange, handlePageChange, handleDraftCreated,
  };
}

/**
 * 상세의 처리 동작 — 처리한 뒤 다음 문서로 옮기기, 처리 실패 안내, 보완 요청·여러 건 승인·회수·고쳐서 다시 올리기·기안 열기
 * (2026-10-18 허브 분해 때 허브 안에서 나눴다 — 문구·잠금·순서 그대로). 진행 중인 처리(pendingAction)와 동기 잠금(pendingActionRef)은
 * 허브의 것이고, 이 처리기들이 같은 이름으로 잡고 푼다 — 폼 검증 census 가 처리기와 버튼의 disabled·aria-busy 를 이 이름으로 잇는다.
 */
function useApprovalDocumentActions({
  queryClient,
  toast,
  confirm,
  confirmMutation,
  cancelMutation,
  supplementMutation,
  decisionValidation,
  pendingActionRef,
  setPendingAction,
  isActionPending,
  rejectReason,
  setRejectReason,
  setActionError,
  setNeedsActionReview,
  activeTab,
  list,
  setSelectedItemId,
  setBulkSelected,
  itemButtonRefs,
  navigate,
  setResubmission,
  setDraftTemplate,
  setDraftOpen,
}: {
  queryClient: QueryClient;
  toast: ReturnType<typeof useToast>['toast'];
  confirm: ReturnType<typeof useConfirm>;
  confirmMutation: { mutateAsync: (decision: ApprovalDecision) => Promise<unknown> };
  cancelMutation: { mutateAsync: (variables: { ifmlAtrzSn: number; version?: number }) => Promise<unknown> };
  supplementMutation: { mutateAsync: (variables: { ifmlAtrzSn: number; question: string; version: number }) => Promise<unknown> };
  decisionValidation: { setFormErrors: (errors: ManualFormErrors, focus?: boolean) => void };
  pendingActionRef: MutableRefObject<boolean>;
  setPendingAction: (action: ApprovalPendingAction | null) => void;
  isActionPending: boolean;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  setActionError: (message: string) => void;
  setNeedsActionReview: (value: boolean) => void;
  activeTab: ApprovalTab;
  list: InformalSanctionDto[];
  setSelectedItemId: (id: string | null) => void;
  setBulkSelected: Dispatch<SetStateAction<string[]>>;
  itemButtonRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  navigate: Navigate;
  setResubmission: (item: InformalSanctionDto | undefined) => void;
  setDraftTemplate: (item: InformalSanctionDto | undefined) => void;
  setDraftOpen: (open: boolean) => void;
}) {
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
      // [2026-10-16 GAP-COMPOSE-001] 알림 기능이 없는 구성에서는 답하면 알림이 온다고 말하지 않는다.
      toast(hasDeliveryChannel('notification') ? '보완을 요청했습니다. 기안자가 답하면 알림이 옵니다.' : '보완을 요청했습니다.', 'success');
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
        // 버전 없이 보내지 않는다 — 서버가 필수로 대조한다(2026-10-27).
        if (typeof item.version !== 'number') {
          failures.push(`‘${documentLabel(item)}’: 문서 버전을 확인할 수 없어 보내지 않았습니다. 목록을 새로 고쳐 주세요.`);
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

  return {
    moveAfter, reportDecisionFailure, handleSupplementRequest, handleBulkApprove, handleCancelDraft, handleWithdrawAndRevise, openDraft,
  };
}

/**
 * 대기열의 조회 조건 — 제목·번호, 요청일 기간, 문서 상태(대기함 밖의 탭). 조건을 바꾸는 일은 대기열의 applyListFilter 를 거친다
 * (작성 중 의견 확인 → 1페이지·선택 해제). 2026-10-18 허브 분해 때 허브 안에서 나눴다(마크업 그대로).
 */
function ApprovalQueueFilter({
  keyword, period, statusFilter, showStatus, applyListFilter, setKeyword, setPeriod, setStatusFilter,
}: {
  keyword: string;
  period: PeriodValue;
  statusFilter: '' | SanctionStatusCode;
  showStatus: boolean;
  applyListFilter: (apply: () => void) => void;
  setKeyword: (keyword: string) => void;
  setPeriod: (period: PeriodValue) => void;
  setStatusFilter: (status: '' | SanctionStatusCode) => void;
}) {
  const statusFilterId = useId();
  return (
    <KeywordFilter
      label="제목·번호"
      placeholder="결재 문서 제목 또는 번호"
      value={keyword}
      onSearch={(next) => applyListFilter(() => setKeyword(next))}
      onReset={() => applyListFilter(() => { setKeyword(''); setPeriod(EMPTY_PERIOD); setStatusFilter(''); })}
    >
      <PeriodFilter label="요청일" value={period} onChange={(next) => applyListFilter(() => setPeriod(next))} />
      {showStatus && (
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
  );
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
 *   있다(useApprovalUndoQueue). 반려는 되돌릴 수 없어 확인을 거친다. 여러 건은 고른 뒤 한 번 확인하고
 *   보낸다(업무 구분별로 한꺼번에 고를 수 있다). 키보드만으로 처리하는 집중 모드가 있다.
 * - 추적: 목록이 지금 차례인 사람과 기다린 날을 보이고, 기안자는 재알림·결재자 바꾸기·보완 답변을 상세에서 한다.
 * - 진입: 알림 링크(`?tab=…&doc=…`)가 그 문서를 바로 연다.
 */
export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDraftOpen, setDraftOpen] = useState(false);
  const [resubmission, setResubmission] = useState<InformalSanctionDto | undefined>();
  const [draftTemplate, setDraftTemplate] = useState<InformalSanctionDto | undefined>();
  const [rejectReason, setRejectReason] = useState('');
  const [opinionDocument, setOpinionDocument] = useState<InformalSanctionDto | null>(null);
  const [pendingAction, setPendingAction] = useState<ApprovalPendingAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [needsActionReview, setNeedsActionReview] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const pendingActionRef = useRef(false);
  const itemButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);
  // 집중 모드에서 R·Q 로 의견 칸에 들어왔을 때 Ctrl+Enter 로 마칠 동작.
  const focusIntent = useRef<'REJECT' | 'ASK' | null>(null);
  const decisionValidation = useManualFormValidation(approvalDecisionSchema, {
    focusTargets: { reason: () => rejectReasonRef.current },
    labels: APPROVAL_DECISION_LABELS,
  });
  const navigate = useUnsavedChanges({ dirty: Boolean(rejectReason.trim()), pending: pendingAction !== null });
  const confirmMutation = useMutation(approvalMutationOptions.confirm(queryClient));
  const cancelMutation = useMutation(approvalMutationOptions.cancel(queryClient));
  const supplementMutation = useMutation(approvalMutationOptions.requestSupplement(queryClient));

  const resetDecision = () => {
    setRejectReason('');
    decisionValidation.setFormErrors({}, false);
    setActionError('');
    setNeedsActionReview(false);
    focusIntent.current = null;
  };

  const {
    activeTab, page, keyword, setKeyword, period, setPeriod, statusFilter, setStatusFilter, setSelectedItemId, linkedId,
    bulkSelected, setBulkSelected, hasListFilter, list, total, totalPages, isLoading, isFetching, approvalsError, refetchApprovals,
    pendingTotal, selectedListItem, detailQuery, selectedItem, hasVisibleSelection, turnReference,
    applyListFilter, handleTabChange, handlePageChange, handleDraftCreated,
  } = useApprovalQueue({ queryClient, navigate, resetDecision, pendingActionRef, rejectReason, opinionDocument, setRejectReason, setOpinionDocument });
  const isActionPending = pendingAction !== null;
  const {
    moveAfter, reportDecisionFailure, handleSupplementRequest, handleBulkApprove, handleCancelDraft, handleWithdrawAndRevise, openDraft,
  } = useApprovalDocumentActions({
    queryClient, toast, confirm, confirmMutation, cancelMutation, supplementMutation, decisionValidation, pendingActionRef,
    setPendingAction, isActionPending, rejectReason, setRejectReason, setActionError, setNeedsActionReview, activeTab, list,
    setSelectedItemId, setBulkSelected, itemButtonRefs, navigate, setResubmission, setDraftTemplate, setDraftOpen,
  });

  // 단계와 참여자 권한은 서버가 판정한다. 목록 탭이나 전체 문서 상태만으로 추론하지 않는다.
  const selectedKey = selectedItem ? sanctionKey(selectedItem) : '';
  const { queued, committingIds, queuedDocs, queueNotice, setQueueNotice, queueButtonRefs, scheduleApprove, undoApprove, commitNow } = useApprovalUndoQueue({
    confirmMutation, queryClient, toast, activeTab, list, selectedListItem, selectedKey, rejectReason, opinionDocument, setRejectReason,
    setOpinionDocument, setSelectedItemId, setBulkSelected, setActionError, setAnnouncement, itemButtonRefs, moveAfter, reportDecisionFailure,
    clearDecisionErrors: () => decisionValidation.setFormErrors({}, false),
  });
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
  const decisionDisabled = isActionPending || selectedQueued;
  const rejectReasonFieldProps = decisionValidation.fieldProps('reason');
  const rejectReasonDescribedBy = [
    'reject-reason-help',
    rejectReasonFieldProps['aria-describedby'],
  ].filter(Boolean).join(' ');
  const { bulkEligible, taskGroups, bulkTargets, visibleBulkSelected } = useApprovalBulkSelection({
    activeTab, canApprovePermission, list, queued, committingIds, bulkSelected,
  });

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
    const version = item.version;
    if (typeof version !== 'number') {
      toast('문서 버전을 확인할 수 없어 처리할 수 없습니다. 목록을 새로 고쳐 주세요.', 'error');
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
        version,
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

  /** 작성 중 의견 확인을 거쳐 다른 문서를 고른다(목록 행·집중 모드의 J·K). */
  const selectDocument = (key: string) => { void navigate(() => { setSelectedItemId(key); resetDecision(); }); };
  const { focusMode, toggleFocusMode } = useApprovalFocusMode({
    activeTab, isDraftOpen, list, selectedKey, selectedItem, canDecide, canAsk, decisionDisabled, rejectReason, rejectReasonRef,
    focusIntentRef: focusIntent, itemButtonRefs, pendingActionRef, setAnnouncement, selectDocument, handleAction, handleSupplementRequest,
  });

  return (
    <>
    <MasterDetailPage
      title="결재 허브"
      description="결재를 올리고, 나에게 온 결재를 승인·반려하며, 올린 결재·처리한 결재·참조로 받은 결재를 조회합니다."
      breadcrumbItems={[{ label: '업무지원' }, { label: '전자결재' }]}
      actions={(
        <>
          <ApprovalHubToolbar
            isFetching={isFetching}
            onRefresh={() => { void refetchApprovals(); }}
            showFocusMode={activeTab === 'PENDING' && canApprovePermission}
            focusMode={focusMode}
            onToggleFocusMode={toggleFocusMode}
          />
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
        <ApprovalHubNavigation
          tabLabels={TAB_LABELS}
          activeTab={activeTab}
          pendingTotal={pendingTotal}
          isActionPending={isActionPending}
          onTabChange={handleTabChange}
          focusMode={focusMode}
          announcement={announcement}
          queueNotice={queueNotice}
          onDismissNotice={() => setQueueNotice('')}
          queued={queued}
          queuedDocs={queuedDocs}
          list={list}
          queueButtonRefs={queueButtonRefs}
          onUndo={undoApprove}
          onCommitNow={commitNow}
        />
      )}
      masterTitle={TAB_LABELS[activeTab]}
      masterDescription={
        totalPages > 1
          ? `총 ${total.toLocaleString()}건 · ${page}/${totalPages} 페이지`
          : `총 ${total.toLocaleString()}건`
      }
      master={(
        // 탭이 고르는 것은 이 대기열(조회 조건·목록·페이지)이다. 상세는 고른 문서를 따른다.
        <TabPanel id={APPROVAL_QUEUE_PANEL_ID} aria-labelledby={approvalTabId(activeTab)} className="space-y-3">
          <ApprovalQueueFilter
            keyword={keyword}
            period={period}
            statusFilter={statusFilter}
            showStatus={activeTab !== 'PENDING'}
            applyListFilter={applyListFilter}
            setKeyword={setKeyword}
            setPeriod={setPeriod}
            setStatusFilter={setStatusFilter}
          />
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
          <ApprovalQueueList
            listLabel={TAB_LABELS[activeTab]}
            showTurn={activeTab !== 'PENDING'}
            isLoading={isLoading}
            hasError={Boolean(approvalsError)}
            onRetry={() => { void refetchApprovals(); }}
            emptyText={keyword
              ? emptyResultMessage(keyword, emptyMessage)
              : hasListFilter ? '조건에 맞는 결재가 없습니다.' : emptyMessage}
            list={list}
            selectedKey={selectedKey}
            hasVisibleSelection={hasVisibleSelection}
            turnReference={turnReference}
            queued={queued}
            bulkEligible={bulkEligible}
            visibleBulkSelected={visibleBulkSelected}
            isActionPending={isActionPending}
            viewerId={user?.esntlId}
            itemButtonRefs={itemButtonRefs}
            onSelect={(key) => {
              if (key === selectedKey || pendingActionRef.current) return;
              selectDocument(key);
            }}
            onToggleBulk={(key, checked) => setBulkSelected(current => (checked
              ? [...current, key] : current.filter(entry => entry !== key)))}
            total={total}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </TabPanel>
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
          <ApprovalDetailNotices
            isPending={detailQuery.isPending}
            isError={detailQuery.isError}
            onRetryDetail={() => { void detailQuery.refetch(); }}
            showUnlistedOpinion={!hasListedDocument && rejectReason.length > 0}
            readOnlyReference={Boolean(detailQuery.data && isReadOnlyReference(detailQuery.data, user?.esntlId))}
            actionError={actionError}
            reviewDisabled={detailQuery.isFetching || isActionPending}
            onReview={() => { void detailQuery.refetch().then(result => { if (!result.isError) setNeedsActionReview(false); }); }}
          />

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
          <ApprovalDocumentView
            document={selectedItem}
            detail={detailQuery.data}
            selectedKey={selectedKey}
            canWrite={canDraft}
            collaborationDisabled={isActionPending || !detailFresh}
            referenceDisabled={isActionPending || !detailFresh || selectedQueued || !hasListedDocument}
            currentUserId={user?.esntlId}
          />
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
