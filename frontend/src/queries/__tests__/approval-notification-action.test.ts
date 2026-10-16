import { readFileSync } from 'node:fs';
import path from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getDetail: vi.fn(), confirm: vi.fn() }));
vi.mock('@/services/business/user/approval/ApprovalUserService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/business/user/approval/ApprovalUserService')>();
  return { ...actual, approvalUserService: mocks };
});
import { approveFromNotification, matchApprovalTurnNotification } from '../approval-notification-action';
import { APPROVAL_UNDO_MS, cancelApprovalCommit, pendingApprovalCommits } from '@/app/approvals/approval-undo-queue';
import notificationActions from '@/extensions/informalsanction/notification-actions';
import { REPO_ROOT } from '@/test-utils/projection';

/**
 * 알림 카드에서 바로 승인(2026-10-16). 결재 차례 알림만 고르고, 누른 순간 상세를 다시 읽어 지금 차례·버전을 확인한 뒤 결재함과 같은
 * 되돌리기 대기열에 올린다(확인 대화상자 없이 10초 되돌리기, DEC-OPS-218 ②).
 */
const TURN = { ifmlAtrzSn: 41, docTtl: '출장 승인 요청', aprvYn: 'A', canApprove: true, version: 3,
  stages: [{ order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [] }] };

function context(target = '41') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { notificationId: 7, title: '결재 요청', target, queryClient };
}

describe('approval notification action', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getDetail.mockResolvedValue(TURN);
    mocks.confirm.mockResolvedValue(undefined);
  });
  afterEach(() => {
    pendingApprovalCommits().forEach(cancelApprovalCommit);
    vi.useRealTimers();
  });

  it('결재 차례 알림의 이동 경로에서만 문서 번호를 읽는다', () => {
    expect(matchApprovalTurnNotification('/approvals?tab=PENDING&doc=41')).toBe('41');
    expect(matchApprovalTurnNotification('/approvals?tab=SUBMITTED&doc=41')).toBeNull();
    expect(matchApprovalTurnNotification('/approvals?tab=REFERENCED&doc=41')).toBeNull();
    expect(matchApprovalTurnNotification('/approvals?tab=PENDING&doc=0')).toBeNull();
    expect(matchApprovalTurnNotification('/approvals?tab=PENDING&doc=41&x=1')).toBeNull();
    expect(matchApprovalTurnNotification('/approvals')).toBeNull();
    expect(matchApprovalTurnNotification('/admin/notifications?tab=PENDING&doc=41')).toBeNull();
  });

  it('상세를 다시 읽어 지금 차례면 대기열에 올리고 10초 뒤 읽은 버전으로 승인을 보낸다', async () => {
    const outcome = await approveFromNotification(context());
    expect(mocks.getDetail).toHaveBeenCalledWith(41);
    expect(outcome.message).toBe(`‘출장 승인 요청’ 승인을 ${APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다. 되돌리려면 되돌리기를 누르세요.`);
    expect(outcome.undoMs).toBe(APPROVAL_UNDO_MS);
    expect(pendingApprovalCommits()).toEqual([41]);
    expect(mocks.confirm).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(mocks.confirm).toHaveBeenCalledWith(41, 'C', undefined, 3);
    await expect(outcome.settled).resolves.toBe('‘출장 승인 요청’ 승인했습니다.');
  });

  it('되돌리면 보내지 않는다', async () => {
    const outcome = await approveFromNotification(context());
    expect(outcome.undo?.()).toBe(true);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(outcome.undoneMessage).toContain('되돌렸습니다');
  });

  it('합의 단계는 동의로 부른다', async () => {
    mocks.getDetail.mockResolvedValue({ ...TURN, stages: [{ order: 1, kind: 'AGREEMENT', status: 'ACTIVE', approvers: [] }] });
    const outcome = await approveFromNotification(context());
    expect(outcome.message).toContain('동의를');
  });

  it.each([
    ['지금 내 차례가 아니면(서버 힌트 canApprove 거짓)', { ...TURN, canApprove: false }, '지금 내 차례가 아닙니다'],
    ['이미 처리된 문서면', { ...TURN, aprvYn: 'C' }, '이미 처리됐거나'],
    ['보완 요청의 답을 기다리면', { ...TURN, openSupplement: { question: '예산?' } }, '보완 요청에 대한 답을 기다리고'],
    ['버전을 모르면', { ...TURN, version: undefined }, '버전을 확인할 수 없습니다'],
  ])('%s 보내지 않고 사유를 돌려준다', async (_label, detail, reason) => {
    mocks.getDetail.mockResolvedValue(detail);
    await expect(approveFromNotification(context())).rejects.toMatchObject({ response: { data: { message: expect.stringContaining(reason) } } });
    expect(pendingApprovalCommits()).toEqual([]);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('같은 문서가 이미 처리 예정이면 두 번 올리지 않는다', async () => {
    await approveFromNotification(context());
    await expect(approveFromNotification(context())).rejects.toMatchObject({ response: { data: { message: expect.stringContaining('이미 처리 예정') } } });
    expect(pendingApprovalCommits()).toEqual([41]);
  });

  it('보낸 승인을 서버가 충돌(409)·권한(403)으로 거부하면 그 오류로 끝나고 충돌이면 결재 캐시를 다시 읽는다', async () => {
    const conflict = Object.assign(new Error('conflict'), { response: { status: 409, data: { code: 'C013', message: '다른 결재자가 먼저 반려했습니다.' } } });
    mocks.confirm.mockRejectedValueOnce(conflict);
    const ctx = context();
    const invalidate = vi.spyOn(ctx.queryClient, 'invalidateQueries');
    const outcome = await approveFromNotification(ctx);
    const settled = outcome.settled!.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(APPROVAL_UNDO_MS);
    await expect(settled).resolves.toBe(conflict);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['approvals'] });
  });

  it('기여는 결재 차례 알림을 고르고 이 모듈의 승인을 가리키며, 노출 술어는 승인 API 의 권한과 같다', () => {
    const readConfig = (relative: string) => JSON.parse(readFileSync(path.join(REPO_ROOT, relative), 'utf8'));
    const bindings = readConfig('config/governance/authorization-policies.json').operationBindings as Array<{
      method: string; handler: string; permission: string | null;
    }>;
    // 기여의 쓰기(approveFromNotification)가 부르는 연산(ApprovalUserService.confirm → PUT /api/v1/approvals/{id}/confirm).
    const called = bindings.filter((row) => row.method === 'PUT' && row.handler.endsWith('.ApprovalApiController#confirm'));
    expect(called).toHaveLength(1);
    expect(called[0].permission).toBe('APPROVAL_APPROVE');
    expect(notificationActions.map((entry) => entry.visibleWhen)).toEqual([{ permissions: [called[0].permission] }]);
    expect(notificationActions.map((entry) => entry.submit)).toEqual([approveFromNotification]);
    expect(notificationActions.map((entry) => entry.match)).toEqual([matchApprovalTurnNotification]);
    // 기본 그룹은 모두 이 권한을 가진다. 기본 그룹에서 빠지면 이 노출 결정을 다시 본다.
    const catalog = readConfig('config/governance/permission-catalog.json') as { permissions: Array<{ code: string; defaultGroups: string[] }> };
    expect(catalog.permissions.find((row) => row.code === 'APPROVAL_APPROVE')?.defaultGroups).toEqual(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER']);
  });

  it('문서 번호가 아닌 대상은 서버에 묻지 않는다', async () => {
    await expect(approveFromNotification(context('abc'))).rejects.toBeInstanceOf(Error);
    expect(mocks.getDetail).not.toHaveBeenCalled();
  });
});
