import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';

export interface Trouble {
    troblId: string;
    troblNm: string;
    troblKnd: string;
    troblKndNm?: string;
    troblDc: string;
    troblOccrrncTime?: string;
    troblRqesterNm?: string;
    troblRequstTime?: string;
    troblProcessResult?: string;
    troblOpetrNm?: string;
    troblProcessTime?: string;
    processSttus: string;
    processSttusNm?: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

export const troubleService = {
    getTroubles: async (params: { page?: number; size?: number; strTroblNm?: string; strTroblKnd?: string; strProcessSttus?: string }, config?: AxiosRequestConfig): Promise<PageResult<Trouble>> =>
        client.get<PageResult<Trouble>>('/admin/system/troubles', { ...config, params }),

    getTrouble: async (id: string): Promise<Trouble> =>
        client.get<Trouble>(`/admin/system/troubles/${id}`),

    createTrouble: async (data: Partial<Trouble>): Promise<void> =>
        client.post('/admin/system/troubles', data),

    updateTrouble: async (id: string, data: Partial<Trouble>): Promise<void> =>
        client.put(`/admin/system/troubles/${id}`, data),

    processTrouble: async (id: string, data: Partial<Trouble>): Promise<void> =>
        client.patch(`/admin/system/troubles/${id}/process`, data),

    deleteTrouble: async (id: string): Promise<void> =>
        client.delete(`/admin/system/troubles/${id}`),
};
