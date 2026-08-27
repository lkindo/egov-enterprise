import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 결재 확정 요청의 본문 계약.
 *
 * 이 축을 지키는 테스트가 저장소에 **0건**이었고, 그 사이 화면은 서버가 받지 않는 값을 보냈다.
 * 저장소는 같은 혼동을 이미 두 번 겪었다 — DB 는 V2_24 가 `CHECK (aprv_yn IN ('Y','N'))` 을
 * 걸었다가 V2_33 이 `('A','C','R')` 로 정정했고("결재 신청은 항상 'A' 를 INSERT 하므로 운영에서
 * 100% SQLState 23514 로 실패한다"), 관리자 화면(ISM)도 로컬 DTO 재선언을 걷어냈다.
 * 사용자 결재함이 그 정정을 받지 못한 마지막 잔존분이었다.
 *
 * 두 축을 고정한다.
 *  - **값**은 서버 열거형 그대로다(승인 'C', 반려 'R'). 'Y'/'N' 로 되돌리면 서버가 400 을 내고,
 *    서버를 고치는 우회는 DB CHECK 제약이 물리적으로 막는다.
 *  - **키**는 status/reason 이다. 컨트롤러가 Map<String,String> 에서 그 이름으로 조회하므로
 *    DTO 필드명(aprvYn/rjctRsnCn)으로 바꾸면 서버가 값을 못 찾는다.
 */

const putMock = vi.fn();
const getMock = vi.fn();

// ApprovalUserService 는 상태 상수를 IsmAdminService 에서 재수출하므로 그 파일도 함께 로드된다.
// 두 서비스가 각각 UserService·ApiService 를 상속하니 목도 둘 다 내보내야 한다.
class FakeService {
  constructor(public readonly base: string) {}
  put(...args: unknown[]) { return putMock(...args); }
  get(...args: unknown[]) { return getMock(...args); }
}

vi.mock('@/services/core/ApiService', () => ({
  UserService: FakeService,
  ApiService: FakeService,
}));

describe('ApprovalUserService confirm 계약', () => {
  beforeEach(() => {
    putMock.mockReset();
    getMock.mockReset();
    putMock.mockResolvedValue(undefined);
  });

  it('승인은 서버 열거형 값 C 를 status 키로 보낸다', async () => {
    const { approvalUserService, SANCTION_STATUS } = await import('../ApprovalUserService');

    await approvalUserService.confirm(42, SANCTION_STATUS.APPROVED);

    expect(putMock).toHaveBeenCalledTimes(1);
    const [url, body] = putMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/42/confirm');
    expect(body).toEqual({ status: 'C', reason: undefined });
  });

  it('반려는 R 과 사유를 함께 보낸다 — 서버가 공백 사유를 거부한다', async () => {
    const { approvalUserService, SANCTION_STATUS } = await import('../ApprovalUserService');

    await approvalUserService.confirm(7, SANCTION_STATUS.REJECTED, '예산 코드 누락');

    const [url, body] = putMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/7/confirm');
    expect(body).toEqual({ status: 'R', reason: '예산 코드 누락' });
  });

  it('상태 코드 상수가 서버 SanctionStatus 와 1:1 이다', async () => {
    const { SANCTION_STATUS } = await import('../ApprovalUserService');

    // 값을 바꾸면 서버 검증(validateRequestedState)과 DB CHECK 제약이 동시에 거부한다.
    expect(SANCTION_STATUS).toEqual({ REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R' });
  });

  it('대기 판정은 신청 상태(A)와 미설정만 참이다', async () => {
    const { isSanctionPending } = await import('../ApprovalUserService');

    expect(isSanctionPending('A')).toBe(true);
    expect(isSanctionPending(undefined)).toBe(true);
    // 'R' 은 반려다. 종전 화면은 이것을 대기로 읽어 반려 건에만 승인 버튼을 띄울 뻔했다.
    expect(isSanctionPending('R')).toBe(false);
    expect(isSanctionPending('C')).toBe(false);
  });
});
