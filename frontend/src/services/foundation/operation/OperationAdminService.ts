import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

/**
 * 외부인사정보 (ExternalHrDto 백엔드 계약과 1:1 대응)
 * - 서버: nuri.business.service.operation.dto.ExternalHrDto
 */
export interface ExternalHr {
  evntId?: string;
  otsdHrId?: string;
  otsdHrNm?: string;
  gndrCd?: string;
  crTypeCd?: string;
  ogdpInstNm?: string;
  brdtYmd?: string;
  areaNo?: string;
  mdTelno?: string;
  endTelno?: string;
  emlAddr?: string;
  crtDt?: string;
  frstRgtrId?: string;
  mdfcnDt?: string;
  lastMdfrId?: string;
}

/**
 * 포상정보 (RewardManageDto 백엔드 계약과 1:1 대응)
 * - 서버: nuri.business.service.operation.dto.RewardManageDto
 */
export interface Reward {
  rwrdSn?: number;
  rwardwnrId?: string;
  rwardCode?: string;
  rwardDe?: string;
  rwardNm?: string;
  pblenCn?: string;
  sanctnerId?: string;
  confmAt?: string;
  sanctnDt?: string;
  returnResn?: string;
  atchFileSn?: number;
  ifmlAtrzSn?: number;
  frstRgtrId?: string;
  crtDt?: string;
  lastMdfrId?: string;
  mdfcnDt?: string;
}

/**
 * 운영지원 목록 조회 파라미터.
 * - `name`: 서버가 @RequestParam("name") 으로 받는 검색어(성명/포상명 부분일치)
 * - `page`: Spring Data Pageable 0-based 페이지 번호
 * - `size`: 페이지당 건수
 */
export interface OperationSearchParams extends SearchParams {
  name?: string;
}

/**
 * 운영지원(외부인사·포상) 관리자 서비스
 * 목록 응답은 백엔드 PageResponse(list/total/page/size/totalPage) 표준을 따른다.
 */
class OperationAdminService extends ApiService {
  constructor() {
    super('/admin/operation');
  }

  /**
   * 외부인사정보 목록 조회 (페이징)
   */
  async getExternalHrList(
    params?: OperationSearchParams,
    config?: AxiosRequestConfig
  ): Promise<PageResponse<ExternalHr>> {
    return this.get<PageResponse<ExternalHr>>('/external-hr', { ...config, params });
  }

  /**
   * 외부인사정보 등록
   */
  async createExternalHr(data: Partial<ExternalHr>, config?: AxiosRequestConfig): Promise<ExternalHr> {
    return this.post<ExternalHr>('/external-hr', data, config);
  }

  /**
   * 포상 목록 조회 (페이징)
   */
  async getRewardList(
    params?: OperationSearchParams,
    config?: AxiosRequestConfig
  ): Promise<PageResponse<Reward>> {
    return this.get<PageResponse<Reward>>('/rewards', { ...config, params });
  }

  /**
   * 포상 정보 등록
   */
  async createReward(data: Partial<Reward>, config?: AxiosRequestConfig): Promise<Reward> {
    return this.post<Reward>('/rewards', data, config);
  }
}

export const operationAdminService = new OperationAdminService();

/** 빈 페이지 응답 (초기 로드 실패 시 안전 폴백) */
export function emptyPage<T>(size = 10): PageResponse<T> {
  return { list: [], total: 0, page: 1, size, totalPage: 0 };
}
