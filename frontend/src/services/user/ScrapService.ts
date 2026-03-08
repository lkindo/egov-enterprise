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
     * 나의 스크랩 목록 조회
     */
    async getMyScraps(params: { page?: number; size?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result;
    }

    /**
     * 스크랩 삭제
     */
    async deleteScrap(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result;
    }
}

export const scrapService = new ScrapService();
