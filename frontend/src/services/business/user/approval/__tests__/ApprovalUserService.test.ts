import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  approvalUserService,
  isSanctionPending,
  SANCTION_STATUS,
} from '../ApprovalUserService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: '성공',
  data,
});

describe('ApprovalUserService generated contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('승인은 서버 열거형 값 C를 exact generated body로 보낸다', async () => {
    await approvalUserService.confirm(42, SANCTION_STATUS.APPROVED);

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'approvals/42/confirm',
      method: 'put',
      data: { status: 'C', reason: undefined },
    });
  });

  it('반려는 R과 사유를 함께 보낸다', async () => {
    await approvalUserService.confirm(7, SANCTION_STATUS.REJECTED, '예산 코드 누락');

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'approvals/7/confirm',
      method: 'put',
      data: { status: 'R', reason: '예산 코드 누락' },
    });
  });

  it('공백 반려 사유와 generated 최대 길이 위반을 전송 전에 거부한다', async () => {
    await expect(approvalUserService.confirm(7, SANCTION_STATUS.REJECTED, '   ')).rejects.toThrow();
    await expect(
      approvalUserService.confirm(7, SANCTION_STATUS.REJECTED, '가'.repeat(4001)),
    ).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('페이지 필수 metadata가 빠지면 fail-closed한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({ list: [] }));

    await expect(approvalUserService.getPending({ page: 0 })).rejects.toThrow(
      '결재 페이지 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('상태 코드 상수와 대기 판정은 서버 SanctionStatus와 1:1이다', () => {
    expect(SANCTION_STATUS).toEqual({ REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R', WITHDRAWN: 'W' });
    expect(isSanctionPending('A')).toBe(true);
    expect(isSanctionPending(undefined)).toBe(true);
    expect(isSanctionPending('R')).toBe(false);
    expect(isSanctionPending('C')).toBe(false);
    expect(isSanctionPending('W')).toBe(false);
  });

  it('현재 버전과 승인 의견을 generated confirm 본문으로 보낸다', async () => {
    await approvalUserService.confirm(42, 'C', '검토 완료', 5);
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'approvals/42/confirm', method: 'put', data: { status: 'C', reason: '검토 완료', version: 5 } });
  });

  it('재상신은 동일 문서 id와 새 내용·결재선·기존 버전을 전송한다', async () => {
    client.requestRaw.mockResolvedValueOnce(success(42));
    const request = { taskSeCd: '01', docTtl: '보완한 요청', docCn: '수정 내용', version: 5, stages: [{ kind: 'APPROVAL' as const, approverIds: ['approver'] }] };
    await expect(approvalUserService.resubmit(42, request)).resolves.toBe(42);
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'approvals/42/resubmissions', method: 'post', data: request });
  });

  it('[2026-10-03 H4] 버전이 없는 상세(열람만 하는 사람)는 거부하지 않고, 형식이 틀린 버전만 거부한다', async () => {
    const detail = { ifmlAtrzSn: 9, taskSeCd: '01', aplcntId: 'owner' };
    client.getRaw.mockResolvedValue(success(detail));
    client.requestRaw.mockResolvedValue(success(detail));
    await expect(approvalUserService.getDetail(9)).resolves.toMatchObject({ ifmlAtrzSn: 9 });
    client.getRaw.mockResolvedValue(success({ ...detail, version: -1 }));
    client.requestRaw.mockResolvedValue(success({ ...detail, version: -1 }));
    // 음수 버전은 생성 응답 계약(min 0)이 먼저 거부한다.
    await expect(approvalUserService.getDetail(9)).rejects.toThrow();
  });

  it('추적·보완 쓰기는 생성 계약의 경로와 본문으로 보낸다 (2026-10-03)', async () => {
    client.requestRaw.mockResolvedValueOnce(success(2));
    await expect(approvalUserService.remind(42)).resolves.toBe(2);
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/42/reminders', method: 'post' });
    await approvalUserService.replaceApprover(42, 'from', 'to', 3);
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/42/approvers', method: 'put', data: { fromUserId: 'from', toUserId: 'to', version: 3 } });
    await approvalUserService.requestSupplement(42, '금액?', 3);
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/42/supplement-requests', method: 'post', data: { question: '금액?', version: 3 } });
    await approvalUserService.answerSupplement(42, { answer: '45만 원', docCn: '고친 본문', version: 4 });
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/42/supplement-answers', method: 'post', data: { answer: '45만 원', docCn: '고친 본문', version: 4 } });
    client.requestRaw.mockResolvedValueOnce(success([{ esntlId: 'a', eligible: true }]));
    await expect(approvalUserService.checkApprovers(['a'])).resolves.toEqual([{ esntlId: 'a', eligible: true }]);
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/approver-checks', method: 'post', data: { approverIds: ['a'] } });
  });

  it('결재선 제안 응답에 목록이 빠지면 fail-closed 한다', async () => {
    client.getRaw.mockResolvedValue(success({ lines: [] }));
    client.requestRaw.mockResolvedValue(success({ lines: [] }));
    await expect(approvalUserService.getLineSuggestions('01')).rejects.toThrow('결재선 제안 응답이 계약과 일치하지 않습니다.');
  });
});
