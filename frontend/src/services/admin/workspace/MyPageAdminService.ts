import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface MyPageContent {
    cntntsId: string;
    cntntsNm: string;
    cntcUrl: string;
    cntntsUseAt: 'Y' | 'N';
    cntntsLinkUrl: string;
    cntntsDc: string;
}

/**
 * 마이페이지 콘텐츠 관리 서비스 (Admin)
 */
class MyPageAdminService extends AdminService {
    constructor() {
        super('/workspace/mypage/contents');
    }

    /** 마이페이지 콘텐츠 목록 조회 */
    async getContents(params?: { all?: boolean }, config?: AxiosRequestConfig): Promise<MyPageContent[]> {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 마이페이지 콘텐츠 등록 */
    async createContent(data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<string> {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 마이페이지 콘텐츠 수정 */
    async updateContent(id: string, data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<void> {
        const response = await this.put<any>(`/${id}`, data, config);
        return response?.result || response;
    }

    /** 마이페이지 콘텐츠 삭제 */
    async deleteContent(id: string, config?: AxiosRequestConfig): Promise<void> {
        const response = await this.delete<any>(`/${id}`, config);
        return response?.result || response;
    }
}

export const myPageAdminService = new MyPageAdminService();
