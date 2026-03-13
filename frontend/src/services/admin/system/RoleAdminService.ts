import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/system';

export interface RoleInfo {
    roleCode: string;
    roleNm: string;
    roleDc?: string;
    roleTy?: string;
    roleSort?: string;
    roleCreatDe?: string;
}

/**
 * 롤 관리 서비스 (Admin)
 */
class RoleAdminService extends AdminService {
    constructor() {
        super('/roles');
    }

    /** 롤 목록 조회 */
    async getRoleList(params?: SearchParams, config?: any) {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 롤 상세 조회 */
    async getRole(roleCode: string, config?: any) {
        const response = await this.get<any>(`/${roleCode}`, config);
        return response?.result || response;
    }

    /** 롤 등록 */
    async createRole(data: Partial<RoleInfo>, config?: any) {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 롤 수정 */
    async updateRole(roleCode: string, data: Partial<RoleInfo>, config?: any) {
        const response = await this.put<any>(`/${roleCode}`, data, config);
        return response?.result || response;
    }

    /** 롤 삭제 */
    async deleteRole(roleCode: string, config?: any) {
        const response = await this.delete<any>(`/${roleCode}`, config);
        return response?.result || response;
    }
}

export const roleAdminService = new RoleAdminService();
