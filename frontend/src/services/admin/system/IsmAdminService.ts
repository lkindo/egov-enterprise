import { AdminService } from '@/services/core/ApiService';
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

class IsmAdminService extends AdminService {
    constructor() {
        super('/ism'); // Will map to /admin/system/ism
    }

    async getInfrmlSanctnList(params: { page?: number; size?: number; sanctnerId?: string }, config?: AxiosRequestConfig): Promise<PageResult<InfrmlSanctn>> {
        return this.get<PageResult<InfrmlSanctn>>('', { ...config, params });
    }

    async getInfrmlSanctn(id: string): Promise<InfrmlSanctn> {
        return this.get<InfrmlSanctn>(`/${id}`);
    }

    async createInfrmlSanctn(data: Partial<InfrmlSanctn>): Promise<void> {
        return this.post('', data);
    }

    async updateInfrmlSanctn(id: string, data: Partial<InfrmlSanctn>): Promise<void> {
        return this.put(`/${id}`, data);
    }

    async confirmInfrmlSanctn(id: string, confmAt: string, returnResn?: string): Promise<void> {
        return this.patch(`/${id}/confirm`, null, { params: { confmAt, returnResn } });
    }

    async deleteInfrmlSanctn(id: string): Promise<void> {
        return this.delete(`/${id}`);
    }
}

export const ismAdminService = new IsmAdminService();
