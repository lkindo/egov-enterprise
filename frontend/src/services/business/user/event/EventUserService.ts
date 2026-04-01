import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface Event {
 eventId: string;
 eventNm: string;
 eventPurps: string;
 eventBeginDe: string;
 eventEndDe: string;
 eventPlace: string;
 eventCn: string;
 ctgryCode: string; // 1:援먯쑁/?됱궗, 2:罹좏럹님}

/**
 * ?대깽님?됱궗 愿由님쒕퉬님(User)
 */
class EventUserService extends UserService {
 constructor() {
 super('/events');
 }

 /**
 * ?대깽님紐⑸줉 조회
 */
 async getEvents(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<Event>> {
 return this.get<PageResponse<Event>>('', { ...config, params });
 }

 /**
 * ?대깽님?곸꽭 조회
 */
 async getEvent(id: string, config?: AxiosRequestConfig): Promise<Event> {
 return this.get<Event>(`/${id}`, config);
 }
}

export const eventUserService = new EventUserService();
