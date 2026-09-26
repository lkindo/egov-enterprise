'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { Check, X, User, Calendar, Info, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
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
import { ApprovalStepper } from './ApprovalStepper';
import { ApprovalDraftDialog } from './ApprovalDraftDialog';
import {
  approvalMutationOptions,
  approvalQueryOptions,
  type ApprovalTab,
} from '@/queries/approval-query-options';

const EMPTY_APPROVALS: InformalSanctionDto[] = [];

/**
 * 마스터 목록 페이지 크기.
 *
 * [2026-09-05] 종전에는 `{ page: 0, size: 50 }` 한 페이지만 받고 페이저가 없어 51번째 문서부터
 * 화면에서 도달할 수 없었다. 페이지 상태는 URL 에 싣지 않는다(승인된 URL-state 부류가 아니다).
 */
const PAGE_SIZE = 20;

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
};

const EMPTY_MESSAGES: Record<ApprovalTab, string> = {
  PENDING: '대기 중인 결재가 없습니다.',
  SUBMITTED: '올린 결재가 없습니다. 오른쪽 위 \'새 결재 기안\' 으로 상신할 수 있습니다.',
  PROCESSED: '승인하거나 반려한 결재가 없습니다.',
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

/**
 * 결재 허브 — A2(마스터-디테일) archetype.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2.
 *
 * ⚠ archetype 판정 근거 — 이 화면은 카탈로그의 A4(작업 큐)가 아니라 A2다.
 *   A4 는 "선택 → 일괄 처리 → 부분 실패 보고"가 본체인데, 결재 API 는 건별
 *   `confirm(ifmlAtrzSn, aprvYn)` 하나뿐이라 일괄 처리 대상이 존재하지 않는다.
 *   실제 이 화면의 과업은 **왼쪽에서 문서를 고르고 오른쪽에서 결재선·의견을 보고 처리**하는
 *   마스터-디테일이다. 없는 기능에 맞춰 셸을 고르지 않는다.
 *
 * 종전에는 3열(대기열 네비 + 목록 카드 + 상세 카드)에 유리질 카드가 겹쳐 있어 상세가
 * 화면 밖으로 밀렸고, 목록은 6열 표라 좁은 폭에서 가로 스크롤이 났다. 마스터를 compact
 * 목록으로 바꾸고 범위 전환을 셸의 navigation 슬롯으로 올린다.
 */
export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDraftOpen, setDraftOpen] = useState(false);
  const [resubmission, setResubmission] = useState<InformalSanctionDto | undefined>();
  const [rejectReason, setRejectReason] = useState('');
  const [opinionDocument, setOpinionDocument] = useState<InformalSanctionDto | null>(null);
  const [pendingAction, setPendingAction] = useState<SanctionStatusCode | 'CANCEL' | null>(null);
  const [actionError, setActionError] = useState('');
  const [needsActionReview, setNeedsActionReview] = useState(false);
  const pendingActionRef = useRef(false);
  const itemButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null);
  const decisionValidation = useManualFormValidation(approvalDecisionSchema, {
    focusTargets: { reason: () => rejectReasonRef.current },
    labels: APPROVAL_DECISION_LABELS,
  });
  const navigate = useUnsavedChanges({ dirty: Boolean(rejectReason.trim()), pending: pendingAction !== null });

  const { data: approvalData, isLoading, isFetching, error: approvalsError, refetch: refetchApprovals } = useQuery(
    approvalQueryOptions.list(activeTab, { page: page - 1, size: PAGE_SIZE }),
  );
  const confirmMutation = useMutation(approvalMutationOptions.confirm(queryClient));
  const cancelMutation = useMutation(approvalMutationOptions.cancel(queryClient));

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
    if (rejectReason.length && opinionDocument) return list.find(item => sanctionKey(item) === sanctionKey(opinionDocument)) ?? opinionDocument;
    return list.find(item => sanctionKey(item) === selectedItemId) || (list.length > 0 ? list[0] : null);
  }, [list, selectedItemId, rejectReason, opinionDocument]);
  const detailQuery = useQuery({
    ...approvalQueryOptions.detail(selectedListItem?.ifmlAtrzSn ?? 0),
    enabled: selectedListItem?.ifmlAtrzSn !== undefined,
  });
  const selectedItem = detailQuery.data ?? selectedListItem;
  const previousRevisions = (detailQuery.data?.history ?? []).filter(
    revision => revision.atrzCycl !== undefined && revision.atrzCycl < (selectedItem?.atrzCycl ?? 1),
  );
  const hasVisibleSelection = list.some(item => sanctionKey(item) === selectedItemId);

  const handleTabChange = (tab: ApprovalTab) => {
    if (pendingActionRef.current || tab === activeTab) return;
    void navigate(() => {
    setActiveTab(tab);
    setPage(1);
    // 다른 대기열의 문서 식별자를 들고 넘어가면 첫 항목이 아니라 빈 상세가 남는다.
    setSelectedItemId(null);
    setRejectReason('');
    decisionValidation.setFormErrors({}, false);
    setActionError('');
    setNeedsActionReview(false);
    });
  };

  /** 페이지를 넘기면 이전 페이지의 선택은 stale 이므로 해제한다(메일 이력 A2 와 같은 규칙). */
  const handlePageChange = (nextPage: number) => {
    if (pendingActionRef.current || nextPage === page) return;
    void navigate(() => {
    setPage(nextPage);
    setSelectedItemId(null);
    setRejectReason('');
    decisionValidation.setFormErrors({}, false);
    setActionError('');
    setNeedsActionReview(false);
    });
  };

  /** 상신 직후에는 방금 올린 문서가 보이는 '내가 올린 결재' 첫 페이지로 옮겨 저장됐음을 눈으로 확인시킨다. */
  const handleDraftCreated = (ifmlAtrzSn: number) => {
    setActiveTab('SUBMITTED');
    setPage(1);
    setSelectedItemId(String(ifmlAtrzSn));
    setRejectReason('');
    decisionValidation.setFormErrors({}, false);
    setActionError('');
    setNeedsActionReview(false);
  };

  const handleAction = async (
    item: InformalSanctionDto,
    aprvYn: Extract<SanctionStatusCode, 'C' | 'R'>,
  ) => {
    const isReject = aprvYn === SANCTION_STATUS.REJECTED;
    const actionNm = isReject ? '반려' : item.stages?.find(stage => stage.status === 'ACTIVE')?.kind === 'AGREEMENT' ? '동의' : '승인';

    if (item.ifmlAtrzSn === undefined) {
      toast('문서 번호를 확인할 수 없어 처리할 수 없습니다.', 'error');
      return;
    }

    const validatedDecision = decisionValidation.validate({
      status: aprvYn,
      reason: rejectReason || undefined,
    });
    if (!validatedDecision) return;

    // confirm 모달이 열려 있는 동안에는 mutation.isPending 이 아직 false다. 같은 tick의
    // 연속 클릭도 즉시 차단하도록 await 전에 동기 선점하고, 취소·실패를 포함해 finally에서 푼다.
    if (pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction(aprvYn);

    try {
      const isConfirmed = await confirm({
        title: `결재 ${actionNm}`,
        message: isReject ? `‘${item.docTtl || `#${item.ifmlAtrzSn}`}’ 문서 전체를 반려합니다. 남은 모든 결재는 종료되고 사유가 기안자에게 전달됩니다.`
          : `‘${item.docTtl || `#${item.ifmlAtrzSn}`}’ 문서를 승인하시겠습니까? 이 단계의 전원이 승인해야 다음 단계가 시작됩니다.`,
        variant: isReject ? 'destructive' : 'default'
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
      // [2026-09-26 DIP C8] '다음 건' 은 처리한 문서의 바로 다음이다(마지막이었으면 바로 앞). 종전에는 처리한 문서가
      //   아닌 첫 문서로 가서, 목록 중간에서 처리하면 매번 맨 위로 되돌아갔다.
      const processedIndex = list.findIndex(entry => sanctionKey(entry) === sanctionKey(item));
      const next = processedIndex >= 0
        ? (list[processedIndex + 1] ?? list[processedIndex - 1])
        : list.find(entry => sanctionKey(entry) !== sanctionKey(item));
      if (activeTab === 'PENDING' && next) {
        setSelectedItemId(sanctionKey(next));
        requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(next))?.focus());
      } else requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(item))?.focus());
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) decisionValidation.setFormErrors(fieldErrors);
      const conflict = typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { status?: number } }).response?.status === 409;
      if (conflict) setNeedsActionReview(true);
      setActionError(conflict ? '다른 사용자가 문서를 변경했습니다. 입력한 의견은 유지됩니다. 최신 문서를 확인한 뒤 다시 처리해 주세요.' : `${actionNm} 처리 중 오류가 발생했습니다. 입력한 의견은 유지됩니다.`);
      toast(`${actionNm} 처리 중 오류가 발생했습니다.`, 'error');
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
        message: `‘${item.docTtl || `#${item.ifmlAtrzSn}`}’ 문서를 회수하면 진행 중인 결재와 남은 결재가 종료됩니다. 문서와 처리 이력은 보존되고 수정 후 새 차수로 재상신할 수 있습니다.`,
        confirmText: '결재 회수',
        variant: 'destructive',
      });
      if (!ok) return;

      await cancelMutation.mutateAsync({ ifmlAtrzSn: item.ifmlAtrzSn, version: item.version });
      toast('문서를 회수했습니다. 처리 이력은 보존됩니다.', 'success');
      setActionError('');
    } catch (error) {
      toast(extractErrorMessage(error, '기안 취소에 실패했습니다.'), 'error');
      setActionError('문서를 회수하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
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
  const hasListedDocument = list.some(item => sanctionKey(item) === sanctionKey(selectedItem ?? ({} as InformalSanctionDto)));
  const canDecide = Boolean(detailQuery.data?.canApprove) && hasListedDocument && !needsActionReview && !detailQuery.isError && !detailQuery.isFetching;
  const canCancel = Boolean(detailQuery.data?.canWithdraw) && !needsActionReview && !detailQuery.isError && !detailQuery.isFetching;
  const canResubmit = Boolean(detailQuery.data?.canResubmit) && !needsActionReview && !detailQuery.isError && !detailQuery.isFetching;
  const isAgreement = selectedItem?.stages?.find(stage => stage.status === 'ACTIVE')?.kind === 'AGREEMENT';
  const isActionPending = pendingAction !== null;
  const rejectReasonFieldProps = decisionValidation.fieldProps('reason');
  const rejectReasonDescribedBy = [
    'reject-reason-help',
    rejectReasonFieldProps['aria-describedby'],
  ].filter(Boolean).join(' ');

  return (
    <>
    <MasterDetailPage
      title="결재 허브"
      description="결재를 올리고, 나에게 온 결재를 승인·반려하며, 올린 결재와 처리한 결재를 조회합니다."
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
          {/*
            [2026-09-05] 종전에는 `/approvals/draft` 로 가는 링크였다. 그 화면은 하드코딩 양식 목업이라
            상신을 저장하지 않았고(demo-isolated 승인), demo 밖 프로필에서는 사라진 라우트였다.
            상신은 같은 화면의 다이얼로그가 실제 API 로 수행한다 — 페이지 이동이 없으므로 button 이다.
          */}
          <Button type="button" disabled={isActionPending} onClick={() => {
            void navigate(() => { setRejectReason(''); decisionValidation.setFormErrors({}, false); setResubmission(undefined); setDraftOpen(true); });
          }}>
            <Plus aria-hidden="true" />
            새 결재 기안
          </Button>
        </>
      )}
      navigation={(
        <div role="tablist" aria-label="결재 대기열 전환" className="flex flex-wrap items-center gap-2">
          {(Object.keys(TAB_LABELS) as ApprovalTab[]).map((tab) => (
            <Button
              key={tab}
              type="button"
              role="tab"
              size="sm"
              variant={activeTab === tab ? 'default' : 'outline'}
              aria-selected={activeTab === tab}
              disabled={isActionPending}
              onClick={() => handleTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
          {/*
            종전의 비활성 보관함 버튼은 걷었다. 그것이 가리키던 "처리한 문서를 다시 보는 곳" 은
            이제 세 번째 탭이 실제 API(/approvals/processed)로 제공한다(G10 — 죽은 컨트롤 금지).
          */}
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
              <p className="text-sm font-semibold text-foreground">{EMPTY_MESSAGES[activeTab]}</p>
            </div>
          ) : (
            <ul aria-label={`${TAB_LABELS[activeTab]} 목록`} className="space-y-2">
              {list.map((item, index) => {
                const key = sanctionKey(item);
                // ⚠ 종전에는 undefined === undefined 라 **전 행이 동시에 선택 상태**로 렌더됐다.
                const isSelected = Boolean(key) && sanctionKey(selectedItem ?? ({} as InformalSanctionDto)) === key;
                return (
                  <li key={key || `approval-${index}`} data-testid="approval-item">
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
                        if (key === sanctionKey(selectedItem ?? ({} as InformalSanctionDto)) || pendingActionRef.current) return;
                        void navigate(() => { setSelectedItemId(key); setRejectReason(''); setActionError(''); setNeedsActionReview(false); decisionValidation.setFormErrors({}, false); });
                      }}
                      className={cn(
                        'w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                      )}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                          {item.docTtl || item.taskSeNm || item.taskSeCd || '일반 결재'}
                        </span>
                        <ApprovalStatusBadge aprvYn={item.aprvYn} />
                      </span>
                      {item.stages?.length ? (() => {
                        const current = item.stages.find(stage => stage.status === 'ACTIVE' || stage.status === 'REJECTED') ?? item.stages[item.stages.length - 1];
                        const completed = current.approvers?.filter(person => person.status === 'APPROVED').length ?? 0;
                        return <span className="mt-1 block text-xs text-muted-foreground">{current.order}/{item.stages.length}단계 · 전원 {current.kind === 'AGREEMENT' ? '동의' : '승인'} {completed}/{current.approvers?.length ?? 0}</span>;
                      })() : null}
                      <span className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
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
      detailActions={canDecide && selectedItem ? (
        <>
          <Button
            type="button"
            disabled={isActionPending}
            aria-busy={pendingAction === SANCTION_STATUS.APPROVED || undefined}
            onClick={() => { void handleAction(selectedItem, SANCTION_STATUS.APPROVED); }}
          >
            <Check aria-hidden="true" /> {isAgreement ? '합의 동의' : '결재 승인'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isActionPending}
            aria-busy={pendingAction === SANCTION_STATUS.REJECTED || undefined}
            onClick={() => { void handleAction(selectedItem, SANCTION_STATUS.REJECTED); }}
          >
            <X aria-hidden="true" /> 결재 반려
          </Button>
        </>
      ) : undefined}
      emptyDetailTitle="결재 문서를 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 문서를 고르면 결재선과 처리 의견이 표시됩니다."
      detail={selectedItem ? (
        <div className="space-y-6">
          {detailQuery.isPending && <p role="status" className="text-sm text-muted-foreground">문서 상세를 불러오는 중입니다.</p>}
          {detailQuery.isError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>문서 상세를 불러오지 못했습니다. 목록은 유지됩니다.</p><Button type="button" variant="outline" onClick={() => { void detailQuery.refetch(); }}>상세 다시 시도</Button></div>}
          {!hasListedDocument && rejectReason.length > 0 && <p role="status" className="rounded-md bg-warning/10 p-3 text-sm">작성한 의견이 있는 문서가 현재 목록에 없습니다. 입력은 이 문서에 보존했습니다. 최신 상태를 확인하거나 다른 문서를 선택해 주세요.</p>}
          {actionError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>{actionError}</p><Button type="button" variant="outline" disabled={detailQuery.isFetching || isActionPending} onClick={() => { void detailQuery.refetch().then(result => { if (!result.isError) setNeedsActionReview(false); }); }}>최신 문서 확인</Button></div>}
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
          {canResubmit && <Button type="button" disabled={isActionPending} onClick={() => {
            void navigate(() => { setRejectReason(''); decisionValidation.setFormErrors({}, false); setResubmission(selectedItem); setDraftOpen(true); });
          }}>수정 후 재상신</Button>}
          </div>
          <section aria-label="문서 내용" className="space-y-2 rounded-md border border-border p-4">
            <h3 className="font-semibold">{selectedItem.docTtl || '문서 내용'} · {selectedItem.atrzCycl ?? 1}차</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{selectedItem.docCn || '작성한 본문이 없습니다.'}</p>
          </section>
          <section aria-label="결재 진행 상태" className="rounded-md border border-border p-4">
            <h3 className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">결재 진행 상태</h3>
            <ApprovalStepper steps={workflowSteps} stages={selectedItem.stages} currentUserId={user?.esntlId} />
          </section>

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

          {(canDecide || rejectReason.length > 0) && (
            <section aria-label="결재 의견" className="rounded-md border border-border p-4">
              <FormErrorSummary
                errors={decisionValidation.errors}
                labels={APPROVAL_DECISION_LABELS}
                onNavigate={decisionValidation.focusError}
              />
              <label htmlFor="reject-reason" className="text-[length:var(--font-size-body)] font-semibold text-foreground">
                결재 의견 (반려 시 필수)
              </label>
              {/* 서버가 공백 사유를 거부하므로 반려에는 필수다. 종전에는 입력란 자체가 없어
                  반려 요청이 서버에 닿아도 실패했고, 기안자는 반려 이유를 볼 수 없었다. */}
              <p id="reject-reason-help" className="mt-1 text-xs text-muted-foreground">
                승인 의견은 선택이며 반려할 때는 사유가 필요합니다. 입력한 의견은 문서 이력에 남습니다.
              </p>
              <textarea
                id="reject-reason"
                ref={rejectReasonRef}
                {...rejectReasonFieldProps}
                aria-label="결재 의견 (반려 시 필수)"
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
                className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                placeholder="검토 의견을 적어 주세요. 반려할 때는 보완할 내용을 알려 주세요."
              />
              {decisionValidation.errors.reason ? (
                <p {...decisionValidation.messageProps('reason')} className="mt-1 text-xs font-bold text-destructive-emphasis" />
              ) : null}
            </section>
          )}

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
              <summary className="cursor-pointer font-semibold">{revision.atrzCycl}차 · {revision.docTtl || '제목 없음'} · {revision.aprvYn === 'R' ? '반려' : revision.aprvYn === 'W' ? '회수' : revision.aprvYn === 'C' ? '승인 완료' : '대기'}</summary>
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
        onClose={() => setDraftOpen(false)}
        onCreated={handleDraftCreated}
        resubmission={resubmission}
      />
    ) : null}
    </>
  );
}
