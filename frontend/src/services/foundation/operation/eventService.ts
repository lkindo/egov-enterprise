import client from '@/lib/api/client';

export interface EventInfo {
  evntId: string;
  bizCd: string;     // Mapping eventNm to bizCd
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
  createdDate?: string;
  lastModifiedDate?: string;
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
  getEvent: async (eventId: string) => {
    return client.get<EventInfo>(`${BASE_URL}/${eventId}`);
  },
  createEvent: async (data: Partial<EventInfo>) => {
    return client.post<string>(BASE_URL, data);
  },
  updateEvent: async (eventId: string, data: Partial<EventInfo>) => {
    return client.put<void>(`${BASE_URL}/${eventId}`, data);
  },
  deleteEvent: async (eventId: string) => {
    return client.delete<void>(`${BASE_URL}/${eventId}`);
  }
};
