import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface EventCmpgn {
    eventId: string;
    eventNm: string;
    eventCn: string;
    eventBeginDe: string;
    eventEndDe: string;
    receptBeginDe: string;
    receptEndDe: string;
    eventTyCode: string;
    eventTyNm?: string;
    frstRegisterId?: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

class EventCmpgnAdminService extends AdminService {
    constructor() {
        super('/event-campaigns');
    }

    async getEventCmpgnList(params: { page?: number; size?: number; eventCn?: string }, config?: AxiosRequestConfig): Promise<PageResult<EventCmpgn>> {
        return this.get<PageResult<EventCmpgn>>('', { ...config, params });
    }

    async getEventCmpgn(id: string): Promise<EventCmpgn> {
        return this.get<EventCmpgn>(`/${id}`);
    }

    async createEventCmpgn(data: Partial<EventCmpgn>): Promise<void> {
        return this.post('', data);
    }

    async updateEventCmpgn(id: string, data: Partial<EventCmpgn>): Promise<void> {
        return this.put(`/${id}`, data);
    }

    async deleteEventCmpgn(id: string): Promise<void> {
        return this.delete(`/${id}`);
    }
}

export const eventCmpgnAdminService = new EventCmpgnAdminService();