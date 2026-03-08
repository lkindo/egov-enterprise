import { UserService } from '@/services/core/ApiService';

export interface Anniversary {
    annId: string;
    usid: string;
    annvrsryNm: string;
    annvrsryDe: string;
    annvrsrySe: string; // 1:??뱀뵬, 2:野껉퀬?? 3:疫꿸퀬?
    userNm?: string;
    memo: string;
    cldrSe?: string;
    reptitAt?: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

class AnniversaryUserService extends UserService {
    constructor() {
        super('/anniversaries');
    }

    async getAnniversaries(params?: { keyword?: string; page?: number; size?: number }): Promise<PageResult<Anniversary>> {
        return this.get<PageResult<Anniversary>>('', { params });
    }

    async getMyAnniversaries(params?: { page?: number; size?: number }): Promise<PageResult<Anniversary>> {
        return this.get<PageResult<Anniversary>>('/my', { params });
    }

    async getAnniversary(annId: string): Promise<Anniversary> {
        return this.get<Anniversary>(`/${annId}`);
    }

    async createAnniversary(data: Partial<Anniversary>): Promise<Anniversary> {
        return this.post<Anniversary>('', data);
    }

    async updateAnniversary(annId: string, data: Partial<Anniversary>): Promise<Anniversary> {
        return this.put<Anniversary>(`/${annId}`, data);
    }

    async deleteAnniversary(annId: string): Promise<void> {
        return this.delete(`/${annId}`);
    }
}

export const anniversaryUserService = new AnniversaryUserService();
