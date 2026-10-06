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

/** 배너·관리자 커뮤니티의 기존 페이지 별칭 우선순위를 유지한다. */
export function toAdminPageQuery(params: SearchParams): {
  page?: number;
  size?: number;
  sort?: string[];
} {
  return {
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
    ...(params.sort === undefined ? {} : { sort: params.sort as string[] }),
  };
}
