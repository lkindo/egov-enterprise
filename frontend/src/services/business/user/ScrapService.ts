import { ApiService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  ApiResponseLongSchema,
  PageResponseScrapDtoSchema,
  ScrapDtoSchema,
} from '@/types/generated-zod';

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
    const response = await this.get<unknown>('', { params });
    const parsed = PageResponseScrapDtoSchema.parse(response);
    return { ...parsed, list: parsed.list ?? [] };
  }

  /** 스크랩 상세 조회 */
  async getScrap(scrapSn: number, config?: AxiosRequestConfig): Promise<Scrap> {
    const response = await this.get<unknown>(`/${scrapSn}`, config);
    return ScrapDtoSchema.parse(response);
  }

  /** 스크랩 등록. 공통 API client가 ApiResponse의 data를 이미 추출한다. */
  async createScrap(data: Scrap, config?: AxiosRequestConfig): Promise<number> {
    const request = ScrapDtoSchema.parse(data);
    const response = await this.post<unknown>('', request, config);
    const scrapSn = ApiResponseLongSchema.shape.data.parse(response);
    if (scrapSn === undefined) throw new Error('스크랩 식별자가 응답에 없습니다.');
    return scrapSn;
  }

  /** 스크랩 수정 */
  async updateScrap(scrapSn: number, data: Scrap, config?: AxiosRequestConfig): Promise<void> {
    const request = ScrapDtoSchema.parse(data);
    return this.put<void>(`/${scrapSn}`, request, config);
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${scrapSn}`, config);
  }
}

export const scrapService = new ScrapService();
