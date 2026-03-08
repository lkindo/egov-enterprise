import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 亦낅슦釉?嚥? ?온????뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.system.RoleController
 */
export interface RoleManageInfo {
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
    /** 亦낅슦釉?筌뤴뫖以?鈺곌퀬??*/
    getRoles: async (params?: SearchParams) => {
        return client.get<PaginationResponse<RoleManageInfo>>(BASE_URL, { params });
    },

    /** 亦낅슦釉??怨멸쉭 鈺곌퀬??*/
    getRole: async (roleCode: string) => {
        return client.get<RoleManageInfo>(`${BASE_URL}/${roleCode}`);
    },

    /** 亦낅슦釉??源낆쨯 */
    createRole: async (data: Partial<RoleManageInfo>) => {
        return client.post<void>(BASE_URL, data);
    },

    /** 亦낅슦釉???륁젟 */
    updateRole: async (roleCode: string, data: Partial<RoleManageInfo>) => {
        return client.put<void>(`${BASE_URL}/${roleCode}`, data);
    },

    /** 亦낅슦釉?????*/
    deleteRole: async (roleCode: string) => {
        return client.delete<void>(`${BASE_URL}/${roleCode}`);
    },

    /** 亦낅슦釉?筌뤴뫖以?鈺곌퀬??(Alias) */
    getAuthors: async (params?: SearchParams) => {
        return client.get<PaginationResponse<RoleManageInfo>>(BASE_URL, { params });
    },
};
