import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  confirm: vi.fn(),
  createDraft: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
  getProcessed: vi.fn(),
  getTaskTypes: vi.fn(),
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

  it('세 탭의 목록이 같은 도메인 아래 충돌하지 않는 key를 사용한다', () => {
    expect(approvalKeys.all).toEqual(['approvals']);
    expect(approvalKeys.list('PENDING', { page: 0, size: 50 })).toEqual([
      'approvals', 'list', 'PENDING', { page: 0, size: 50 },
    ]);
    expect(approvalKeys.list('SUBMITTED', { page: 1, size: 20 })).toEqual([
      'approvals', 'list', 'SUBMITTED', { page: 1, size: 20 },
    ]);
    expect(approvalKeys.list('PROCESSED', { page: 0, size: 20 })).toEqual([
      'approvals', 'list', 'PROCESSED', { page: 0, size: 20 },
    ]);
    expect(approvalKeys.taskTypes()).toEqual(['approvals', 'task-types']);
  });

  /**
   * [2026-09-05] 종전 'HISTORY' 탭은 라벨이 처리 이력이면서 신청자 기준(getMyHistory)을 불렀다.
   * 탭 이름이 실제 질의 축과 1:1 이어야 같은 오해가 재발하지 않는다.
   */
  it('탭별 query options가 이름이 약속하는 service 경계를 호출한다', async () => {
    service.getPending.mockResolvedValueOnce({ list: [], total: 0 });
    service.getMyHistory.mockResolvedValueOnce({ list: [], total: 0 });
    service.getProcessed.mockResolvedValueOnce({ list: [], total: 0 });

    const pending = approvalQueryOptions.list('PENDING', { page: 0, size: 50 });
    const submitted = approvalQueryOptions.list('SUBMITTED', { page: 1, size: 20 });
    const processed = approvalQueryOptions.list('PROCESSED', { page: 2, size: 20 });
    await pending.queryFn?.({ queryKey: pending.queryKey } as never);
    await submitted.queryFn?.({ queryKey: submitted.queryKey } as never);
    await processed.queryFn?.({ queryKey: processed.queryKey } as never);

    expect(service.getPending).toHaveBeenCalledWith({ page: 0, size: 50 });
    expect(service.getMyHistory).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(service.getProcessed).toHaveBeenCalledWith({ page: 2, size: 20 });
  });

  it('업무 구분 선택지는 결재 도메인 서비스에서 읽는다', async () => {
    service.getTaskTypes.mockResolvedValueOnce([]);
    const options = approvalQueryOptions.taskTypes();
    await options.queryFn?.({ queryKey: options.queryKey } as never);
    expect(service.getTaskTypes).toHaveBeenCalledTimes(1);
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

  it('기안 상신은 문서 번호를 돌려주고 목록 factory key만 무효화한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.createDraft.mockResolvedValueOnce(91);

    const result = await approvalMutationOptions.create(queryClient).mutationFn?.({
      taskSeCd: '01',
      aprvrId: 'BOSS',
      reqYmd: '20260905',
    }, {} as never);

    expect(result).toBe(91);
    expect(service.createDraft).toHaveBeenCalledWith({ taskSeCd: '01', aprvrId: 'BOSS', reqYmd: '20260905' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.taskTypes() });
  });
});
