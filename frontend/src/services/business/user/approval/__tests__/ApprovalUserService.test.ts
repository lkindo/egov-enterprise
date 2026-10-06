import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  approvalUserService,
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

  it('상태 코드 상수는 서버 SanctionStatus와 1:1이다', () => {
    expect(SANCTION_STATUS).toEqual({ REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R', WITHDRAWN: 'W' });
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

  /**
   * [2026-10-03 D3] 이어 쓴 임시저장은 상신 본문이 아니라 쿼리로 보낸다 — 본문에 실으면 재상신 요청 스키마로 샌다.
   * 서버는 이 번호·버전이 맞는 행을 상신과 같은 트랜잭션에서 지운다.
   */
  it('임시저장을 이어 써서 상신하면 번호와 버전을 쿼리로 함께 보내고, 그렇지 않으면 보내지 않는다 (D3)', async () => {
    const request = { taskSeCd: '01', docTtl: '출장', stages: [{ kind: 'APPROVAL' as const, approverIds: ['BOSS'] }] };
    client.requestRaw.mockResolvedValueOnce(success(91));
    await expect(approvalUserService.createDraft(request, { temporaryDraftSn: 7, version: 3 })).resolves.toBe(91);
    expect(client.requestRaw).toHaveBeenLastCalledWith({
      url: 'approvals', method: 'post', data: request, params: { temporaryDraftSn: 7, temporaryDraftVersion: 3 },
    });
    client.requestRaw.mockResolvedValueOnce(success(92));
    await expect(approvalUserService.createDraft(request)).resolves.toBe(92);
    expect(client.requestRaw.mock.lastCall?.[0].params).toEqual({});
  });

  it('임시저장 목록·상세·저장·삭제는 생성 계약의 경로로 보내고, 실패는 기안 창이 알리므로 전역 오류 토스트를 끄며, 결재자가 없는 단계를 전송 전에 거부한다 (D3)', async () => {
    const QUIET = { suppressErrorToast: true };
    const summary = { temporaryDraftSn: 7, taskSeCd: '01', taskSeNm: '일반', docTtl: '출장', approverCount: 1, version: 0, mdfcnDt: '2026-10-03T14:05:12' };
    client.getRaw.mockResolvedValueOnce(success([summary]));
    await expect(approvalUserService.listTemporaryDrafts()).resolves.toEqual([summary]);
    expect(client.getRaw).toHaveBeenLastCalledWith('approvals/temporary-drafts', QUIET);

    client.getRaw.mockResolvedValueOnce(success({ ...summary, docCn: '본문', stages: [{ kind: 'APPROVAL', approvers: [{ esntlId: 'BOSS', eligible: true }] }] }));
    await expect(approvalUserService.getTemporaryDraft(7)).resolves.toMatchObject({ temporaryDraftSn: 7, version: 0, docCn: '본문' });
    expect(client.getRaw).toHaveBeenLastCalledWith('approvals/temporary-drafts/7', QUIET);

    const request = { taskSeCd: '01', docTtl: '출장', docCn: '', stages: [{ kind: 'APPROVAL' as const, approverIds: ['BOSS'] }] };
    client.requestRaw.mockResolvedValueOnce(success(summary));
    await expect(approvalUserService.createTemporaryDraft(request)).resolves.toMatchObject({ temporaryDraftSn: 7, version: 0 });
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/temporary-drafts', method: 'post', data: request, ...QUIET });

    client.requestRaw.mockResolvedValueOnce(success({ ...summary, version: 1 }));
    await expect(approvalUserService.updateTemporaryDraft(7, { ...request, version: 0 })).resolves.toMatchObject({ version: 1 });
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/temporary-drafts/7', method: 'put', data: { ...request, version: 0 }, ...QUIET });

    client.requestRaw.mockResolvedValueOnce(success(null));
    await approvalUserService.deleteTemporaryDraft(7);
    expect(client.requestRaw).toHaveBeenLastCalledWith({ url: 'approvals/temporary-drafts/7', method: 'delete', ...QUIET });

    // 결재자가 없는 단계는 서버도 받지 않는다 — 화면이 빼고 보내야 하며, 빼지 않으면 전송 전에 막힌다.
    client.requestRaw.mockClear();
    await expect(approvalUserService.createTemporaryDraft({ docTtl: '쓰는 중', stages: [{ kind: 'APPROVAL', approverIds: [] }] })).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  /**
   * [2026-10-04 D4] '참조된 결재' 는 다른 탭과 같은 조건으로 자기 경로(/approvals/referenced)를 부른다. 결재자의 참조자 추가는
   * 버전을 함께 보내고, 실패는 상세의 참조자 영역이 화면 안에서 알리므로 전역 오류 토스트를 끈다(DEC-OPS-184).
   */
  it('참조된 결재는 자기 경로로 조건을 보내고 페이지 계약이 깨지면 받지 않는다 (D4)', async () => {
    const page = { list: [{ ifmlAtrzSn: 5, taskSeCd: '01', aplcntId: 'drafter', referenceViewer: true }], total: 1, page: 0, size: 20, totalPage: 1 };
    client.getRaw.mockResolvedValueOnce(success(page));
    await expect(approvalUserService.getReferenced({ page: 0, size: 20, keyword: '출장', status: 'R' })).resolves.toMatchObject({ total: 1 });
    expect(client.getRaw).toHaveBeenLastCalledWith('approvals/referenced', { params: { page: 0, size: 20, keyword: '출장', status: 'R' } });

    client.getRaw.mockResolvedValueOnce(success({ list: [] }));
    await expect(approvalUserService.getReferenced({ page: 0 })).rejects.toThrow('결재 페이지 응답이 필수 계약과 일치하지 않습니다.');
  });

  it('상신·재상신·임시저장 본문의 참조자는 생성 스키마를 지나도 지워지지 않는다 (D4)', async () => {
    // 생성 스키마는 strict 가 아니라 모르는 키를 조용히 지운다 — 참조자가 계약에 있어야 본문에 남는다.
    const stages = [{ kind: 'APPROVAL' as const, approverIds: ['BOSS'] }];
    client.requestRaw.mockResolvedValueOnce(success(91));
    await approvalUserService.createDraft({ taskSeCd: '01', docTtl: '출장', stages, references: ['REF'] });
    expect(client.requestRaw.mock.lastCall?.[0].data).toEqual({ taskSeCd: '01', docTtl: '출장', stages, references: ['REF'] });
    client.requestRaw.mockResolvedValueOnce(success(91));
    await approvalUserService.resubmit(91, { taskSeCd: '01', docTtl: '출장', stages, references: ['REF'], version: 2 });
    expect(client.requestRaw.mock.lastCall?.[0].data).toEqual({ taskSeCd: '01', docTtl: '출장', stages, references: ['REF'], version: 2 });
    client.requestRaw.mockResolvedValueOnce(success({ temporaryDraftSn: 7, version: 0 }));
    await approvalUserService.createTemporaryDraft({ docTtl: '쓰는 중', stages, references: ['REF'] });
    expect(client.requestRaw.mock.lastCall?.[0].data).toEqual({ docTtl: '쓰는 중', stages, references: ['REF'] });
    // 21명은 계약(최대 20명)이 전송 전에 막는다.
    client.requestRaw.mockClear();
    await expect(approvalUserService.createDraft({ taskSeCd: '01', docTtl: '출장', stages, references: Array.from({ length: 21 }, (_, index) => `R${index}`) })).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('결재자의 참조자 추가는 참조자와 버전을 생성 계약 본문으로 보내고, 전역 오류 토스트를 끄며, 빈 목록은 보내지 않는다 (D4)', async () => {
    client.requestRaw.mockResolvedValueOnce(success(2));
    await expect(approvalUserService.addReferences(42, ['REF1', 'REF2'], 3)).resolves.toBe(2);
    expect(client.requestRaw).toHaveBeenLastCalledWith({
      url: 'approvals/42/references', method: 'post', data: { references: ['REF1', 'REF2'], version: 3 }, suppressErrorToast: true,
    });

    client.requestRaw.mockResolvedValueOnce(success(null));
    await expect(approvalUserService.addReferences(42, ['REF1'], 3)).rejects.toThrow();

    client.requestRaw.mockClear();
    await expect(approvalUserService.addReferences(42, [], 3)).rejects.toThrow();
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('임시저장 응답에 버전이 없거나 다른 임시저장이 오면 받지 않는다 — 다음 저장이 남의 변경을 덮지 않게 한다 (D3)', async () => {
    client.requestRaw.mockResolvedValueOnce(success({ temporaryDraftSn: 7 }));
    await expect(approvalUserService.createTemporaryDraft({ docTtl: '쓰는 중' })).rejects.toThrow('임시저장 버전을 확인할 수 없습니다.');
    client.requestRaw.mockResolvedValueOnce(success({ temporaryDraftSn: 8, version: 1 }));
    await expect(approvalUserService.updateTemporaryDraft(7, { docTtl: '쓰는 중', version: 0 })).rejects.toThrow('임시저장 응답이 요청한 임시저장과 일치하지 않습니다.');
    client.getRaw.mockResolvedValueOnce(success({ temporaryDraftSn: 7, docTtl: '쓰는 중' }));
    await expect(approvalUserService.getTemporaryDraft(7)).rejects.toThrow('임시저장 버전을 확인할 수 없습니다.');
    // 목록이 배열이 아니면 생성 응답 계약이 먼저 거부한다.
    client.getRaw.mockResolvedValueOnce(success({ temporaryDraftSn: 7 }));
    await expect(approvalUserService.listTemporaryDrafts()).rejects.toThrow();
  });
});
