import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { ApprovalConfirmRequestSchema } from '@/types/generated-zod';
import { z } from 'zod';

/**
 * 결재함(사용자) 서비스.
 *
 * [2026-08-27] 종전에는 이 파일이 로컬 `Approval` 인터페이스 8필드를 **재선언**했는데, 서버가
 * 돌려주는 `InformalSanctionDto` 와 교집합이 0이었다(approvalId·jobTypeNm·applicantId·requestDate·
 * status … 어느 것도 실재하지 않는다). 응답 키 변환 경로도 서버·클라 양쪽에 없어, 목록은 전 행이
 * 빈 값이고 상세 제목에는 문자열 `#undefined` 가 그대로 렌더됐다.
 *
 * 같은 결함을 관리자 화면(ISM)이 이미 겪고 고쳤다 — {@link IsmAdminService} 의 주석이 그 이력을
 * 남기고 "로컬 인터페이스 재선언 금지" 를 명문화한다. 여기서도 생성 타입을 재수출해 SSOT 를 공유한다.
 */
export type { InformalSanctionDto } from '@/services/foundation/system/IsmAdminService';
export {
  SANCTION_STATUS,
  isSanctionPending,
  type SanctionStatusCode,
} from '@/services/foundation/system/IsmAdminService';

import type { InformalSanctionDto } from '@/services/foundation/system/IsmAdminService';
import { SANCTION_STATUS } from '@/services/foundation/system/IsmAdminService';

const ApprovalDecisionRequestSchema = ApprovalConfirmRequestSchema.superRefine((request, context) => {
  if (request.status === SANCTION_STATUS.REJECTED && !request.reason?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: '반려 사유는 필수입니다.',
    });
  }
});

class ApprovalUserService extends UserService {
  constructor() {
    super('/approvals');
  }

  async getPending(params: { page?: number; size?: number }): Promise<PageResponse<InformalSanctionDto>> {
    return this.get<PageResponse<InformalSanctionDto>>('/pending', { params });
  }

  async getMyHistory(params: { page?: number; size?: number }): Promise<PageResponse<InformalSanctionDto>> {
    return this.get<PageResponse<InformalSanctionDto>>('/my', { params });
  }

  /**
   * 결재 확정(승인·반려).
   *
   * ⚠ 상태 값은 서버 열거형 그대로 보낸다 — 승인 `'C'`, 반려 `'R'`. 종전에는 `'Y'`/`'N'` 을 보냈고
   * 서버는 그 값을 받으면 400 을 냈다. DB 도 같은 축으로 동결돼 있어(V2_33 의
   * `CHECK (aprv_yn IN ('A','C','R'))`) 서버를 `'Y'`/`'N'` 수용으로 바꾸는 우회는 물리적으로 불가능하다.
   *
   * ⚠ 본문 **키**는 generated `ApprovalConfirmRequest`의 `status`/`reason` 이다.
   * DTO 필드명(`aprvYn`/`rjctRsnCn`)으로 바꾸면 생성 계약 검증에서 거부된다.
   *
   * ⚠ 반려는 사유가 필수다. 서버가 공백 사유를 거부하므로 호출부가 반드시 채워야 한다.
   */
  async confirm(
    ifmlAtrzSn: number,
    aprvYn: typeof SANCTION_STATUS.APPROVED | typeof SANCTION_STATUS.REJECTED,
    rjctRsnCn?: string,
  ): Promise<void> {
    const request = ApprovalDecisionRequestSchema.parse({ status: aprvYn, reason: rjctRsnCn });
    return this.put<void>(`/${ifmlAtrzSn}/confirm`, request);
  }
}

export const approvalUserService = new ApprovalUserService();
