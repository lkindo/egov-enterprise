import { AdminService } from '@/services/core/ApiService';
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

class TroubleAdminService extends AdminService {
    constructor() {
        super('/troubles');
    }

    async getTroubles(params: { page?: number; size?: number; strTroblNm?: string; strTroblKnd?: string; strProcessSttus?: string }, config?: AxiosRequestConfig): Promise<PageResult<Trouble>> {
        return this.get<PageResult<Trouble>>('/', { ...config, params });
    }

    async getTrouble(id: string, config?: AxiosRequestConfig): Promise<Trouble> {
        return this.get<Trouble>(`/${id}`, config);
    }

    async createTrouble(data: Partial<Trouble>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/', data, config);
    }

    async updateTrouble(id: string, data: Partial<Trouble>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    async processTrouble(id: string, data: Partial<Trouble>, config?: AxiosRequestConfig): Promise<void> {
        return this.patch(`/${id}/process`, data, config);
    }

    async deleteTrouble(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}`, config);
    }
}

export const troubleAdminService = new TroubleAdminService();
