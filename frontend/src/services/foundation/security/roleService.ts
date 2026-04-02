import client from '@/lib/api/client';
import { SearchParams, PageResponse } from '@/types/foundation/system';

/**
 * 沅뚰븳/濡관리님쒕퉬님(Admin)
 * ?곌껐: com.company.project.api.controller.system.RoleController
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
 /** 濡紐⑸줉 조회 */
 getRoles: async (params?: SearchParams): Promise<PageResponse<RoleManageInfo>> => {
 return client.get<PageResponse<RoleManageInfo>>(BASE_URL, { params });
 },

 /** 濡님곸꽭 조회 */
 getRole: async (roleCode: string): Promise<RoleManageInfo> => {
 return client.get<RoleManageInfo>(`${BASE_URL}/${roleCode}`);
 },

 /** 濡등록/?앹꽦 */
 createRole: async (data: Partial<RoleManageInfo>): Promise<void> => {
 return client.post<void>(BASE_URL, data);
 },

 /** 濡님뺣낫 ?섏젙 */
 updateRole: async (roleCode: string, data: Partial<RoleManageInfo>): Promise<void> => {
 return client.put<void>(`${BASE_URL}/${roleCode}`, data);
 },

 /** 濡님?젣 */
 deleteRole: async (roleCode: string): Promise<void> => {
 return client.delete<void>(`${BASE_URL}/${roleCode}`);
 },

 /** 沅뚰븳 紐⑸줉 조회 (Alias) */
 getAuthors: async (params?: SearchParams): Promise<PageResponse<RoleManageInfo>> => {
 return client.get<PageResponse<RoleManageInfo>>(BASE_URL, { params });
 },
};
