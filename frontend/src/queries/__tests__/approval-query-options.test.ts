import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  confirm: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
}));

vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  approvalUserService: service,
}));

import {
  approvalKeys,
  approvalMutationOptions,
  approvalQueryOptions,
} from '../approval-query-options';

describe('approval query ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('대기·이력 목록이 같은 도메인 아래 충돌하지 않는 key를 사용한다', () => {
    expect(approvalKeys.all).toEqual(['approvals']);
    expect(approvalKeys.list('PENDING', { page: 0, size: 50 })).toEqual([
      'approvals', 'list', 'PENDING', { page: 0, size: 50 },
    ]);
    expect(approvalKeys.list('HISTORY', { page: 1, size: 20 })).toEqual([
      'approvals', 'list', 'HISTORY', { page: 1, size: 20 },
    ]);
  });

  it('탭별 query options가 올바른 service 경계를 호출한다', async () => {
    service.getPending.mockResolvedValueOnce({ list: [], total: 0 });
    service.getMyHistory.mockResolvedValueOnce({ list: [], total: 0 });

    const pending = approvalQueryOptions.list('PENDING', { page: 0, size: 50 });
    const history = approvalQueryOptions.list('HISTORY', { page: 1, size: 20 });
    await pending.queryFn?.({ queryKey: pending.queryKey } as never);
    await history.queryFn?.({ queryKey: history.queryKey } as never);

    expect(service.getPending).toHaveBeenCalledWith({ page: 0, size: 50 });
    expect(service.getMyHistory).toHaveBeenCalledWith({ page: 1, size: 20 });
  });

  it('결재 성공 뒤 목록 factory key만 무효화한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.confirm.mockResolvedValueOnce(undefined);

    await approvalMutationOptions.confirm(queryClient).mutationFn?.({
      ifmlAtrzSn: 17,
      status: 'R',
      reason: '예산 코드 누락',
    }, {} as never);

    expect(service.confirm).toHaveBeenCalledWith(17, 'R', '예산 코드 누락');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.all });
  });
});
