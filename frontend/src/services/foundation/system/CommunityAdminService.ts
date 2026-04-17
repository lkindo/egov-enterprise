import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface Community {
  cmmntyId: string;
  cmmntyNm: string;
  cmmntyIntrcn: string;
  useAt: 'Y' | 'N';
  registSeCode?: string;
  frstRegisterId?: string;
  createdDate?: string;
}

/**
 * 而ㅻ님덊떚 관리님쒕퉬님(Admin)
 */
class CommunityAdminService extends AdminService {
  constructor() {
    super('/community', 'content');
  }

  /** 而ㅻ님덊떚 紐⑸줉 조회 */
  async getCommunityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Community>> {
    return this.get<PageResponse<Community>>('', {
      ...config,
      params: {
        ...params,
        searchCnd: params?.searchCondition || '',
        searchWrd: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 而ㅻ님덊떚 상세 조회 */
  async getCommunity(cmmntyId: string, config?: AxiosRequestConfig): Promise<Community> {
    return this.get<Community>(`/${cmmntyId}`, config);
  }

  /** 而ㅻ님덊떚 媛쒖꽕/등록 */
  async createCommunity(data: Partial<Community>, config?: AxiosRequestConfig): Promise<Community> {
    return this.post<Community>('', data, config);
  }

  /** 而ㅻ님덊떚 ?뺣낫 ?섏젙 */
  async updateCommunity(cmmntyId: string, data: Partial<Community>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${cmmntyId}`, data, config);
  }

  /** 而ㅻ님덊떚 님젣/?먯뇙 */
  async deleteCommunity(cmmntyId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${cmmntyId}`, config);
  }

  /** ы由우슜 紐⑸줉 조회 */
  async getCommunityPortlet(config?: AxiosRequestConfig): Promise<Community[]> {
    return this.get<Community[]>('/portlet', config);
  }
}

export const communityAdminService = new CommunityAdminService();
