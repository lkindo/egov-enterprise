import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

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
 * ?섏쓽 ?ㅽ겕님紐⑸줉 조회
 */
 async getMyScraps(params: { page?: number; size?: number }): Promise<PageResponse<Scrap>> {
 return this.get<PageResponse<Scrap>>('', { params });
 }

 /**
 * ?ㅽ겕님님젣
 */
 async deleteScrap(id: string): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const scrapService = new ScrapService();
