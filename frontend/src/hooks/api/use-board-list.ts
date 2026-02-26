import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api/client';

export interface BoardListParams {
    bbsId: string;
    pageIndex: number;
    pageUnit: number;
    searchWrd: string;
    searchCnd: string;
    orderBy: string;
    startDate?: string;
    endDate?: string;
}

export const useBoardList = (params: BoardListParams, initialData?: any) => {
    return useQuery({
        queryKey: ['boardList', params],
        initialData,
        queryFn: async () => {
            const data: any = await client.get('/bbs', { params });
            // The global axios interceptor un-wraps the response to be just the API payload data.
            // If the payload contains resultList directly, or is inside data property:
            const resultList = data.resultList || data.data?.resultList || [];
            const totalCount = data.totalCount || data.data?.totalCount || 0;
            const totalPages = data.totalPages || data.data?.totalPages || 0;

            return { resultList, totalCount, totalPages };
        },
        staleTime: 60 * 1000,
    });
};
