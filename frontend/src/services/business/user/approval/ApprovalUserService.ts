import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { ApprovalConfirmRequestSchema, ApprovalDraftRequestSchema } from '@/types/generated-zod';
import { z } from 'zod';
import type { components } from '@/types/generated-api';
import {
  confirmOperation,
  createApprovalOperation,
  getMyHistoryOperation,
  getPendingOperation,
  getProcessedOperation,
  getTaskTypesOperation,
} from '@/types/generated-operations';

/** 기안 시 고르는 업무 구분 — 서버가 COM075 에서 내려주는 공통코드 행. */
export type ApprovalTaskType = components['schemas']['CommonCodeDto'];
/** 기안 요청 본문. 신청자는 서버가 인증 주체로 채우므로 여기에 없다. */
export type ApprovalDraftRequest = components['schemas']['ApprovalDraftRequest'];

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

function requireApprovalPage(
  response: components['schemas']['PageResponseInformalSanctionDto'],
): PageResponse<InformalSanctionDto> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('결재 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<InformalSanctionDto>;
}

class ApprovalUserService extends UserService {
  constructor() {
    super('/approvals');
  }

  async getPending(params: { page?: number; size?: number }): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getPendingOperation, { query: params });
    return requireApprovalPage(response);
  }

  /**
   * 내가 <b>올린</b> 결재(신청자 기준). 서버 경로 이름(`/my`)과 종전 메서드명이 'history' 라
   * 결재자로서 처리한 이력으로 읽혔지만, 실제 질의는 `findByAplcntId` 다. 처리한 이력은 {@link getProcessed}.
   */
  async getMyHistory(params: { page?: number; size?: number }): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getMyHistoryOperation, { query: params });
    return requireApprovalPage(response);
  }

  /** 결재자 본인이 이미 승인·반려한 결재. 대기 건은 섞이지 않는다. */
  async getProcessed(params: { page?: number; size?: number }): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getProcessedOperation, { query: params });
    return requireApprovalPage(response);
  }

  /**
   * 기안 화면의 업무 구분 선택지. 공통코드 API 는 관리자 전용이라 결재 도메인이 자기 어휘를 내려준다.
   * 등록된 코드가 없으면 빈 배열이다 — 화면은 그것을 "고를 것이 없다" 로 정직하게 보여야 한다.
   */
  async getTaskTypes(): Promise<ApprovalTaskType[]> {
    const response = await this.executeGenerated(getTaskTypesOperation, {});
    if (!Array.isArray(response)) {
      throw new Error('업무 구분 응답이 목록 계약과 일치하지 않습니다.');
    }
    return response;
  }

  /**
   * 결재 기안(상신). 신청자는 서버가 인증 주체로 고정한다.
   *
   * [2026-09-05] 종전에는 이 도메인에 상신 경로가 UI 어디에도 없었다 — `IsmAdminService.createInfrmlSanctn`
   * 은 호출부 0건이었고, 기안 화면은 목업이었다. 결재함의 '새 결재 기안' 다이얼로그가 이 메서드를 부른다.
   */
  async createDraft(request: ApprovalDraftRequest): Promise<number> {
    const body = ApprovalDraftRequestSchema.parse(request);
    const response = await this.executeGenerated(createApprovalOperation, { body });
    if (typeof response !== 'number') {
      throw new Error('결재 상신 응답이 문서 번호 계약과 일치하지 않습니다.');
    }
    return response;
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
    return this.executeGenerated(confirmOperation, {
      path: { id: ifmlAtrzSn },
      body: request,
    });
  }
}

export const approvalUserService = new ApprovalUserService();
