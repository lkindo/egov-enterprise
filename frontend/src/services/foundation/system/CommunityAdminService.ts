import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

interface Community {
  cmntyId: string;
  cmntyNm: string;
  cmntyIntrcn: string;
  useYn: 'Y' | 'N';
  rgstrSeCd?: string;
  frstRgtrId?: string;
  crtDt?: string;
}

/**
 * 커뮤니티 관리 서비스 (Admin)
 */
class CommunityAdminService extends AdminService {
  constructor() {
    super('/community', 'content');
  }

  /** 커뮤니티 목록 조회 */
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

  /** 커뮤니티 상세 조회 */
  async getCommunity(cmntyId: string, config?: AxiosRequestConfig): Promise<Community> {
    return this.get<Community>(`/${cmntyId}`, config);
  }

  /** 커뮤니티 개설/등록 */
  async createCommunity(data: Partial<Community>, config?: AxiosRequestConfig): Promise<Community> {
    return this.post<Community>('', data, config);
  }

  /** 커뮤니티 정보 수정 */
  async updateCommunity(cmntyId: string, data: Partial<Community>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${cmntyId}`, data, config);
  }

  /** 커뮤니티 삭제/폐쇄 */
  async deleteCommunity(cmntyId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${cmntyId}`, config);
  }

  /** ы由우슜 목록 조회 */
  async getCommunityPortlet(config?: AxiosRequestConfig): Promise<Community[]> {
    return this.get<Community[]>('/portlet', config);
  }
}

export const communityAdminService = new CommunityAdminService();
