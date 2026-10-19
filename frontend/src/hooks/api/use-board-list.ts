import { useQuery } from '@tanstack/react-query';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';

export interface BoardListParams {
  bbsId: string;
  /** 1부터 세는 페이지 번호 (URL 쿼리 `?page=` 와 서버 query `page` 가 같은 규약 — ADR-0036). */
  page: number;
  /** 페이지당 건수(서버 query `size`). */
  size: number;
  searchWrd: string;
  searchCnd: string;
  orderBy: string;
  startDate?: string;
  endDate?: string;
  /** 기간 기준(DIP V6). 캘린더 템플릿은 'EVENT' 로 행사일 기준 월 범위를 조회한다. */
  dateBasis?: 'CREATED' | 'EVENT';
}

export const useBoardList = (params: BoardListParams, initialData?: { list: BoardPost[]; total: number; totalPage: number }) => {
  const { bbsId } = params;
  return useQuery({
    queryKey: ['boardList', bbsId, params],
    initialData,
    queryFn: async () => {
      const { page, size, searchWrd, searchCnd, orderBy, startDate, endDate, dateBasis } = params;

      const data = await boardUserService.getPosts(bbsId, {
        // BoardListClient 는 URL 의 page(1부터)를 그대로 넘기고, 서버도 같은 번호를 받는다(ADR-0036) — 변환하지 않는다.
        page: page || 1,
        size: size || 10,
        searchWrd,
        searchCnd,
        // 정렬·기간 필터는 BoardApiController 가 지원하는 파라미터다. 과거 구조분해에서 누락되어 무동작이었다.
        orderBy,
        startDate,
        endDate,
        ...(dateBasis ? { dateBasis } : {}),
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
