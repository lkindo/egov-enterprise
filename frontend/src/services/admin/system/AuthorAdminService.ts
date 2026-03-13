import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/system';

export interface AuthorInfo {
    authorCode: string;
    authorNm: string;
    authorDc?: string;
    authorCreatDe?: string;
}

/**
 * 권한 그룹 관리 서비스 (Admin)
 */
class AuthorAdminService extends AdminService {
    constructor() {
        super('/authorities');
    }

    /** 권한 그룹 목록 조회 */
    async getAuthorList(params?: SearchParams, config?: any) {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 권한 그룹 상세 조회 */
    async getAuthor(authorCode: string, config?: any) {
        const response = await this.get<any>(`/${authorCode}`, config);
        return response?.result || response;
    }

    /** 권한 그룹 등록 */
    async createAuthor(data: Partial<AuthorInfo>, config?: any) {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 권한 그룹 수정 */
    async updateAuthor(authorCode: string, data: Partial<AuthorInfo>, config?: any) {
        const response = await this.put<any>(`/${authorCode}`, data, config);
        return response?.result || response;
    }

    /** 권한 그룹 삭제 */
    async deleteAuthor(authorCode: string, config?: any) {
        const response = await this.delete<any>(`/${authorCode}`, config);
        return response?.result || response;
    }

    /** 권한별 메뉴 목록 조회 */
    async getAuthorMenus(authorCode: string, config?: any) {
        const response = await this.get<any>(`/${authorCode}/menus`, config);
        return response?.result || response;
    }
}

export const authorAdminService = new AuthorAdminService();
