import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface AuthorRoleDto {
    authorCode: string;
    roleCode: string;
    regYn?: string;
}

/**
 * 권한-롤 매핑 관리 서비스 (Admin)
 */
class AuthorRoleAdminService extends AdminService {
    constructor() {
        super('/author-roles');
    }

    /** 특정 권한에 할당된 롤 목록 조회 */
    async getAuthorRoles(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorRoleDto[]> {
        return this.get<AuthorRoleDto[]>(`/${authorCode}`, config);
    }

    /** 권한-롤 매핑 정보 저장 */
    async saveAuthorRoles(authorCode: string, roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
        return this.post<void>(`/${authorCode}`, roleCodes, config);
    }
}

export const authorRoleAdminService = new AuthorRoleAdminService();
