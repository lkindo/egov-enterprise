import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

interface Scrap {
  scrapSn: number;
  bbsId: string;
  pstSn: number;
  scrapNm: string;
  crtDt: string;
}

class ScrapService extends ApiService {
  constructor() {
    super('/scraps');
  }

  /**
   * 나의 스크랩목록 조회
   */
  async getMyScraps(params: { page?: number; size?: number }): Promise<PageResponse<Scrap>> {
    return this.get<PageResponse<Scrap>>('', { params });
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapSn: number): Promise<void> {
    return this.delete<void>(`/${scrapSn}`);
  }
}

export const scrapService = new ScrapService();
