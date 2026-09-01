import type { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  deleteUserAuthoritiesOperation,
  getUserAuthoritiesOperation,
  saveUserAuthoritiesOperation,
} from '@/types/generated-operations';

export type UserAuthorityDto = components['schemas']['UserAuthorityDto'];

export interface AuthorGroupProjection {
  scrtyDcsnTrgtId: string;
  userId: string;
  userNm: string;
  authrtId?: string;
  mbrTypeCd: string;
  regYn: string;
  groupId?: string;
  mberTyNm?: string;
}

type UserAuthorityQuery = NonNullable<operations['getUserAuthorities']['parameters']['query']>;

const USER_AUTHORITY_QUERY_KEYS = new Set([
  'authorCode',
  'page',
  'searchCondition',
  'searchKeyword',
  'searchUseYn',
  'pageIndex',
  'pageUnit',
  'pageSize',
  'firstIndex',
  'lastIndex',
  'recordCountPerPage',
  'searchKeywordFrom',
  'searchKeywordTo',
]);

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${name} 쿼리 값이 문자열이 아닙니다.`);
  return value;
}

function optionalNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number') throw new Error(`${name} 쿼리 값이 숫자가 아닙니다.`);
  return value;
}

function toUserAuthorityQuery(params?: SearchParams): UserAuthorityQuery {
  if (!params) return {};
  const unsupported = Object.keys(params).filter(
    (key) => params[key] !== undefined && !USER_AUTHORITY_QUERY_KEYS.has(key),
  );
  if (unsupported.length > 0) {
    throw new Error(`사용자 권한 OpenAPI에 없는 쿼리입니다: ${unsupported.join(', ')}`);
  }
  if (params.page !== undefined && params.pageIndex !== undefined) {
    throw new Error('page와 pageIndex를 함께 지정할 수 없습니다.');
  }

  const authorCode = optionalString(params.authorCode, 'authorCode');
  const page = optionalNumber(params.page, 'page');
  const searchCondition = optionalString(params.searchCondition, 'searchCondition');
  const searchKeyword = optionalString(params.searchKeyword, 'searchKeyword');
  const searchUseYn = optionalString(params.searchUseYn, 'searchUseYn');
  const pageIndex = optionalNumber(params.pageIndex, 'pageIndex');
  const pageUnit = optionalNumber(params.pageUnit, 'pageUnit');
  const pageSize = optionalNumber(params.pageSize, 'pageSize');
  const firstIndex = optionalNumber(params.firstIndex, 'firstIndex');
  const lastIndex = optionalNumber(params.lastIndex, 'lastIndex');
  const recordCountPerPage = optionalNumber(params.recordCountPerPage, 'recordCountPerPage');
  const searchKeywordFrom = optionalString(params.searchKeywordFrom, 'searchKeywordFrom');
  const searchKeywordTo = optionalString(params.searchKeywordTo, 'searchKeywordTo');

  return {
    ...(authorCode === undefined ? {} : { authorCode }),
    ...(searchCondition === undefined ? {} : { searchCondition }),
    ...(searchKeyword === undefined ? {} : { searchKeyword }),
    ...(searchUseYn === undefined ? {} : { searchUseYn }),
    ...((page ?? pageIndex) === undefined ? {} : { pageIndex: page ?? pageIndex }),
    ...(pageUnit === undefined ? {} : { pageUnit }),
    ...(pageSize === undefined ? {} : { pageSize }),
    ...(firstIndex === undefined ? {} : { firstIndex }),
    ...(lastIndex === undefined ? {} : { lastIndex }),
    ...(recordCountPerPage === undefined ? {} : { recordCountPerPage }),
    ...(searchKeywordFrom === undefined ? {} : { searchKeywordFrom }),
    ...(searchKeywordTo === undefined ? {} : { searchKeywordTo }),
  };
}

function requireAuthorGroup(
  item: components['schemas']['AuthorGroupProjection'],
): AuthorGroupProjection {
  if (
    typeof item.scrtyDcsnTrgtId !== 'string'
    || typeof item.userId !== 'string'
    || typeof item.userNm !== 'string'
    || typeof item.mbrTypeCd !== 'string'
    || typeof item.regYn !== 'string'
    || (item.authrtId != null && typeof item.authrtId !== 'string')
    || (item.regYn === 'Y' && typeof item.authrtId !== 'string')
  ) {
    throw new Error('사용자 권한 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    scrtyDcsnTrgtId: item.scrtyDcsnTrgtId,
    userId: item.userId,
    userNm: item.userNm,
    mbrTypeCd: item.mbrTypeCd,
    regYn: item.regYn,
    ...(item.authrtId == null ? {} : { authrtId: item.authrtId }),
    ...(item.groupId == null ? {} : { groupId: item.groupId }),
    ...(item.mberTyNm == null ? {} : { mberTyNm: item.mberTyNm }),
  };
}

function requireUserAuthorityPage(
  response: {
    list?: components['schemas']['AuthorGroupProjection'][];
    total?: number;
    page?: number;
    size?: number;
    totalPage?: number;
  },
): PageResponse<AuthorGroupProjection> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('사용자 권한 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(requireAuthorGroup),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 사용자권한 관리 서비스 (Admin). */
class UserAuthorityAdminService extends AdminService {
  constructor() {
    super('/user-authorities');
  }

  async getUserAuthorityList(
    params?: SearchParams,
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<AuthorGroupProjection>> {
    const response = await this.executeGenerated(getUserAuthoritiesOperation, {
      query: toUserAuthorityQuery(params),
      config,
    });
    return requireUserAuthorityPage(response);
  }

  async saveUserAuthorities(data: UserAuthorityDto[], config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(saveUserAuthoritiesOperation, { body: data, config });
  }

  async saveUserAuthority(data: UserAuthorityDto, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(saveUserAuthoritiesOperation, { body: [data], config });
  }

  async deleteUserAuthorities(uniqIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteUserAuthoritiesOperation, { body: uniqIds, config });
  }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
