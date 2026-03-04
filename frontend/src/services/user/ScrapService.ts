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
        return this.get<any>('', { params });
    }

    /**
     * 스크랩 삭제
     */
    async deleteScrap(id: string) {
        return this.delete<any>(`/${id}`);
    }
}

export const scrapService = new ScrapService();
