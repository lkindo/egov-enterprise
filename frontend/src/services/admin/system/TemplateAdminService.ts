import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';

export interface TemplateInfo {
    tmplatId: string;
    tmplatNm: string;
    tmplatSeCode: string;
    tmplatSeCodeNm: string;
    tmplatCours: string;
    useAt: string;
    frstRegisterId: string;
    createdDate: string;
}

/**
 * 템플릿 정보 관리 서비스 (Admin)
 */
class TemplateAdminService extends AdminService {
    constructor() {
        super('/templates');
    }

    /** 템플릿 목록 조회 */
    async getTemplateList(params?: SearchParams, config?: any): Promise<PaginationResponse<TemplateInfo>> {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 템플릿 상세 조회 */
    async getTemplate(tmplatId: string, config?: any): Promise<TemplateInfo> {
        const response = await this.get<any>(`/${tmplatId}`, config);
        return response?.result || response;
    }

    /** 템플릿 등록 */
    async createTemplate(data: Partial<TemplateInfo>, config?: any): Promise<TemplateInfo> {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 템플릿 수정 */
    async updateTemplate(tmplatId: string, data: Partial<TemplateInfo>, config?: any): Promise<void> {
        return this.put(`/${tmplatId}`, data, config);
    }

    /** 템플릿 삭제 */
    async deleteTemplate(tmplatId: string, config?: any): Promise<void> {
        return this.delete(`/${tmplatId}`, config);
    }
}

export const templateAdminService = new TemplateAdminService();
