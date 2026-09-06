import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  approveMemberOperation,
  createCommunityOperation,
  deleteCommunityOperation,
  getCommunitiesOperation,
  getCommunityOperation,
  getCommunityPortletOperation,
  getMembersOperation,
  type GeneratedOperationRequest,
  rejectMemberOperation,
  updateCommunityOperation,
} from '@/types/generated-operations';

export interface Community {
  cmntySn: number;
  cmntyNm: string;
  cmntyIntrcn: string;
  useYn: 'Y' | 'N';
  rgstrSeCd?: string;
  frstRgtrId?: string;
  crtDt?: string;
}

type CommunityWire = components['schemas']['CommunityDto'];
type CommunityMemberWire = components['schemas']['CommunityMemberDto'];
type MemberListQuery = NonNullable<operations['getMembers']['parameters']['query']>;

/** 서버가 내려주는 멤버십 상태 어휘. 어휘 밖 코드는 status 가 비고 mbrSttsCd 원문만 온다. */
export type CommunityMemberStatus = NonNullable<CommunityMemberWire['status']>;
export type CommunityMemberStatusFilter = CommunityMemberStatus | 'ALL';

/** 관리자용 회원·가입 신청 행. userId 는 로그인 ID 가 아니라 esntlId 다(tb_cmnty_user_map.user_id). */
export interface CommunityMember {
  cmntySn: number;
  userId: string;
  userNm: string | null;
  status: CommunityMemberStatus | null;
  mbrSttsCd: string;
  mngrYn: string;
  joinYmd: string | null;
  useYn: string;
}

function fromCommunityMember(value: CommunityMemberWire): CommunityMember {
  if (typeof value.cmntySn !== 'number' || typeof value.userId !== 'string') {
    throw new Error('커뮤니티 회원 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    cmntySn: value.cmntySn,
    userId: value.userId,
    userNm: value.userNm ?? null,
    status: value.status ?? null,
    mbrSttsCd: value.mbrSttsCd ?? '',
    mngrYn: value.mngrYn ?? 'N',
    joinYmd: value.joinYmd ?? null,
    useYn: value.useYn ?? 'Y',
  };
}

function requireMemberPage(
  response: components['schemas']['PageResponseCommunityMemberDto'],
): PageResponse<CommunityMember> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('커뮤니티 회원 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(fromCommunityMember),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}
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
  // ─── 멤버십 (2026-09-06 DEC-OPS-043) ────────────────────────────────────────────────────────

  /** 회원·가입 신청 목록. status 를 생략하면 전체. */
  async getMembers(
    cmntySn: number,
    params: { status?: CommunityMemberStatus; page?: number; size?: number } = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<CommunityMember>> {
    const query: MemberListQuery = {
      ...(params.status === undefined ? {} : { status: params.status }),
      ...(params.page === undefined ? {} : { page: params.page }),
      ...(params.size === undefined ? {} : { size: params.size }),
    };
    const response = await this.executeGenerated(getMembersOperation, { path: { cmntySn }, query, config });
    return requireMemberPage(response);
  }

  /** 가입 신청 승인 — 신청(REQUESTED) 행만 회원이 된다. */
  async approveMember(cmntySn: number, userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(approveMemberOperation, { path: { cmntySn, userId }, config });
  }

  /** 가입 신청 반려 — 신청 행을 지운다(사용자는 다시 신청할 수 있다). 회원 행은 대상이 아니다. */
  async rejectMember(cmntySn: number, userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(rejectMemberOperation, { path: { cmntySn, userId }, config });
  }

  async getCommunityPortlet(config?: AxiosRequestConfig): Promise<Community[]> {
    const response = await this.executeGenerated(getCommunityPortletOperation, { config });
    return response.map(fromCommunity);
  }
}

export const communityAdminService = new CommunityAdminService();
