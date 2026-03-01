import { UserService } from '@/services/core/ApiService';

export interface Event {
    eventId: string;
    eventNm: string;
    eventPurps: string;
    eventBeginDe: string;
    eventEndDe: string;
    eventPlace: string;
    eventCn: string;
    ctgryCode: string; // 1:행사, 2:캠페인
}

class EventUserService extends UserService {
    constructor() {
        super('/uss/ion/events');
    }

    async getEvents(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    async getEvent(id: string) {
        return this.get<any>(`/${id}`);
    }
}

export const eventUserService = new EventUserService();
