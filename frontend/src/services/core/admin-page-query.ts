import type { SearchParams } from '@/types/foundation/system';

/** 배너·부서·관리자 커뮤니티의 기존 페이지 별칭 우선순위를 유지한다. */
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
