import { AdminService } from '@/services/core/ApiService';
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

class CongratulationAdminService extends AdminService {
    constructor() {
        super('/congratulations');
    }

    async getCtsnnList(params: { page?: number; size?: number; usid?: string }, config?: AxiosRequestConfig): Promise<CongratulationPage> {
        return this.get<CongratulationPage>('', { ...config, params });
    }

    async getCtsnn(id: string): Promise<CongratulationManage> {
        return this.get<CongratulationManage>(`/${id}`);
    }

    async createCtsnn(data: Partial<CongratulationManage>): Promise<void> {
        return this.post('', data);
    }

    async updateCtsnn(id: string, data: Partial<CongratulationManage>): Promise<void> {
        return this.put(`/${id}`, data);
    }

    async deleteCtsnn(id: string): Promise<void> {
        return this.delete(`/${id}`);
    }

    async approveCtsnn(id: string): Promise<void> {
        return this.put(`/${id}/approval`, undefined, { params: { confmAt: 'Y' } });
    }
}

export const congratulationAdminService = new CongratulationAdminService();
