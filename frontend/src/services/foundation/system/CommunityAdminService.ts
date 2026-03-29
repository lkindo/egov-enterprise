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
 * 커뮤니티 관리 서비스 (Admin)
 */
class CommunityAdminService extends AdminService {
  constructor() {
    super('/communities');
  }

  /** 커뮤니티 목록 조회 */
  async getCommunityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Community>> {
    return this.get<PageResponse<Community>>('', { ...config, params });
  }

  /** 커뮤니티 상세 조회 */
  async getCommunity(cmmntyId: string, config?: AxiosRequestConfig): Promise<Community> {
    return this.get<Community>(`/${cmmntyId}`, config);
  }

  /** 커뮤니티 개설/등록 */
  async createCommunity(data: Partial<Community>, config?: AxiosRequestConfig): Promise<Community> {
    return this.post<Community>('', data, config);
  }

  /** 커뮤니티 정보 수정 */
  async updateCommunity(cmmntyId: string, data: Partial<Community>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${cmmntyId}`, data, config);
  }

  /** 커뮤니티 삭제/폐쇄 */
  async deleteCommunity(cmmntyId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${cmmntyId}`, config);
  }

  /** 포틀릿용 목록 조회 */
  async getCommunityPortlet(config?: AxiosRequestConfig): Promise<Community[]> {
    return this.get<Community[]>('/portlet', config);
  }
}

export const communityAdminService = new CommunityAdminService();
