import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

export interface Scrap {
 scrapId: string;
 bbsId: string;
 pstId: number;
 scrapNm: string;
 createdDate: string;
}

class ScrapService extends ApiService {
 constructor() {
 super('/scraps');
 }

 /**
 * ?òÏùò Ω∫≈©∑¶∏Ò∑œ ¡∂»∏
 */
 async getMyScraps(params: { page?: number; size?: number }): Promise<PageResponse<Scrap>> {
 return this.get<PageResponse<Scrap>>('', { params });
 }

 /**
 * Ω∫≈©∑¶¥‘†ú
 */
 async deleteScrap(id: string): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const scrapService = new ScrapService();
