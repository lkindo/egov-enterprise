import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';

export interface CtsnnManage {
    ctsnnId: string;
    usid: string;
    ctsnnCode: string;
    ctsnnNm: string;
    occrrncDe: string;
    trgetNm: string;
    relate: string;
    brthdy?: string;
    adres?: string;
    detailAdres?: string;
    remark?: string;
    confmAt: 'Y' | 'N';
    sancltId?: string;
}

export type Ctsnn = CtsnnManage;

interface CtsnnPage {
    content: CtsnnManage[];
    totalElements: number;
    totalPages: number;
}

export const ctsnnService = {
    getCtsnnList: async (params: { page?: number; size?: number; usid?: string }, config?: AxiosRequestConfig): Promise<CtsnnPage> =>
        client.get<CtsnnPage>('/admin/system/ctsnn', { ...config, params }),

    getCtsnn: async (id: string): Promise<CtsnnManage> =>
        client.get<CtsnnManage>(`/admin/system/ctsnn/${id}`),

    createCtsnn: async (data: Partial<CtsnnManage>): Promise<void> =>
        client.post('/admin/system/ctsnn', data),

    updateCtsnn: async (id: string, data: Partial<CtsnnManage>): Promise<void> =>
        client.put(`/admin/system/ctsnn/${id}`, data),

    deleteCtsnn: async (id: string): Promise<void> =>
        client.delete(`/admin/system/ctsnn/${id}`),

    approveCtsnn: async (id: string): Promise<void> =>
        client.post(`/admin/system/ctsnn/${id}/approve`),
};
