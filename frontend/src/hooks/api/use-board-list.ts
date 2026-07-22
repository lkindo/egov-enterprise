import { useQuery } from '@tanstack/react-query';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';

export interface BoardListParams {
  bbsId: string;
  /** 1-based 페이지 번호 (URL 쿼리 `?page=` 와 동일 규약). 훅 내부에서 0-based Pageable 로 변환한다. */
  page: number;
  pageUnit: number;
  searchWrd: string;
  searchCnd: string;
  orderBy: string;
  startDate?: string;
  endDate?: string;
}

export const useBoardList = (params: BoardListParams, initialData?: { list: BoardPost[]; total: number; totalPage: number }) => {
  const { bbsId } = params;
  return useQuery({
    queryKey: ['boardList', bbsId, params],
    initialData,
    queryFn: async () => {
      const { page, pageUnit, searchWrd, searchCnd, orderBy, startDate, endDate } = params;

      const data = await boardUserService.getPosts(bbsId, {
        // BoardListClient 는 URL 의 1-based page 를 그대로 넘긴다. 백엔드 BoardApiController 는 Spring
        // Pageable(0-based)만 바인딩하므로 여기서 1을 뺀다(SSR 경로 BoardListServer 의 `page - 1` 과 동일 규약).
        // ApiService.get 은 page 를 삭제하지 않고 pageIndex(=page+1)만 덧붙이며, 이 엔드포인트는 pageIndex 를
        // 사용하지 않으므로 이중 보정은 발생하지 않는다.
        page: Math.max(0, (page || 1) - 1),
        size: pageUnit || 10,
        searchWrd,
        searchCnd,
        // 정렬·기간 필터는 BoardApiController 가 지원하는 파라미터다. 과거 구조분해에서 누락되어 무동작이었다.
        orderBy,
        startDate,
        endDate
      });

      return {
        list: data.list || [],
        total: data.total || 0,
        totalPage: data.totalPage || 0
      };
    },
    staleTime: 60 * 1000,
  });
};
