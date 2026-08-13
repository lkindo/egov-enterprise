import client from '@/lib/api/client';

export interface MemoReportInfo {
  memoRptSn: number;
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
  crtDt: string;
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
  getMemoReport: async (memoRptSn: number) => {
    return client.get<MemoReportInfo>(`${BASE_URL}/${memoRptSn}`);
  },
  createMemoReport: async (data: Partial<MemoReportInfo>) => {
    return client.post<number>(BASE_URL, data);
  },
  updateMemoReport: async (memoRptSn: number, data: Partial<MemoReportInfo>) => {
    return client.put<void>(`${BASE_URL}/${memoRptSn}`, data);
  },
  updateDrctMatter: async (memoRptSn: number, drctnMttr: string) => {
    return client.patch<void>(`${BASE_URL}/${memoRptSn}/instr-cn`, drctnMttr);
  },
  deleteMemoReport: async (memoRptSn: number) => {
    return client.delete<void>(`${BASE_URL}/${memoRptSn}`);
  }
};
