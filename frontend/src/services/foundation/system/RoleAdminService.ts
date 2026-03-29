import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { RoleManage } from '@/types/foundation/security';

export type RoleInfo = RoleManage;

/**
 * 롤 관리 서비스 (Admin)
 */
class RoleAdminService extends AdminService {
 constructor() {
 super('/roles');
 }

 /** 롤 목록 조회 */
 async getRoleList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<RoleInfo>> {
 return this.get<PageResponse<RoleInfo>>('', { ...config, params });
 }

 /** 롤 상세 조회 */
 async getRole(roleCode: string, config?: AxiosRequestConfig): Promise<RoleInfo> {
 return this.get<RoleInfo>(`/${roleCode}`, config);
 }

 /** 롤 등록 */
 async createRole(data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('', data, config);
 }

 /** 롤 수정 */
 async updateRole(roleCode: string, data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${roleCode}`, data, config);
 }

 /** 롤 삭제 */
 async deleteRole(roleCode: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${roleCode}`, config);
 }

 /** 롤 다중 삭제 */
 async deleteRoles(roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>('', { ...config, data: roleCodes });
 }
}

export const roleAdminService = new RoleAdminService();
