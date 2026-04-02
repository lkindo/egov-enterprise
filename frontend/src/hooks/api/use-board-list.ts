import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api/client';
import { BoardPost, BoardResponse } from '@/types/business/board';

export interface BoardListParams {
  bbsId: string;
  page: number;
  pageUnit: number;
  searchWrd: string;
  searchCnd: string;
  orderBy: string;
  startDate?: string;
  endDate?: string;
}

export const useBoardList = (params: BoardListParams, initialData?: { resultList: BoardPost[]; totalCount: number; totalPages: number }) => {
  return useQuery({
    queryKey: ['boardList', params],
    initialData,
    queryFn: async () => {
      const { bbsId, page, pageUnit, ...restParams } = params;
      const queryParams = {
        page: page - 1, // Zero-based index for backend
        size: pageUnit || 10,
        ...restParams
      };

      const data = await client.get<BoardResponse>(`/boards/${bbsId}`, { params: queryParams });

      // Spring Data Page 구조 반영
      return {
        resultList: data.content || [],
        totalCount: data.totalElements || 0,
        totalPages: data.totalPages || 0
      };
    },
    staleTime: 60 * 1000,
  });
};
