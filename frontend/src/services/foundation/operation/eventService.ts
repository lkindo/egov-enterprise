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
  /** [V2_152] 온라인 참가 신청 정원. 비어 있으면 정원 없음. */
  pscpNope?: number;
  /** [V2_152] 참가 신청 마감일(yyyyMMdd). 정해야 신청을 받는다. */
  aplyDdlnYmd?: string;
  frstRgtrId?: string;
  crtDt?: string;
  mdfcnDt?: string;
  version?: number;
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
  createEvent: async (data: components['schemas']['EventInfoRequest']) => {
    return executeGeneratedOperation(createEventOperation, {
      body: data,
    });
  },
  updateEvent: async (evntSn: number, data: components['schemas']['EventInfoRequest']) => {
    return executeGeneratedOperation(updateEventOperation, {
      path: { evntSn },
      body: data,
    });
  },
  deleteEvent: async (evntSn: number) => {
    return executeGeneratedOperation(deleteEventOperation, { path: { evntSn } });
  }
};
