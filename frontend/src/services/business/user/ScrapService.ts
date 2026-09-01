import { ApiService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createScrapOperation,
  deleteScrapOperation,
  getMyScrapListOperation,
  getScrapOperation,
  updateScrapOperation,
} from '@/types/generated-operations';

export type Scrap = components['schemas']['ScrapDto'];
export type ScrapPage = Omit<components['schemas']['PageResponseScrapDto'], 'list'> & {
  list: Scrap[];
};

type GeneratedScrapListParams = NonNullable<
  operations['getMyScrapList']['parameters']['query']
>;
export type ScrapListParams = Required<
  Pick<GeneratedScrapListParams, 'pageIndex' | 'pageUnit'>
>;

class ScrapService extends ApiService {
  constructor() {
    super('/scraps');
  }

  /**
   * 나의 스크랩목록 조회
   */
  async getMyScraps(params: ScrapListParams): Promise<ScrapPage> {
    const response = await this.executeGenerated(getMyScrapListOperation, { query: params });
    return { ...response, list: response.list ?? [] };
  }

  /** 스크랩 상세 조회 */
  async getScrap(scrapSn: number, config?: AxiosRequestConfig): Promise<Scrap> {
    return this.executeGenerated(getScrapOperation, {
      path: { scrapSn },
      config,
    });
  }

  /** 스크랩 등록 */
  async createScrap(data: Scrap, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createScrapOperation, { body: data, config });
  }

  /** 스크랩 수정 */
  async updateScrap(scrapSn: number, data: Scrap, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateScrapOperation, {
      path: { scrapSn },
      body: data,
      config,
    });
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteScrapOperation, {
      path: { scrapSn },
      config,
    });
  }
}

export const scrapService = new ScrapService();
