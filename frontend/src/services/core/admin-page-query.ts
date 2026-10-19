import type { SearchParams } from '@/types/foundation/system';

/**
 * 목록 정렬 인자를 생성 query 의 `sort` 배열로 맞춘다. 문자열 하나(`'hlpSn,DESC'`)는 한 칸 배열로,
 * 배열은 문자열 원소만 남기고, 그 밖의 값은 정렬 없음(undefined)으로 본다.
 */
export function toSortList(sort: unknown): string[] | undefined {
  return Array.isArray(sort)
    ? sort.filter((value): value is string => typeof value === 'string')
    : typeof sort === 'string'
      ? [sort]
      : undefined;
}

/**
 * 목록 인자에서 페이지 query(`page`·`size`·`sort`)만 골라 낸다. `page` 는 1부터이고 서버가 받는 그대로 넘긴다(ADR-0036).
 *
 * <p>종전에는 0 기반 `page` 와 1 기반 `pageIndex`·`pageNo`, 크기 별칭 `pageUnit`·`pageSize`·`recordCountPerPage` 를
 * 우선순위대로 골라 ±1 변환했다. 요청·응답·화면이 모두 1 기반으로 같아져 변환할 것이 없다.
 */
export function toAdminPageQuery(params: SearchParams): {
  page?: number;
  size?: number;
  sort?: string[];
} {
  return {
    ...(params.page === undefined ? {} : { page: params.page }),
    ...(params.size === undefined ? {} : { size: params.size }),
    ...(params.sort === undefined ? {} : { sort: params.sort as string[] }),
  };
}
