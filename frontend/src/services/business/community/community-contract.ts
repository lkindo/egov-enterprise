import type { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import type { PageResponse } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';

type CommunityListQuery = NonNullable<operations['getCommunities_1']['parameters']['query']>;

/** 사용자 커뮤니티 목록은 page를 1-based 별칭보다 우선한다. */
export function toCommunityListQuery(params: CommunitySearchParams): CommunityListQuery {
  const raw = params as Record<string, unknown>;
  const page = params.page
    ?? (params.pageIndex === undefined ? undefined : Math.max(0, params.pageIndex - 1))
    ?? (params.pageNo === undefined ? undefined : Math.max(0, params.pageNo - 1));
  const size = typeof params.size === 'number'
    ? params.size
    : typeof params.pageUnit === 'number'
      ? params.pageUnit
      : typeof raw.pageSize === 'number'
        ? raw.pageSize
        : undefined;
  const searchCnd = typeof raw.searchCnd === 'string' ? raw.searchCnd : params.searchCondition;
  const searchWrd = typeof raw.searchWrd === 'string' ? raw.searchWrd : params.searchKeyword;
  const sort = Array.isArray(raw.sort) && raw.sort.every((item) => typeof item === 'string')
    ? raw.sort as string[]
    : undefined;

  return {
    ...(page === undefined ? {} : { page }),
    ...(size === undefined ? {} : { size }),
    ...(searchCnd === undefined ? {} : { searchCnd }),
    ...(searchWrd === undefined ? {} : { searchWrd }),
    ...(sort === undefined ? {} : { sort }),
  };
}

/** 생성 응답의 optional 필드를 화면에 필요한 페이지 계약으로 좁힌다. */
export function requireCommunityPage(
  response: components['schemas']['PageResponseCommunityDto'],
): PageResponse<CommunityVO> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as unknown as PageResponse<CommunityVO>;
}
