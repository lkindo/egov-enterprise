import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { RoleManage } from '@/types/foundation/security';

type RoleInfo = RoleManage;

/**
 * 濡관리님쒕퉬님(Admin)
 */
class RoleAdminService extends AdminService {
 constructor() {
 super('/roles');
 }

 /** 濡목록 조회 */
 async getRoleList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<RoleInfo>> {
 return this.get<PageResponse<RoleInfo>>('', { ...config, params });
 }

 /** 濡님곸꽭 조회 */
 async getRole(roleCode: string, config?: AxiosRequestConfig): Promise<RoleInfo> {
 return this.get<RoleInfo>(`/${roleCode}`, config);
 }

 /** 濡등록 */
 async createRole(data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('', data, config);
 }

 /** 濡님섏젙 */
 async updateRole(roleCode: string, data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${roleCode}`, data, config);
 }

 /** 濡님삭제 */
 async deleteRole(roleCode: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${roleCode}`, config);
 }

 /** 濡님ㅼ쨷 님젣 */
 async deleteRoles(roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>('', { ...config, data: roleCodes });
 }
}

export const roleAdminService = new RoleAdminService();
