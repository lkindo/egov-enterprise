import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';

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
    async getMyScraps(params: { page?: number; size?: number }): Promise<PageResponse<Scrap>> {
        return this.get<PageResponse<Scrap>>('', { params });
    }

    /**
     * 스크랩 삭제
     */
    async deleteScrap(id: string): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const scrapService = new ScrapService();
