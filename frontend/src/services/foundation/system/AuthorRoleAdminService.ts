import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface AuthorRoleDto {
 authorCode: string;
 roleCode: string;
 regYn?: string;
}

/**
 * 沅뚰븳-濡?매핑 愿由님쒕퉬님(Admin)
 */
class AuthorRoleAdminService extends AdminService {
 constructor() {
 super('/author-roles');
 }

 /** ?뱀젙 沅뚰븳님?좊떦님濡?紐⑸줉 조회 */
 async getAuthorRoles(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorRoleDto[]> {
 return this.get<AuthorRoleDto[]>(`/${authorCode}`, config);
 }

 /** 沅뚰븳-濡?매핑 ?뺣낫 ?님*/
 async saveAuthorRoles(authorCode: string, roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>(`/${authorCode}`, roleCodes, config);
 }
}

export const authorRoleAdminService = new AuthorRoleAdminService();
