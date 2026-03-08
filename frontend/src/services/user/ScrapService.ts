import { ApiService } from '@/services/core/ApiService';

export interface Scrap {
    scrapId: string;
    bbsId: string;
    nttId: number;
    scrapNm: string;
    createdDate: string;
}

class ScrapService extends ApiService {
    constructor() {
        super('/scraps');
    }

    /**
     * ??륁벥 ??쎄쾿??筌뤴뫖以?鈺곌퀬??
     */
    async getMyScraps(params: { page?: number; size?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result || response;
    }

    /**
     * ??쎄쾿??????
     */
    async deleteScrap(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const scrapService = new ScrapService();
