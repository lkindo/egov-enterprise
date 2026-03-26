import client from '@/lib/api/client';
import { SearchParams, PageResponse } from '@/types/foundation/system';

/**
 * 권한/롤 관리 서비스 (Admin)
 * 연결: com.company.project.api.controller.system.RoleController
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
 /** 롤 목록 조회 */
 getRoles: async (params?: SearchParams): Promise<PageResponse<RoleManageInfo>> => {
 return client.get<PageResponse<RoleManageInfo>>(BASE_URL, { params });
 },

 /** 롤 상세 조회 */
 getRole: async (roleCode: string): Promise<RoleManageInfo> => {
 return client.get<RoleManageInfo>(`${BASE_URL}/${roleCode}`);
 },

 /** 롤 등록/생성 */
 createRole: async (data: Partial<RoleManageInfo>): Promise<void> => {
 return client.post<void>(BASE_URL, data);
 },

 /** 롤 정보 수정 */
 updateRole: async (roleCode: string, data: Partial<RoleManageInfo>): Promise<void> => {
 return client.put<void>(`${BASE_URL}/${roleCode}`, data);
 },

 /** 롤 삭제 */
 deleteRole: async (roleCode: string): Promise<void> => {
 return client.delete<void>(`${BASE_URL}/${roleCode}`);
 },

 /** 권한 목록 조회 (Alias) */
 getAuthors: async (params?: SearchParams): Promise<PageResponse<RoleManageInfo>> => {
 return client.get<PageResponse<RoleManageInfo>>(BASE_URL, { params });
 },
};
