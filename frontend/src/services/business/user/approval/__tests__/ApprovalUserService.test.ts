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
    expect(SANCTION_STATUS).toEqual({ REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R' });
    expect(isSanctionPending('A')).toBe(true);
    expect(isSanctionPending(undefined)).toBe(true);
    expect(isSanctionPending('R')).toBe(false);
    expect(isSanctionPending('C')).toBe(false);
  });
});
