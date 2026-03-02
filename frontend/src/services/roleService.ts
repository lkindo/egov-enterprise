import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 권한(롤) 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.RoleController
 */
export interface RoleManage {
    roleCode: string;
    roleNm: string;
    rolePttrn: string;
    roleDc: string;
    roleTy: string;
    roleSort: string;
    roleCreatDe: string;
}

const BASE_URL = '/admin/system/roles';

export const roleService = {
    /** 권한 목록 조회 */
    getRoles: async (params?: SearchParams) => {
        return client.get<PaginationResponse<RoleManage>>(BASE_URL, { params });
    },

    /** 권한 상세 조회 */
    getRole: async (roleCode: string) => {
        return client.get<RoleManage>(`${BASE_URL}/${roleCode}`);
    },

    /** 권한 등록 */
    createRole: async (data: Partial<RoleManage>) => {
        return client.post<void>(BASE_URL, data);
    },

    /** 권한 수정 */
    updateRole: async (roleCode: string, data: Partial<RoleManage>) => {
        return client.put<void>(`${BASE_URL}/${roleCode}`, data);
    },

    /** 권한 삭제 */
    deleteRole: async (roleCode: string) => {
        return client.delete<void>(`${BASE_URL}/${roleCode}`);
    },

    /** 권한 목록 조회 (Alias) */
    getAuthors: async (params?: SearchParams) => {
        return client.get<PaginationResponse<RoleManage>>(BASE_URL, { params });
    },
};
