import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';

export interface InfrmlSanctn {
    infrmlSanctnId: string;
    jobSe?: string;
    jobSeCode: string;
    applcntId: string;
    confmrerId?: string;
    sanctnerId?: string;
    confmAt: 'Y' | 'N' | 'R' | 'A';
    sancltNm: string;
    returnResn?: string;
    reqstDe?: string;
    frstRegisterId?: string;
    lastUpdusrId?: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

export const ismService = {
    getInfrmlSanctnList: async (params: { page?: number; size?: number; sanctnerId?: string }, config?: AxiosRequestConfig): Promise<PageResult<InfrmlSanctn>> =>
        client.get<PageResult<InfrmlSanctn>>('/admin/system/ism', { ...config, params }),

    getInfrmlSanctn: async (id: string): Promise<InfrmlSanctn> =>
        client.get<InfrmlSanctn>(`/admin/system/ism/${id}`),

    createInfrmlSanctn: async (data: Partial<InfrmlSanctn>): Promise<void> =>
        client.post('/admin/system/ism', data),

    updateInfrmlSanctn: async (id: string, data: Partial<InfrmlSanctn>): Promise<void> =>
        client.put(`/admin/system/ism/${id}`, data),

    confirmInfrmlSanctn: async (id: string, confmAt: string, returnResn?: string): Promise<void> =>
        client.patch(`/admin/system/ism/${id}/confirm`, null, { params: { confmAt, returnResn } }),

    deleteInfrmlSanctn: async (id: string): Promise<void> =>
        client.delete(`/admin/system/ism/${id}`),
};
