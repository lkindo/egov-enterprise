import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface AuthorRoleDto {
 authorCode: string;
 roleCode: string;
 regYn?: string;
}

/**
 * 권한-濡매핑 관리님쒕퉬님(Admin)
 */
class AuthorRoleAdminService extends AdminService {
 constructor() {
 super('/author-roles');
 }

 /** ?뱀젙 권한님?좊떦님濡목록 조회 */
 async getAuthorRoles(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorRoleDto[]> {
 return this.get<AuthorRoleDto[]>(`/${authorCode}`, config);
 }

 /** 권한-濡매핑 정보 님*/
 async saveAuthorRoles(authorCode: string, roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>(`/${authorCode}`, roleCodes, config);
 }
}

export const authorRoleAdminService = new AuthorRoleAdminService();
