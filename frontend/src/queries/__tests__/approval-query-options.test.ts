import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  confirm: vi.fn(),
  createDraft: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
  getProcessed: vi.fn(),
  getReferenced: vi.fn(),
  addReferences: vi.fn(),
  getTaskTypes: vi.fn(),
  getDetail: vi.fn(),
  resubmit: vi.fn(),
  cancelDraft: vi.fn(),
  listTemporaryDrafts: vi.fn(),
  getTemporaryDraft: vi.fn(),
  createTemporaryDraft: vi.fn(),
  updateTemporaryDraft: vi.fn(),
  deleteTemporaryDraft: vi.fn(),
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

  /**
   * [2026-10-04 D4] '참조된 결재' 탭은 참조 축(/approvals/referenced)을 부르고 상태 조건을 그대로 넘긴다 — 대기함처럼 상태를
   * 떼지 않는다(참조된 결재의 상태 조건은 문서의 지금 상태다). 다른 탭의 key 와 섞이지 않는다.
   */
  it('참조된 결재 탭은 참조 축 service 를 조건 그대로 부르고 다른 탭과 key 가 겹치지 않는다 (D4)', async () => {
    service.getReferenced.mockResolvedValueOnce({ list: [], total: 0 });
    const params = { page: 1, size: 20, keyword: '출장', status: 'C' as const };
    const referenced = approvalQueryOptions.list('REFERENCED', params);
    expect(referenced.queryKey).toEqual(['approvals', 'list', 'REFERENCED', params]);
    expect(referenced.queryKey).not.toEqual(approvalKeys.list('PROCESSED', params));
    await referenced.queryFn?.({ queryKey: referenced.queryKey } as never);
    expect(service.getReferenced).toHaveBeenCalledWith(params);
    expect(service.getProcessed).not.toHaveBeenCalled();
    expect(service.getPending).not.toHaveBeenCalled();
  });

  it('결재자의 참조자 추가는 버전과 함께 보내고 그 문서와 목록을 다시 읽으며 새로 지정한 수를 돌려준다 (D4)', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.addReferences.mockResolvedValueOnce(2);

    const added = await approvalMutationOptions.addReferences(queryClient).mutationFn?.({
      ifmlAtrzSn: 31, references: ['REF1', 'REF2'], version: 4,
    }, {} as never);

    expect(added).toBe(2);
    expect(service.addReferences).toHaveBeenCalledWith(31, ['REF1', 'REF2'], 4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.detail(31) });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.all });
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

    expect(service.confirm).toHaveBeenCalledWith(17, 'R', '예산 코드 누락', undefined);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.detail(17) });
  });

  it('기안 상신은 문서 번호를 돌려주고 목록 factory key만 무효화한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.createDraft.mockResolvedValueOnce(91);

    const result = await approvalMutationOptions.create(queryClient).mutationFn?.({
      request: { taskSeCd: '01', aprvrId: 'BOSS', reqYmd: '20260905' },
    }, {} as never);

    expect(result).toBe(91);
    expect(service.createDraft).toHaveBeenCalledWith({ taskSeCd: '01', aprvrId: 'BOSS', reqYmd: '20260905' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.taskTypes() });
  });

  /**
   * [2026-10-03 D3] 이어 쓴 임시저장을 상신하면 서버가 그 임시저장을 지운다 — 번호·버전을 넘기고 임시저장 목록도 다시 읽는다.
   * 임시저장 key 는 문서 상세·목록과 다른 접두에 둔다(임시저장 5번과 문서 5번이 한 캐시를 쓰지 않게).
   */
  it('임시저장을 이어 써서 상신하면 번호·버전을 넘기고 임시저장 목록을 다시 읽는다 (D3)', async () => {
    expect(approvalKeys.temporaryDraft(5)).toEqual(['approvals', 'temporary-drafts', 'detail', 5]);
    expect(approvalKeys.temporaryDraft(5)).not.toEqual(approvalKeys.detail(5));
    expect(approvalKeys.temporaryDraftList().slice(0, 2)).not.toEqual(approvalKeys.lists());
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.createDraft.mockResolvedValueOnce(92);
    const request = { taskSeCd: '01', docTtl: '출장', stages: [{ kind: 'APPROVAL' as const, approverIds: ['BOSS'] }] };

    const result = await approvalMutationOptions.create(queryClient).mutationFn?.({
      request, temporaryDraft: { temporaryDraftSn: 7, version: 3 },
    }, {} as never);

    expect(result).toBe(92);
    expect(service.createDraft).toHaveBeenCalledWith(request, { temporaryDraftSn: 7, version: 3 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.temporaryDrafts() });
  });

  it('임시저장은 번호가 없으면 만들고 있으면 바꾸며, 결재 목록·결재선 제안은 건드리지 않는다 (D3)', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const request = { docTtl: '쓰는 중' };
    service.createTemporaryDraft.mockResolvedValueOnce({ temporaryDraftSn: 7, version: 0 });
    service.updateTemporaryDraft.mockResolvedValueOnce({ temporaryDraftSn: 7, version: 1 });
    const save = approvalMutationOptions.saveTemporary(queryClient);

    await expect(save.mutationFn?.({ request }, {} as never)).resolves.toEqual({ temporaryDraftSn: 7, version: 0 });
    await expect(save.mutationFn?.({ temporaryDraftSn: 7, request: { ...request, version: 0 } }, {} as never)).resolves.toEqual({ temporaryDraftSn: 7, version: 1 });

    expect(service.createTemporaryDraft).toHaveBeenCalledWith(request);
    expect(service.updateTemporaryDraft).toHaveBeenCalledWith(7, { ...request, version: 0 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.temporaryDrafts() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: [...approvalKeys.all, 'line-suggestions'] });

    await approvalMutationOptions.deleteTemporary(queryClient).mutationFn?.(7, {} as never);
    expect(service.deleteTemporaryDraft).toHaveBeenCalledWith(7);
  });

  it('임시저장 목록·상세는 결재 도메인 서비스에서 늘 다시 읽고, 목록 실패는 기안 창 안에서 다룬다 (D3)', async () => {
    service.listTemporaryDrafts.mockResolvedValueOnce([]);
    service.getTemporaryDraft.mockResolvedValueOnce({ temporaryDraftSn: 7, version: 0 });
    const list = approvalQueryOptions.temporaryDrafts();
    const detail = approvalQueryOptions.temporaryDraft(7);
    await list.queryFn?.({ queryKey: list.queryKey } as never);
    await detail.queryFn?.({ queryKey: detail.queryKey } as never);
    expect(service.listTemporaryDrafts).toHaveBeenCalledTimes(1);
    expect(service.getTemporaryDraft).toHaveBeenCalledWith(7);
    expect(list.staleTime).toBe(0);
    expect(detail.staleTime).toBe(0);
    expect(list.throwOnError).toBe(false);
  });

  it('상세와 목록 key를 구분하고 재상신 후 같은 문서의 두 경계를 최신화한다', async () => {
    expect(approvalKeys.detail(91)).toEqual(['approvals', 'detail', 91]);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.resubmit.mockResolvedValueOnce(91);
    const request = { taskSeCd: '01', docTtl: '보완 문서', version: 3, stages: [{ kind: 'APPROVAL' as const, approverIds: ['BOSS'] }] };
    const result = await approvalMutationOptions.resubmit(queryClient).mutationFn?.({ ifmlAtrzSn: 91, request }, {} as never);
    expect(result).toBe(91);
    expect(service.resubmit).toHaveBeenCalledWith(91, request);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.detail(91) });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: approvalKeys.all });
  });

  it('회수도 버전을 결속하고 문서 이력을 재조회한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    await approvalMutationOptions.cancel(queryClient).mutationFn?.({ ifmlAtrzSn: 91, version: 3 }, {} as never);
    expect(service.cancelDraft).toHaveBeenCalledWith(91, 3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.detail(91) });
  });
});
