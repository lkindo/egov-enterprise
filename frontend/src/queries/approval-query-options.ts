import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import {
  approvalUserService,
  type ApprovalDraftRequest,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';

/**
 * 결재함 탭.
 *
 * - `PENDING`   — 결재자 본인에게 온 대기 건(`/approvals/pending`)
 * - `SUBMITTED` — 내가 올린 결재(신청자 기준, `/approvals/my`)
 * - `PROCESSED` — 결재자 본인이 승인·반려한 건(`/approvals/processed`)
 *
 * [2026-09-05] 종전 탭 `HISTORY` 는 라벨이 '결재 처리 이력' 이면서 `/approvals/my`(신청자 기준)를
 * 불렀다 — 결재자가 처리한 문서는 어디에서도 다시 볼 수 없었고, 신청자는 자기 신청서를 엉뚱한 이름의
 * 탭에서 찾아야 했다. 탭 이름을 실제 질의 축에 맞추고 처리한 결재를 별도 탭으로 분리한다.
 */
export type ApprovalTab = 'PENDING' | 'SUBMITTED' | 'PROCESSED';

export interface ApprovalListParams {
  page?: number;
  size?: number;
}

export interface ApprovalDecision {
  ifmlAtrzSn: number;
  status: Extract<SanctionStatusCode, 'C' | 'R'>;
  reason?: string;
}

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  list: (tab: ApprovalTab, params: ApprovalListParams) => (
    [...approvalKeys.lists(), tab, params] as const
  ),
  taskTypes: () => [...approvalKeys.all, 'task-types'] as const,
};

function listByTab(tab: ApprovalTab, params: ApprovalListParams) {
  switch (tab) {
    case 'PENDING':
      return approvalUserService.getPending(params);
    case 'SUBMITTED':
      return approvalUserService.getMyHistory(params);
    case 'PROCESSED':
      return approvalUserService.getProcessed(params);
  }
}

export const approvalQueryOptions = {
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
};

export const approvalMutationOptions = {
  confirm: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, status, reason }: ApprovalDecision) => {
      await approvalUserService.confirm(ifmlAtrzSn, status, reason);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
    },
  }),
  /** 기안 상신. 성공하면 목록 factory key 만 무효화한다(업무 구분 캐시는 그대로). */
  create: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async (request: ApprovalDraftRequest) => {
      const ifmlAtrzSn = await approvalUserService.createDraft(request);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      return ifmlAtrzSn;
    },
  }),
};
