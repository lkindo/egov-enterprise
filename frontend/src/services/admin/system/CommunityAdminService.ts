import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';

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
    async getCommunityList(params?: SearchParams, config?: any): Promise<PageResponse<Community>> {
        const response = await this.get<any>('', { ...config, params });
        return response?.list ? response : { list: response?.result || [], total: response?.totalCount || 0, page: params?.pageIndex || 1, size: params?.size || 10, totalPage: 1 };
    }

    /** 커뮤니티 상세 조회 */
    async getCommunity(cmmntyId: string, config?: any): Promise<Community> {
        const response = await this.get<any>(`/${cmmntyId}`, config);
        return response?.result || response;
    }

    /** 커뮤니티 개설/등록 */
    async createCommunity(data: Partial<Community>, config?: any): Promise<Community> {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 커뮤니티 정보 수정 */
    async updateCommunity(cmmntyId: string, data: Partial<Community>, config?: any): Promise<void> {
        return this.put(`/${cmmntyId}`, data, config);
    }

    /** 커뮤니티 삭제/폐쇄 */
    async deleteCommunity(cmmntyId: string, config?: any): Promise<void> {
        return this.delete(`/${cmmntyId}`, config);
    }

    /** 포틀릿용 목록 조회 */
    async getCommunityPortlet(config?: any): Promise<Community[]> {
        const response = await this.get<any>('/portlet', config);
        return response?.result || response;
    }
}

export const communityAdminService = new CommunityAdminService();
