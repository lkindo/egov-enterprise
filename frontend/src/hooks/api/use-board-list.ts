import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api/client';
import { BoardPost, BoardResponse } from '@/types/business/board';

export interface BoardListParams {
  bbsId: string;
  page번호: number;
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
      const { bbsId, page번호, pageUnit, ...restParams } = params;
      const queryParams = {
        page: page번호 - 1,
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
