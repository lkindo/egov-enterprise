import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';

export interface CongratulationManage {
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

export type Congratulation = CongratulationManage;

interface CongratulationPage {
    content: CongratulationManage[];
    totalElements: number;
    totalPages: number;
}

export const congratulationService = {
    getCtsnnList: async (params: { page?: number; size?: number; usid?: string }, config?: AxiosRequestConfig): Promise<CongratulationPage> =>
        client.get<CongratulationPage>('/admin/system/congratulations', { ...config, params }),

    getCtsnn: async (id: string): Promise<CongratulationManage> =>
        client.get<CongratulationManage>(`/admin/system/congratulations/${id}`),

    createCtsnn: async (data: Partial<CongratulationManage>): Promise<void> =>
        client.post('/admin/system/congratulations', data),

    updateCtsnn: async (id: string, data: Partial<CongratulationManage>): Promise<void> =>
        client.put(`/admin/system/congratulations/${id}`, data),

    deleteCtsnn: async (id: string): Promise<void> =>
        client.delete(`/admin/system/congratulations/${id}`),

    approveCtsnn: async (id: string): Promise<void> =>
        client.put(`/admin/system/congratulations/${id}/approval`, {}, { params: { confmAt: 'Y' } }),
};
