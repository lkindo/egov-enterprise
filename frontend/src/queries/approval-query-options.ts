import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import {
  approvalUserService,
  type SanctionStatusCode,
} from '@/services/business/user/approval/ApprovalUserService';

export type ApprovalTab = 'PENDING' | 'HISTORY';
export interface ApprovalListParams {
  page: number;
  size: number;
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
};

export const approvalQueryOptions = {
  list: (tab: ApprovalTab, params: ApprovalListParams) => queryOptions({
    queryKey: approvalKeys.list(tab, params),
    queryFn: () => tab === 'PENDING'
      ? approvalUserService.getPending(params)
      : approvalUserService.getMyHistory(params),
  }),
};

export const approvalMutationOptions = {
  confirm: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ ifmlAtrzSn, status, reason }: ApprovalDecision) => {
      await approvalUserService.confirm(ifmlAtrzSn, status, reason);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
    },
  }),
};
