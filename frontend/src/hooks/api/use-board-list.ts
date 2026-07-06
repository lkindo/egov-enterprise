import { useQuery } from '@tanstack/react-query';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';

export interface BoardListParams {
  bbsId: string;
  page: number; // 0-based index
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
      const { page, pageUnit, searchWrd, searchCnd } = params;
      
      const data = await boardUserService.getPosts(bbsId, {
        page: page, // Passing 0-based page, ApiService will handle pageIndex
        size: pageUnit || 10,
        searchWrd,
        searchCnd
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
