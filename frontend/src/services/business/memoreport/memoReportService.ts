import client from '@/lib/api/client';

export interface MemoReportInfo {
  reprtId: string;
  reprtSj: string;
  reprtCn: string;
  wrterId: string;
  wrterNm: string;
  recptnId: string;
  recptnNm: string;
  reprtDe: string;
  drctMatter?: string;
  readAt: string;
  frstRegisterId: string;
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
  getMemoReport: async (reprtId: string) => {
    return client.get<MemoReportInfo>(`${BASE_URL}/${reprtId}`);
  },
  createMemoReport: async (data: Partial<MemoReportInfo>) => {
    return client.post<string>(BASE_URL, data);
  },
  updateMemoReport: async (reprtId: string, data: Partial<MemoReportInfo>) => {
    return client.put<void>(`${BASE_URL}/${reprtId}`, data);
  },
  updateDrctMatter: async (reprtId: string, drctMatter: string) => {
    return client.patch<void>(`${BASE_URL}/${reprtId}/drct-matter`, drctMatter);
  },
  deleteMemoReport: async (reprtId: string) => {
    return client.delete<void>(`${BASE_URL}/${reprtId}`);
  }
};
