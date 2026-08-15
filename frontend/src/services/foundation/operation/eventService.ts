import client from '@/lib/api/client';

export interface EventInfo {
  evntSn: number;
  evntNm: string;    // 행사명 (V2_22: biz_cd 오용 정화)
  evntCn: string;
  evntBgngYmd: string; // Mapping eventBeginDe to evntBgngYmd
  evntEndYmd: string;  // Mapping eventEndDe to evntEndYmd
  evntUseCnt: number;  // Mapping psncpa to evntUseCnt
  bizYr?: string;
  picNm?: string;
  prepMttr?: string;
  evntTypeCd?: string;
  evntAprvYn?: string;
  evntAprvYmd?: string;
  frstRgtrId?: string;
  crtDt?: string;
  mdfcnDt?: string;
}


export interface PageResponse<T> {
  list: T[];
  total: number;
}

const BASE_URL = 'admin/operation/events';

export const eventService = {
  getEvents: async (params: { searchWrd?: string; page?: number; size?: number } = {}) => {
    return client.get<PageResponse<EventInfo>>(BASE_URL, { params });
  },
  getEvent: async (evntSn: number) => {
    return client.get<EventInfo>(`${BASE_URL}/${evntSn}`);
  },
  createEvent: async (data: Partial<EventInfo>) => {
    return client.post<number>(BASE_URL, data);
  },
  updateEvent: async (evntSn: number, data: Partial<EventInfo>) => {
    return client.put<void>(`${BASE_URL}/${evntSn}`, data);
  },
  deleteEvent: async (evntSn: number) => {
    return client.delete<void>(`${BASE_URL}/${evntSn}`);
  }
};
