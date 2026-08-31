import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { components } from '@/types/generated-api';
import {
  createEventOperation,
  deleteEventOperation,
  getEventListOperation,
  getEventOperation,
  updateEventOperation,
} from '@/types/generated-operations';

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

export const eventService = {
  getEvents: async (params: { searchWrd?: string; page?: number; size?: number } = {}) => {
    return executeGeneratedOperation(getEventListOperation, { query: params }) as
      Promise<PageResponse<EventInfo>>;
  },
  getEvent: async (evntSn: number) => {
    return executeGeneratedOperation(getEventOperation, { path: { evntSn } }) as Promise<EventInfo>;
  },
  createEvent: async (data: Partial<EventInfo>) => {
    return executeGeneratedOperation(createEventOperation, {
      body: data as components['schemas']['EventInfoDto'],
    });
  },
  updateEvent: async (evntSn: number, data: Partial<EventInfo>) => {
    return executeGeneratedOperation(updateEventOperation, {
      path: { evntSn },
      body: data as components['schemas']['EventInfoDto'],
    });
  },
  deleteEvent: async (evntSn: number) => {
    return executeGeneratedOperation(deleteEventOperation, { path: { evntSn } });
  }
};
