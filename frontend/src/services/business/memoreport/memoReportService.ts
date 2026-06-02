import client from '@/lib/api/client';

export interface MemoReportInfo {
  rptId: string;
  rptTtl: string;
  rptCn: string;
  userId: string;
  wrterNm: string;
  rptrId: string;
  rptrNm: string;
  memoRptYmd: string;
  drctnMttr?: string;
  drctnMttrRegDt?: string;
  rptrInqDt?: string;
  createdDate: string;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
}

const BASE_URL = 'memo-reports';

export const memoReportService = {
  getMemoReports: async (params: { searchKeyword?: string; page?: number; size?: number } = {}) => {
    return client.get<PageResponse<MemoReportInfo>>(BASE_URL, { params });
  },
  getMyReports: async (params: { page?: number; size?: number } = {}) => {
    return client.get<PageResponse<MemoReportInfo>>(`${BASE_URL}/my`, { params });
  },
  getReceivedReports: async (params: { page?: number; size?: number } = {}) => {
    return client.get<PageResponse<MemoReportInfo>>(`${BASE_URL}/received`, { params });
  },
  getMemoReport: async (rptId: string) => {
    return client.get<MemoReportInfo>(`${BASE_URL}/${rptId}`);
  },
  createMemoReport: async (data: Partial<MemoReportInfo>) => {
    return client.post<string>(BASE_URL, data);
  },
  updateMemoReport: async (rptId: string, data: Partial<MemoReportInfo>) => {
    return client.put<void>(`${BASE_URL}/${rptId}`, data);
  },
  updateDrctMatter: async (rptId: string, drctnMttr: string) => {
    return client.patch<void>(`${BASE_URL}/${rptId}/instr-cn`, drctnMttr);
  },
  deleteMemoReport: async (rptId: string) => {
    return client.delete<void>(`${BASE_URL}/${rptId}`);
  }
};
