import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';

export interface UnityLink {
    unityLinkId: string;
    unityLinkNm: string;
    unityLinkSeCode: string;
    unityLinkSeCodeNm?: string;
    unityLinkDc?: string;
    unityLinkUrl: string;
    useAt: 'Y' | 'N';
    createdBy?: string;
    createdDate?: string;
}

/**
 * 통합링크 관리 서비스 (Admin)
 */
class UnityLinkAdminService extends AdminService {
    constructor() {
        super('/unitylinks');
    }

    /** 통합링크 목록 조회 */
    async getUnityLinkList(params?: SearchParams, config?: any): Promise<PageResponse<UnityLink>> {
        return this.get<PageResponse<UnityLink>>('', { ...config, params });
    }

    /** 통합링크 상세 조회 */
    async getUnityLink(unityLinkId: string, config?: any): Promise<UnityLink> {
        return this.get<UnityLink>(`/${unityLinkId}`, config);
    }

    /** 통합링크 등록 */
    async createUnityLink(data: Partial<UnityLink>, config?: any): Promise<UnityLink> {
        return this.post<UnityLink>('', data, config);
    }

    /** 통합링크 수정 */
    async updateUnityLink(unityLinkId: string, data: Partial<UnityLink>, config?: any): Promise<void> {
        return this.put(`/${unityLinkId}`, data, config);
    }

    /** 통합링크 삭제 */
    async deleteUnityLink(unityLinkId: string, config?: any): Promise<void> {
        return this.delete(`/${unityLinkId}`, config);
    }
}

export const unityLinkAdminService = new UnityLinkAdminService();
