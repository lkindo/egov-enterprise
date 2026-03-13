import { ApiService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * 마이페이지 콘텐츠 관리 서비스
 */
class MyPageAdminService extends ApiService {
    constructor() {
        super('/workspace/mypage/contents');
    }

    async getContents(params?: { all?: boolean }, config?: AxiosRequestConfig) {
        return await this.get<any[]>('', { ...config, params });
    }

    async createContent(data: any, config?: AxiosRequestConfig) {
        return await this.post<any>('', data, config);
    }

    async updateContent(id: string, data: any, config?: AxiosRequestConfig) {
        return await this.put<any>(`/${id}`, data, config);
    }

    async deleteContent(id: string, config?: AxiosRequestConfig) {
        return await this.delete<any>(`/${id}`, config);
    }
}

export const myPageAdminService = new MyPageAdminService();
