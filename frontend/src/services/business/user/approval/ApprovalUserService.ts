import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import {
  ApprovalConfirmRequestSchema,
  ApprovalDraftRequestSchema,
  ApprovalReferenceAddRequestSchema,
  ApprovalResubmissionRequestSchema,
  ApprovalSupplementAnswerRequestSchema,
  ApprovalSupplementRequestSchema,
  ApprovalTemporaryDraftRequestSchema,
  ApproverCheckRequestSchema,
  ApproverReplaceRequestSchema,
} from '@/types/generated-zod';
import { z } from 'zod';
import type { components } from '@/types/generated-api';
import {
  cancelApprovalOperation,
  confirmOperation,
  createApprovalOperation,
  getMyHistoryOperation,
  getPendingOperation,
  getProcessedOperation,
  getReferencedOperation,
  getTaskTypesOperation,
  getApprovalDetailOperation,
  resubmitApprovalOperation,
  getLineSuggestionsOperation,
  checkApproversOperation,
  remindApproversOperation,
  replaceApproverOperation,
  requestSupplementOperation,
  answerSupplementOperation,
  getApprovalTemporaryDraftsOperation,
  getApprovalTemporaryDraftOperation,
  createApprovalTemporaryDraftOperation,
  updateApprovalTemporaryDraftOperation,
  deleteApprovalTemporaryDraftOperation,
  addReferencesOperation,
} from '@/types/generated-operations';

/** 기안 시 고르는 업무 구분 — 서버가 COM075 에서 내려주는 공통코드 행. */
export type ApprovalTaskType = components['schemas']['CommonCodeDto'];
/** 기안 요청 본문. 신청자는 서버가 인증 주체로 채우므로 여기에 없다. */
export type ApprovalDraftRequest = components['schemas']['ApprovalDraftRequest'];
export type ApprovalResubmissionRequest = components['schemas']['ApprovalResubmissionRequest'];
export type ApprovalStageRequest = components['schemas']['ApprovalStageRequest'];
/** 기안 화면의 결재선 제안(내가 올린 결재에서 찾은 결재선·최근 결재자). */
export type ApprovalSuggestions = components['schemas']['ApprovalSuggestionsDto'];
export type ApproverProfile = components['schemas']['ApproverProfileDto'];
/**
 * 결재 문서의 참조자 한 사람(2026-10-04 D4, 상세만). 서버 DTO 이름은 ApprovalReferenceDto 지만 이 파일의 'Reference' 는
 * 이미 임시저장 포인터({@link ApprovalTemporaryDraftReference})라 참조자는 Referee 로 부른다. 이름·부서만 싣고 연락처는 없다.
 */
export type ApprovalReferee = components['schemas']['ApprovalReferenceDto'];
export type ApprovalSupplementAnswer = components['schemas']['ApprovalSupplementAnswerRequest'];
/**
 * 기안 임시저장(2026-10-03 D3). 서버에 기안자 본인 것만 20건까지 둔다 — 브라우저 저장소에는 본문을 두지 않는다.
 * 요청은 미완성 기안을 받으므로 업무 구분·제목이 비어도 되지만, 결재자가 없는 단계는 받지 않는다.
 */
export type ApprovalTemporaryDraftRequest = components['schemas']['ApprovalTemporaryDraftRequest'];
/** 목록 한 줄 — 본문과 결재선은 싣지 않는다. '이어 쓰기' 가 상세를 따로 읽는다. */
export type ApprovalTemporaryDraftSummary = components['schemas']['ApprovalTemporaryDraftSummaryDto'];
/** 이어 쓰기 상세. 결재선 사람마다 지금 자격(사전 확인과 같은 판정)이 함께 온다. */
export type ApprovalTemporaryDraft = components['schemas']['ApprovalTemporaryDraftDto'];
/** 상신할 때 함께 보내는 임시저장 — 서버가 상신과 같은 트랜잭션에서 번호·기안자·버전이 맞는 행을 지운다. */
export interface ApprovalTemporaryDraftReference {
  temporaryDraftSn: number;
  version: number;
}
/** 저장·이어 쓰기 응답. 번호와 버전이 있는 것을 확인한 뒤에만 돌려준다 — 없으면 다음 저장이 남의 변경을 덮는다. */
export type SavedApprovalTemporaryDraft = ApprovalTemporaryDraftSummary & ApprovalTemporaryDraftReference;
export type ResumedApprovalTemporaryDraft = ApprovalTemporaryDraft & ApprovalTemporaryDraftReference;

/**
 * 결재함(사용자) 서비스.
 *
 * [2026-08-27] 종전에는 이 파일이 로컬 `Approval` 인터페이스 8필드를 **재선언**했는데, 서버가
 * 돌려주는 `InformalSanctionDto` 와 교집합이 0이었다(approvalId·jobTypeNm·applicantId·requestDate·
 * status … 어느 것도 실재하지 않는다). 응답 키 변환 경로도 서버·클라 양쪽에 없어, 목록은 전 행이
 * 빈 값이고 상세 제목에는 문자열 `#undefined` 가 그대로 렌더됐다.
 *
 * 같은 결함을 관리자 화면(ISM)이 이미 겪고 고쳤다 — 그 이력과 "로컬 인터페이스 재선언 금지" 는
 * `./informal-sanction-vocabulary` 주석이 잇는다(DEC-OPS-040 으로 ISM 화면이 통합되며 서비스는 걷혔다).
 */
export type { InformalSanctionDto } from './informal-sanction-vocabulary';
export {
  SANCTION_STATUS,
  isSanctionPending,
  type SanctionStatusCode,
} from './informal-sanction-vocabulary';

import type { InformalSanctionDto, SanctionStatusCode } from './informal-sanction-vocabulary';
import { SANCTION_STATUS } from './informal-sanction-vocabulary';

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

/**
 * 결재 목록 조회 조건(2026-09-26 DIP B5 F4). 비어 있으면 조건이 없다. 기간은 요청일 yyyyMMdd 포함 범위이고,
 * 역순·형식 오류·어휘 밖 상태는 서버가 400 으로 거부한다. 대기함은 상태 조건을 받지 않는다.
 */
export interface ApprovalListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  fromYmd?: string;
  toYmd?: string;
}

export interface ApprovalListQueryWithStatus extends ApprovalListQuery {
  status?: SanctionStatusCode;
}

class ApprovalUserService extends UserService {
  constructor() {
    super('/approvals');
  }

  async getPending(params: ApprovalListQuery): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getPendingOperation, { query: params });
    return requireApprovalPage(response);
  }

  /**
   * 내가 <b>올린</b> 결재(신청자 기준). 서버 경로 이름(`/my`)과 종전 메서드명이 'history' 라
   * 결재자로서 처리한 이력으로 읽혔지만, 실제 질의는 `findByAplcntId` 다. 처리한 이력은 {@link getProcessed}.
   */
  async getMyHistory(params: ApprovalListQueryWithStatus): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getMyHistoryOperation, { query: params });
    return requireApprovalPage(response);
  }

  /** 결재자 본인이 이미 승인·반려한 결재. 대기 건은 섞이지 않는다. */
  async getProcessed(params: ApprovalListQueryWithStatus): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getProcessedOperation, { query: params });
    return requireApprovalPage(response);
  }

  /**
   * 참조된 결재(2026-10-04 D4) — 내가 참조자로 지정된 문서. 참조는 추가만 하므로 문서가 반려·회수·승인돼도, 재상신에서 빠져도
   * 남는다. 상태 조건은 문서의 지금 상태다. 참조자는 결재하지 않으므로 대기함·처리함·대기 건수에 섞이지 않는다.
   */
  async getReferenced(params: ApprovalListQueryWithStatus): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getReferencedOperation, { query: params });
    return requireApprovalPage(response);
  }

  async getDetail(ifmlAtrzSn: number): Promise<InformalSanctionDto> {
    const response = await this.executeGenerated(getApprovalDetailOperation, { path: { id: ifmlAtrzSn } });
    if (response.ifmlAtrzSn !== ifmlAtrzSn) throw new Error('상세 응답이 요청한 문서와 일치하지 않습니다.');
    // [2026-10-03] 버전은 쓰기를 할 수 있는 참여자에게만 의미가 있다. 이미 끝난 문서를 보는 사람에게는 비어 올 수 있어
    //   종전처럼 비었다고 던지면 열람만 하려던 사람이 상세를 볼 수 없었다. 값이 있는데 형식이 틀린 경우만 거부한다.
    if (response.version !== undefined && response.version !== null
      && (typeof response.version !== 'number' || !Number.isInteger(response.version) || response.version < 0)) {
      throw new Error('문서 버전을 확인할 수 없습니다. 상세를 다시 불러와 주세요.');
    }
    return response;
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
   *
   * [2026-10-03 D3] 임시저장을 이어 써서 올리면 그 번호와 읽은 버전을 쿼리로 함께 보낸다. 서버는 상신 앞에서 그 임시저장을
   * 지우고, 이미 상신되었거나 다른 곳에서 바뀌었으면 409(C013)로 거부한다 — 본문에는 싣지 않는다(재상신 요청에 새지 않게).
   */
  async createDraft(request: ApprovalDraftRequest, temporaryDraft?: ApprovalTemporaryDraftReference): Promise<number> {
    const body = ApprovalDraftRequestSchema.parse(request);
    const response = await this.executeGenerated(createApprovalOperation, temporaryDraft
      ? { body, query: { temporaryDraftSn: temporaryDraft.temporaryDraftSn, temporaryDraftVersion: temporaryDraft.version } }
      : { body });
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
    version?: number,
  ): Promise<void> {
    const request = ApprovalDecisionRequestSchema.parse({ status: aprvYn, reason: rjctRsnCn, ...(version === undefined ? {} : { version }) });
    return this.executeGenerated(confirmOperation, {
      path: { id: ifmlAtrzSn },
      body: request,
    });
  }

  /**
   * 내가 올린 결재 회수. 신청자·상태·버전은 서버가 재검증하며 문서와 차수 이력을 보존한다.
   */
  async cancelDraft(ifmlAtrzSn: number, version?: number): Promise<void> {
    return this.executeGenerated(cancelApprovalOperation, {
      path: { id: ifmlAtrzSn },
      ...(version === undefined ? {} : { query: { version } }),
    });
  }

  async resubmit(ifmlAtrzSn: number, request: ApprovalResubmissionRequest): Promise<number> {
    const response = await this.executeGenerated(resubmitApprovalOperation, {
      path: { id: ifmlAtrzSn },
      body: ApprovalResubmissionRequestSchema.parse(request),
    });
    if (typeof response !== 'number') throw new Error('재상신 응답이 문서 번호 계약과 일치하지 않습니다.');
    return response;
  }

  /** 기안 화면의 결재선 제안. 업무 구분을 주면 그 업무에서 쓴 결재선을 먼저 준다. */
  async getLineSuggestions(taskSeCd?: string): Promise<ApprovalSuggestions> {
    const response = await this.executeGenerated(getLineSuggestionsOperation, taskSeCd ? { query: { taskSeCd } } : {});
    if (!Array.isArray(response.lines) || !Array.isArray(response.otherLines) || !Array.isArray(response.recentApprovers)) {
      throw new Error('결재선 제안 응답이 계약과 일치하지 않습니다.');
    }
    return response;
  }

  /** 고른 사람이 결재자가 될 수 있는지 상신 전에 확인한다. 판정은 상신 때 서버 검사와 같다. */
  async checkApprovers(approverIds: string[]): Promise<ApproverProfile[]> {
    const response = await this.executeGenerated(checkApproversOperation, { body: ApproverCheckRequestSchema.parse({ approverIds }) });
    if (!Array.isArray(response)) throw new Error('결재자 확인 응답이 목록 계약과 일치하지 않습니다.');
    return response;
  }

  /** 지금 차례인 결재자에게 다시 알린다(하루 한 번). 알린 사람 수를 돌려준다. */
  async remind(ifmlAtrzSn: number): Promise<number> {
    const response = await this.executeGenerated(remindApproversOperation, { path: { id: ifmlAtrzSn } });
    if (typeof response !== 'number') throw new Error('재알림 응답이 계약과 일치하지 않습니다.');
    return response;
  }

  /**
   * 지금 차례인 결재자가 참조자를 더한다(2026-10-04 D4). 기안자가 이 차수에 참조자를 지정하지 않았을 때만 서버가 받는다 —
   * 지정했으면 409, 차례가 아니면 403 이다. 되돌릴 수 없으므로 상세에서 읽은 버전이 필수다. 새로 지정한 사람 수를 돌려준다
   * (모두 이미 참조자였으면 0). 실패는 상세의 참조자 영역이 화면 안에서 알린다.
   */
  async addReferences(ifmlAtrzSn: number, references: string[], version: number): Promise<number> {
    const response = await this.executeGenerated(addReferencesOperation, {
      path: { id: ifmlAtrzSn },
      body: ApprovalReferenceAddRequestSchema.parse({ references, version }),
      config: QUIET,
    });
    if (typeof response !== 'number') throw new Error('참조자 추가 응답이 계약과 일치하지 않습니다.');
    return response;
  }

  /** 아직 처리하지 않은 결재자를 다른 사람으로 바꾼다. 앞서 처리한 결재는 그대로다. */
  async replaceApprover(ifmlAtrzSn: number, fromUserId: string, toUserId: string, version: number): Promise<void> {
    return this.executeGenerated(replaceApproverOperation, {
      path: { id: ifmlAtrzSn },
      body: ApproverReplaceRequestSchema.parse({ fromUserId, toUserId, version }),
    });
  }

  /** 차례인 결재자가 기안자에게 보완을 요청한다. 문서는 진행 중으로 남는다. */
  async requestSupplement(ifmlAtrzSn: number, question: string, version: number): Promise<void> {
    return this.executeGenerated(requestSupplementOperation, {
      path: { id: ifmlAtrzSn },
      body: ApprovalSupplementRequestSchema.parse({ question, version }),
    });
  }

  /** 기안자가 보완 요청에 답한다. 본문을 함께 고칠 수 있고 앞서 한 승인은 유지된다. */
  async answerSupplement(ifmlAtrzSn: number, answer: ApprovalSupplementAnswer): Promise<void> {
    return this.executeGenerated(answerSupplementOperation, {
      path: { id: ifmlAtrzSn },
      body: ApprovalSupplementAnswerRequestSchema.parse(answer),
    });
  }

  /** 내 임시저장 목록 — 최근에 고친 순서, 최대 20건. 페이지가 아니라 배열이다(한 번에 다 읽는다). */
  async listTemporaryDrafts(): Promise<ApprovalTemporaryDraftSummary[]> {
    const response = await this.executeGenerated(getApprovalTemporaryDraftsOperation, { config: QUIET });
    if (!Array.isArray(response)) throw new Error('임시저장 목록 응답이 목록 계약과 일치하지 않습니다.');
    return response;
  }

  /** '이어 쓰기' — 본문과 결재선, 그리고 결재선 사람마다 지금 자격을 읽는다. */
  async getTemporaryDraft(temporaryDraftSn: number): Promise<ResumedApprovalTemporaryDraft> {
    const response = await this.executeGenerated(getApprovalTemporaryDraftOperation, { path: { temporaryDraftSn }, config: QUIET });
    if (response.temporaryDraftSn !== temporaryDraftSn) throw new Error('임시저장 응답이 요청한 임시저장과 일치하지 않습니다.');
    requireDraftVersion(response.version);
    return { ...response, temporaryDraftSn, version: response.version };
  }

  /** 첫 저장. 저장한 번호와 버전을 돌려준다 — 화면은 그 버전으로 다음 저장·상신을 한다. */
  async createTemporaryDraft(request: ApprovalTemporaryDraftRequest): Promise<SavedApprovalTemporaryDraft> {
    const response = await this.executeGenerated(createApprovalTemporaryDraftOperation, {
      body: ApprovalTemporaryDraftRequestSchema.parse(request),
      config: QUIET,
    });
    return requireSavedTemporaryDraft(response);
  }

  /** 다시 저장 — 내용과 결재선을 통째로 바꾼다. 요청의 버전이 서버와 다르면 409(C013)다. */
  async updateTemporaryDraft(temporaryDraftSn: number, request: ApprovalTemporaryDraftRequest): Promise<SavedApprovalTemporaryDraft> {
    const response = await this.executeGenerated(updateApprovalTemporaryDraftOperation, {
      path: { temporaryDraftSn },
      body: ApprovalTemporaryDraftRequestSchema.parse(request),
      config: QUIET,
    });
    if (response.temporaryDraftSn !== temporaryDraftSn) throw new Error('임시저장 응답이 요청한 임시저장과 일치하지 않습니다.');
    return requireSavedTemporaryDraft(response);
  }

  /** 임시저장 삭제. 결재선 행은 서버가 함께 지운다. */
  async deleteTemporaryDraft(temporaryDraftSn: number): Promise<void> {
    return this.executeGenerated(deleteApprovalTemporaryDraftOperation, { path: { temporaryDraftSn }, config: QUIET });
  }
}

/**
 * 임시저장 요청의 실패는 기안 창이 화면 안에서 알린다(목록은 상태 문구, 저장·이어 쓰기·삭제는 오류 안내). 전역 오류 토스트를
 * 겹쳐 띄우지 않도록 선언한다(DEC-OPS-184). 결재자의 참조자 추가(D4)도 상세의 참조자 영역이 사유를 보이므로 같다.
 */
const QUIET = { suppressErrorToast: true } as const;

/** 버전은 다음 저장·상신의 낙관적 잠금 값이다. 비거나 형식이 틀리면 덮어쓰기를 막을 수 없으므로 받지 않는다. */
function requireDraftVersion(version: unknown): asserts version is number {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new Error('임시저장 버전을 확인할 수 없습니다. 목록을 다시 불러와 주세요.');
  }
}

function requireSavedTemporaryDraft(response: ApprovalTemporaryDraftSummary): SavedApprovalTemporaryDraft {
  const temporaryDraftSn = response.temporaryDraftSn;
  if (typeof temporaryDraftSn !== 'number' || !Number.isInteger(temporaryDraftSn)) {
    throw new Error('임시저장 응답이 번호 계약과 일치하지 않습니다.');
  }
  requireDraftVersion(response.version);
  return { ...response, temporaryDraftSn, version: response.version };
}

export const approvalUserService = new ApprovalUserService();
