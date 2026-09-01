import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  createCommunityOperation,
  deleteCommunityOperation,
  getCommunitiesOperation,
  getCommunityOperation,
  getCommunityPortletOperation,
  type GeneratedOperationRequest,
  updateCommunityOperation,
} from '@/types/generated-operations';

interface Community {
  cmntySn: number;
  cmntyNm: string;
  cmntyIntrcn: string;
  useYn: 'Y' | 'N';
  rgstrSeCd?: string;
  frstRgtrId?: string;
  crtDt?: string;
}

type CommunityWire = components['schemas']['CommunityDto'];
type CommunityListQuery = NonNullable<operations['getCommunities']['parameters']['query']>;

function toCommunityListQuery(params?: SearchParams): CommunityListQuery {
  if (!params) return { searchCnd: '', searchWrd: '' };
  const rawSort = params.sort;
  return {
    searchCnd: params.searchCondition || '',
    searchWrd: params.searchKeyword || params.searchWrd || '',
    ...(params.pageIndex !== undefined
      ? { page: Math.max(0, params.pageIndex - 1) }
      : params.page !== undefined
        ? { page: params.page }
        : params.pageNo !== undefined
          ? { page: Math.max(0, params.pageNo - 1) }
          : {}),
    ...(params.size !== undefined
      ? { size: params.size }
      : params.pageUnit !== undefined
        ? { size: params.pageUnit }
        : params.pageSize !== undefined
          ? { size: params.pageSize as number }
          : params.recordCountPerPage !== undefined
            ? { size: params.recordCountPerPage as number }
            : {}),
    ...(rawSort === undefined ? {} : { sort: rawSort as string[] }),
  };
}

function toCommunityRequest(data: Partial<Community>): CommunityWire {
  const source = data as Partial<Community> & Partial<CommunityWire>;
  const { cmntyIntrcn, rgstrSeCd, ...wire } = source;
  return {
    ...wire,
    ...(source.cmntyIntroCn !== undefined
      ? { cmntyIntroCn: source.cmntyIntroCn }
      : cmntyIntrcn !== undefined
        ? { cmntyIntroCn: cmntyIntrcn }
        : {}),
    ...(source.regSeCd !== undefined
      ? { regSeCd: source.regSeCd }
      : rgstrSeCd !== undefined
        ? { regSeCd: rgstrSeCd }
        : {}),
  } as CommunityWire;
}

function fromCommunity(value: CommunityWire): Community {
  if (
    typeof value.cmntySn !== 'number'
    || typeof value.cmntyNm !== 'string'
    || typeof value.cmntyIntroCn !== 'string'
  ) {
    throw new Error('커뮤니티 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    ...value,
    cmntySn: value.cmntySn,
    cmntyNm: value.cmntyNm,
    cmntyIntrcn: value.cmntyIntroCn,
    useYn: value.useYn,
    rgstrSeCd: value.regSeCd,
  };
}

function requireCommunityPage(
  response: components['schemas']['PageResponseCommunityDto'],
): PageResponse<Community> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(fromCommunity),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/**
 * 커뮤니티 관리 서비스 (Admin)
 */
class CommunityAdminService extends AdminService {
  constructor() {
    super('/community', 'content');
  }

  /** 커뮤니티 목록 조회 */
  async getCommunityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Community>> {
    const response = await this.executeGenerated(getCommunitiesOperation, {
      query: toCommunityListQuery(params),
      config,
    });
    return requireCommunityPage(response);
  }

  /** 커뮤니티 상세 조회 */
  async getCommunity(cmntySn: number, config?: AxiosRequestConfig): Promise<Community> {
    const response = await this.executeGenerated(getCommunityOperation, { path: { cmntySn }, config });
    return fromCommunity(response);
  }

  /** 커뮤니티 개설/등록 */
  async createCommunity(data: Partial<Community>, config?: AxiosRequestConfig): Promise<Community> {
    const response = await this.executeGenerated(createCommunityOperation, {
      body: toCommunityRequest(data) as GeneratedOperationRequest<'createCommunity'>,
      config,
    });
    return fromCommunity(response);
  }

  /** 커뮤니티 정보 수정 */
  async updateCommunity(cmntySn: number, data: Partial<Community>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateCommunityOperation, {
      path: { cmntySn },
      body: toCommunityRequest(data) as GeneratedOperationRequest<'updateCommunity'>,
      config,
    });
  }

  /** 커뮤니티 삭제/폐쇄 */
  async deleteCommunity(cmntySn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteCommunityOperation, { path: { cmntySn }, config });
  }

  /** ы由우슜 목록 조회 */
  async getCommunityPortlet(config?: AxiosRequestConfig): Promise<Community[]> {
    const response = await this.executeGenerated(getCommunityPortletOperation, { config });
    return response.map(fromCommunity);
  }
}

export const communityAdminService = new CommunityAdminService();
