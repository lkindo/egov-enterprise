import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  confirmInformalSanctionOperation,
  deleteInformalSanctionOperation,
  getInformalSanctionListOperation,
  getInformalSanctionOperation,
  registerInformalSanctionOperation,
  updateInformalSanctionOperation,
} from '@/types/generated-operations';

/**
 * 약식결재(비정형 결재) DTO — 백엔드 `InformalSanctionDto` 의 생성 타입을 그대로 재수출한다.
 * [FE 헌법] `generated-api.d.ts` 가 API 계약의 SSOT 이며, 로컬 인터페이스 재선언은 금지한다.
 * (과거 로컬 `InfrmlSanctn` 재선언이 DTO 와 전면 불일치하여 목록 전 행 공백 / 승인 100% 실패를 유발했다.)
 */
export type InformalSanctionDto = components['schemas']['InformalSanctionDto'];
type InformalSanctionListQuery = NonNullable<
  operations['getInformalSanctionList']['parameters']['query']
>;

function toInformalSanctionListQuery(
  params: SearchParams | undefined,
  type?: string,
): InformalSanctionListQuery | undefined {
  if (!params && type === undefined) return undefined;
  const query = { ...params, ...(type === undefined ? {} : { type }) };
  return query as InformalSanctionListQuery;
}

function requireInformalSanctionPage(
  response: components['schemas']['PageResponseInformalSanctionDto'],
): PageResponse<InformalSanctionDto> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('약식결재 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<InformalSanctionDto>;
}

/**
 * 결재 상태 코드 — 백엔드 `SanctionStatus` 열거형과 1:1 대응한다.
 * 임의 변환(예: 'C' → 'Y') 금지. 서버가 기대하는 코드를 그대로 전달한다.
 */
export const SANCTION_STATUS = {
  /** 신청(대기) */
  REQUESTED: 'A',
  /** 승인 */
  APPROVED: 'C',
  /** 반려 */
  REJECTED: 'R',
} as const;

export type SanctionStatusCode = (typeof SANCTION_STATUS)[keyof typeof SANCTION_STATUS];

/** 결재 대기(미처리) 여부 — 초기 상태는 'A'(신청)이며, 미설정도 대기로 간주한다. */
export function isSanctionPending(aprvYn?: string): boolean {
  return !aprvYn || aprvYn === SANCTION_STATUS.REQUESTED;
}

/**
 * 약식결재(Informal Sanction) 관리 서비스(Admin)
 */
class IsmAdminService extends ApiService {
  constructor() {
    // 실제 경로는 각 generated operation이 소유한다. basePath도 같은 도메인명으로 유지한다.
    super('informal-sanctions');
  }

  /** 결재 대기함(내가 결재자인 건) 목록 조회 */
  async getPendingList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getInformalSanctionListOperation, {
      query: toInformalSanctionListQuery(params, 'received'),
      config,
    });
    return requireInformalSanctionPage(response);
  }

  /** 신청함(내가 신청자인 건) 목록 조회 */
  async getHistoryList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InformalSanctionDto>> {
    const response = await this.executeGenerated(getInformalSanctionListOperation, {
      query: toInformalSanctionListQuery(params),
      config,
    });
    return requireInformalSanctionPage(response);
  }

  /** 신청 상세 조회 */
  async getInfrmlSanctn(id: number, config?: AxiosRequestConfig): Promise<InformalSanctionDto> {
    return this.executeGenerated(getInformalSanctionOperation, {
      path: { informalSanctionId: id },
      config,
    });
  }

  /** 신청 등록 */
  async createInfrmlSanctn(data: Partial<InformalSanctionDto>, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(registerInformalSanctionOperation, {
      body: data as InformalSanctionDto,
      config,
    });
  }

  /** 신청 수정 */
  async updateInfrmlSanctn(id: number, data: Partial<InformalSanctionDto>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateInformalSanctionOperation, {
      path: { informalSanctionId: id },
      body: data as InformalSanctionDto,
      config,
    });
  }

  /**
   * 신청 승인/반려.
   * 쿼리 파라미터 이름(`confmAt`/`returnResn`)은 컨트롤러 시그니처이므로 유지하되,
   * 값은 `SanctionStatus` 실제 코드('C' 승인 / 'R' 반려)를 그대로 전달한다.
   */
  async confirmInfrmlSanctn(
    id: number,
    aprvYn: Extract<SanctionStatusCode, 'C' | 'R'>,
    rjctRsnCn?: string,
    config?: AxiosRequestConfig,
  ): Promise<void> {
    return this.executeGenerated(confirmInformalSanctionOperation, {
      path: { informalSanctionId: id },
      query: {
        confmAt: aprvYn,
        returnResn: rjctRsnCn,
      },
      config,
    });
  }

  /**
   * 신청 삭제.
   * [주의] 서버는 **신청자 본인 + 'A'(신청) 상태**에서만 삭제를 허용한다
   * (`InformalSanctionService.deleteInformalSanction`). 결재 대기함(`type=received`)은
   * 결재자 시점이므로 이 경로에서 호출하면 항상 403 이다. 신청함 화면에서만 사용할 것.
   */
  async deleteInfrmlSanctn(id: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteInformalSanctionOperation, {
      path: { informalSanctionId: id },
      config,
    });
  }
}

export const ismAdminService = new IsmAdminService();
