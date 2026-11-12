import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import type { components } from '@/types/generated-api';
import {
  applyForEventOperation,
  approveEventApplicationOperation,
  cancelEventApplicationOperation,
  getEventApplicationsOperation,
  getOpenEventOperation,
  getOpenEventsOperation,
  rejectEventApplicationOperation,
} from '@/types/generated-operations';

/**
 * [V2_152] 행사 참가 신청. 사용자는 열린 행사를 보고 신청·취소하며, 행사 등록자·수정 대행 권한자는 신청자를 승인·반려한다.
 * 신청자는 서버가 인증 주체로 고정한다(본문으로 보내지 않는다). 마감·정원·중복은 서버가 행사 행을 잠근 뒤 판정해 409 로 알린다.
 */
export type OpenEvent = components['schemas']['OpenEventDto'];
export type EventApplication = components['schemas']['EventApplicationDto'];
export type EventApplicationStatus = 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const EVENT_APPLICATION_STATUS_LABELS: Record<EventApplicationStatus, string> = {
  APPLIED: '신청',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

interface Page<T> {
  list: T[];
  total: number;
}

export const eventParticipationService = {
  getOpenEvents: async (params: { page?: number; size?: number } = {}) =>
    executeGeneratedOperation(getOpenEventsOperation, { query: params }) as Promise<Page<OpenEvent>>,
  getOpenEvent: async (evntSn: number) =>
    executeGeneratedOperation(getOpenEventOperation, { path: { evntSn } }) as Promise<OpenEvent>,
  apply: async (evntSn: number) =>
    executeGeneratedOperation(applyForEventOperation, { path: { evntSn } }) as Promise<EventApplication>,
  cancel: async (evntSn: number) =>
    executeGeneratedOperation(cancelEventApplicationOperation, { path: { evntSn } }),
  getApplications: async (evntSn: number, params: { status?: EventApplicationStatus; page?: number; size?: number } = {}) =>
    executeGeneratedOperation(getEventApplicationsOperation, { path: { evntSn }, query: params }) as Promise<Page<EventApplication>>,
  approve: async (evntSn: number, evntAplySn: number, version: number) =>
    executeGeneratedOperation(approveEventApplicationOperation, { path: { evntSn, evntAplySn }, body: { version } }),
  reject: async (evntSn: number, evntAplySn: number, version: number) =>
    executeGeneratedOperation(rejectEventApplicationOperation, { path: { evntSn, evntAplySn }, body: { version } }),
};
