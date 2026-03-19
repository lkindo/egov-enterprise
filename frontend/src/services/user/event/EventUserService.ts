import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface Event {
 eventId: string;
 eventNm: string;
 eventPurps: string;
 eventBeginDe: string;
 eventEndDe: string;
 eventPlace: string;
 eventCn: string;
 ctgryCode: string; // 1:교육/행사, 2:캠페인
}

/**
 * 이벤트/행사 관리 서비스 (User)
 */
class EventUserService extends UserService {
 constructor() {
 super('/events');
 }

 /**
 * 이벤트 목록 조회
 */
 async getEvents(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<Event>> {
 return this.get<PageResponse<Event>>('', { ...config, params });
 }

 /**
 * 이벤트 상세 조회
 */
 async getEvent(id: string, config?: AxiosRequestConfig): Promise<Event> {
 return this.get<Event>(`/${id}`, config);
 }
}

export const eventUserService = new EventUserService();
