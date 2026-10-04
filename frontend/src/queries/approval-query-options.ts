import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import {
  approvalUserService,
  type ApprovalDraftRequest,
  type ApprovalResubmissionRequest,
  type ApprovalSupplementAnswer,
  type ApprovalTemporaryDraftReference,
  type ApprovalTemporaryDraftRequest,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';

/**
 * 결재함 탭.
 *
 * - `PENDING`   — 결재자 본인에게 온 대기 건(`/approvals/pending`)
 * - `SUBMITTED` — 내가 올린 결재(신청자 기준, `/approvals/my`)
 * - `PROCESSED` — 결재자 본인이 승인·반려한 건(`/approvals/processed`)
 * - `REFERENCED` — 내가 참조자로 지정된 건(`/approvals/referenced`, 2026-10-04 D4). 읽기만 하며 모든 상태가 남는다
 *
 * [2026-09-05] 종전 탭 `HISTORY` 는 라벨이 '결재 처리 이력' 이면서 `/approvals/my`(신청자 기준)를
 * 불렀다 — 결재자가 처리한 문서는 어디에서도 다시 볼 수 없었고, 신청자는 자기 신청서를 엉뚱한 이름의
 * 탭에서 찾아야 했다. 탭 이름을 실제 질의 축에 맞추고 처리한 결재를 별도 탭으로 분리한다.
 */
export type ApprovalTab = 'PENDING' | 'SUBMITTED' | 'PROCESSED' | 'REFERENCED';

export interface ApprovalListParams {
  page?: number;
  size?: number;
  keyword?: string;
  fromYmd?: string;
  toYmd?: string;
  /** 대기 탭에서는 쓰지 않는다(대기함은 늘 대기 문서다). 참조된 결재 탭에서는 문서의 지금 상태다. */
  status?: SanctionStatusCode;
}

export interface ApprovalDecision {
  ifmlAtrzSn: number;
  status: Extract<SanctionStatusCode, 'C' | 'R'>;
  reason?: string;
  version?: number;
}

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  list: (tab: ApprovalTab, params: ApprovalListParams) => (
    [...approvalKeys.lists(), tab, params] as const
  ),
  taskTypes: () => [...approvalKeys.all, 'task-types'] as const,
  suggestions: (taskSeCd: string) => [...approvalKeys.all, 'line-suggestions', taskSeCd] as const,
  details: () => [...approvalKeys.all, 'detail'] as const,
  detail: (id: number) => [...approvalKeys.details(), id] as const,
  /**
   * 기안 임시저장(D3). 'detail'·'list' 접두 밖에 둔다 — 임시저장 번호는 문서 번호와 다른 순번이라 같은 접두에 두면
   * 임시저장 5번과 문서 5번이 한 캐시를 쓰고, 목록 무효화가 임시저장까지 건드린다.
   */
  temporaryDrafts: () => [...approvalKeys.all, 'temporary-drafts'] as const,
  temporaryDraftList: () => [...approvalKeys.temporaryDrafts(), 'list'] as const,
  temporaryDraft: (temporaryDraftSn: number) => [...approvalKeys.temporaryDrafts(), 'detail', temporaryDraftSn] as const,
};

/** 상신할 내용과, 이어 쓴 임시저장이 있으면 그 번호·버전. */
export interface ApprovalCreateInput {
  request: ApprovalDraftRequest;
  temporaryDraft?: ApprovalTemporaryDraftReference;
}

/** 임시저장. 번호가 없으면 새로 만들고, 있으면 그 버전으로 바꾼다. */
export interface ApprovalTemporarySaveInput {
  temporaryDraftSn?: number;
  request: ApprovalTemporaryDraftRequest;
}

function listByTab(tab: ApprovalTab, params: ApprovalListParams) {
  switch (tab) {
    case 'PENDING':
      // 대기함은 상태 조건을 받지 않는다 — 넘기지 않는다.
      return approvalUserService.getPending({
        page: params.page, size: params.size, keyword: params.keyword, fromYmd: params.fromYmd, toYmd: params.toYmd,
      });
    case 'SUBMITTED':
      return approvalUserService.getMyHistory(params);
    case 'PROCESSED':
      return approvalUserService.getProcessed(params);
    case 'REFERENCED':
      return approvalUserService.getReferenced(params);
    default: {
      // 탭을 더하고 여기를 빠뜨리면 목록이 조용히 비지 않고 컴파일에서 막힌다.
      const unhandled: never = tab;
      throw new Error(`알 수 없는 결재함 탭입니다: ${String(unhandled)}`);
    }
  }
}

export const approvalQueryOptions = {
  detail: (id: number) => queryOptions({
    queryKey: approvalKeys.detail(id),
    queryFn: () => approvalUserService.getDetail(id),
  }),
  list: (tab: ApprovalTab, params: ApprovalListParams) => queryOptions({
    queryKey: approvalKeys.list(tab, params),
    queryFn: () => listByTab(tab, params),
  }),
  /** 업무 구분 코드는 관리자가 바꾸기 전까지 안정적이라 짧게 캐시한다. */
  taskTypes: () => queryOptions({
    queryKey: approvalKeys.taskTypes(),
    queryFn: () => approvalUserService.getTaskTypes(),
    staleTime: 5 * 60 * 1000,
  }),
  /** 결재선 제안은 내가 상신해야 바뀐다 — 상신하면 함께 무효화한다. */
  suggestions: (taskSeCd: string) => queryOptions({
    queryKey: approvalKeys.suggestions(taskSeCd),
    queryFn: () => approvalUserService.getLineSuggestions(taskSeCd || undefined),
    staleTime: 60 * 1000,
  }),
  /**
   * 내 임시저장 목록. 다른 화면·기기에서 저장한 것이 보이도록 창을 열 때마다 다시 읽는다(최대 20건이라 가볍다).
   * 실패는 기안 창 안에서 안내하고 다시 시도한다 — 목록 하나 때문에 기안 창 전체를 오류 화면으로 바꾸지 않는다.
   */
  temporaryDrafts: () => queryOptions({
    queryKey: approvalKeys.temporaryDraftList(),
    queryFn: () => approvalUserService.listTemporaryDrafts(),
    staleTime: 0,
    throwOnError: false,
  }),
  /** 이어 쓰기 상세. 방금 다른 곳에서 고친 내용을 옛 캐시로 덮어 열지 않도록 늘 다시 읽는다. */
  temporaryDraft: (temporaryDraftSn: number) => queryOptions({
    queryKey: approvalKeys.temporaryDraft(temporaryDraftSn),
    queryFn: () => approvalUserService.getTemporaryDraft(temporaryDraftSn),
    staleTime: 0,
  }),
};

/** 처리 이력·결재선·차례가 바뀌는 쓰기 뒤에는 그 문서와 모든 목록을 다시 읽는다. */
async function refreshDocument(queryClient: QueryClient, ifmlAtrzSn: number) {
  await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
}

export const approvalMutationOptions = {
  confirm: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, status, reason, version }: ApprovalDecision) => {
      await approvalUserService.confirm(ifmlAtrzSn, status, reason, version);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
    },
  }),
  /**
   * 기안 상신. 성공하면 목록 factory key 만 무효화한다(업무 구분 캐시는 그대로).
   * [2026-10-03 D3] 이어 쓴 임시저장은 서버가 상신과 함께 지우므로 임시저장 목록도 다시 읽는다.
   */
  create: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ request, temporaryDraft }: ApprovalCreateInput) => {
      const ifmlAtrzSn = temporaryDraft
        ? await approvalUserService.createDraft(request, temporaryDraft)
        : await approvalUserService.createDraft(request);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: [...approvalKeys.all, 'line-suggestions'] });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
      return ifmlAtrzSn;
    },
  }),
  /** 임시저장은 결재 목록·결재선 제안에 섞이지 않는다 — 임시저장 key 만 다시 읽는다. */
  saveTemporary: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ temporaryDraftSn, request }: ApprovalTemporarySaveInput) => {
      const saved = temporaryDraftSn === undefined
        ? await approvalUserService.createTemporaryDraft(request)
        : await approvalUserService.updateTemporaryDraft(temporaryDraftSn, request);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
      return saved;
    },
  }),
  deleteTemporary: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async (temporaryDraftSn: number) => {
      await approvalUserService.deleteTemporaryDraft(temporaryDraftSn);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.temporaryDrafts() });
    },
  }),
  /** 회수 후에도 같은 문서의 상세와 차수 이력을 최신화한다. */
  cancel: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, version }: { ifmlAtrzSn: number; version?: number }) => {
      await approvalUserService.cancelDraft(ifmlAtrzSn, version);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
    },
  }),
  resubmit: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, request }: { ifmlAtrzSn: number; request: ApprovalResubmissionRequest }) => {
      const id = await approvalUserService.resubmit(ifmlAtrzSn, request);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
      return id;
    },
  }),
  remind: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn }: { ifmlAtrzSn: number }) => {
      const notified = await approvalUserService.remind(ifmlAtrzSn);
      await refreshDocument(queryClient, ifmlAtrzSn);
      return notified;
    },
  }),
  /**
   * 지금 차례인 결재자의 참조자 추가(D4). 참조자 목록과 버전이 바뀌므로 그 문서와 목록을 다시 읽는다. 새로 지정한 사람 수를 돌려준다.
   */
  addReferences: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, references, version }: { ifmlAtrzSn: number; references: string[]; version: number }) => {
      const added = await approvalUserService.addReferences(ifmlAtrzSn, references, version);
      await refreshDocument(queryClient, ifmlAtrzSn);
      return added;
    },
  }),
  replaceApprover: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, fromUserId, toUserId, version }: { ifmlAtrzSn: number; fromUserId: string; toUserId: string; version: number }) => {
      await approvalUserService.replaceApprover(ifmlAtrzSn, fromUserId, toUserId, version);
      await refreshDocument(queryClient, ifmlAtrzSn);
    },
  }),
  requestSupplement: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, question, version }: { ifmlAtrzSn: number; question: string; version: number }) => {
      await approvalUserService.requestSupplement(ifmlAtrzSn, question, version);
      await refreshDocument(queryClient, ifmlAtrzSn);
    },
  }),
  answerSupplement: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, answer }: { ifmlAtrzSn: number; answer: ApprovalSupplementAnswer }) => {
      await approvalUserService.answerSupplement(ifmlAtrzSn, answer);
      await refreshDocument(queryClient, ifmlAtrzSn);
    },
  }),
};

