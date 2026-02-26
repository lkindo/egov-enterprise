import client from '@/lib/api/client';
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

export const eventCmpgnService = {
    getEventCmpgnList: async (params: { page?: number; size?: number; eventCn?: string }, config?: AxiosRequestConfig): Promise<PageResult<EventCmpgn>> =>
        client.get<PageResult<EventCmpgn>>('/admin/system/event-campaigns', { ...config, params }),

    getEventCmpgn: async (id: string): Promise<EventCmpgn> =>
        client.get<EventCmpgn>(`/admin/system/event-campaigns/${id}`),

    createEventCmpgn: async (data: Partial<EventCmpgn>): Promise<void> =>
        client.post('/admin/system/event-campaigns', data),

    updateEventCmpgn: async (id: string, data: Partial<EventCmpgn>): Promise<void> =>
        client.put(`/admin/system/event-campaigns/${id}`, data),

    deleteEventCmpgn: async (id: string): Promise<void> =>
        client.delete(`/admin/system/event-campaigns/${id}`),
};
