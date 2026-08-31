import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { RoleManage } from '@/types/foundation/security';
import type { operations } from '@/types/generated-api';
import {
 createRoleOperation,
 deleteRoleOperation,
 deleteRolesOperation,
 getRoleOperation,
 getRolesOperation,
 type GeneratedOperationRequest,
 updateRoleOperation,
} from '@/types/generated-operations';

type RoleInfo = RoleManage;
type RoleListQuery = NonNullable<operations['getRoles']['parameters']['query']>;

const ROLE_QUERY_KEYS = [
 'searchCondition',
 'searchKeyword',
 'searchUseYn',
 'pageIndex',
 'pageUnit',
 'pageSize',
 'firstIndex',
 'lastIndex',
 'recordCountPerPage',
 'searchKeywordFrom',
 'searchKeywordTo',
] as const satisfies readonly (keyof RoleListQuery)[];

function toRoleListQuery(params?: SearchParams): RoleListQuery {
 const query: RoleListQuery = {};
 if (!params) return query;

 const generatedParams = params as Partial<RoleListQuery>;
 for (const key of ROLE_QUERY_KEYS) {
 const value = generatedParams[key];
 if (value !== undefined) Object.assign(query, { [key]: value });
 }

 query.searchKeyword = params.searchKeyword || params.searchWrd || '';
 if (params.pageIndex === undefined) {
 if (params.page !== undefined) query.pageIndex = params.page + 1;
 else if (params.pageNo !== undefined) query.pageIndex = params.pageNo;
 }
 if (params.pageUnit === undefined && params.size !== undefined) query.pageUnit = params.size;
 if (params.recordCountPerPage === undefined && params.size !== undefined) {
 query.recordCountPerPage = params.size;
 }
 if (params.pageUnit === undefined && params.size === undefined && generatedParams.pageSize !== undefined) {
 query.pageUnit = generatedParams.pageSize;
 }
 return query;
}

function requireRolePage(
 response: { list?: RoleInfo[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<RoleInfo> {
 if (
 !Array.isArray(response.list)
 || typeof response.total !== 'number'
 || typeof response.page !== 'number'
 || typeof response.size !== 'number'
 || typeof response.totalPage !== 'number'
 ) {
 throw new Error('롤 페이지 응답이 필수 계약과 일치하지 않습니다.');
 }
 return response as PageResponse<RoleInfo>;
}

/**
 * 濡관리님쒕퉬님(Admin)
 */
class RoleAdminService extends AdminService {
 constructor() {
 super('/roles');
 }

 /** 濡목록 조회 */
 async getRoleList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<RoleInfo>> {
 const response = await this.executeGenerated(getRolesOperation, {
 query: toRoleListQuery(params),
 config,
 });
 return requireRolePage(response as PageResponse<RoleInfo>);
 }

 /** 濡님곸꽭 조회 */
 async getRole(roleCode: string, config?: AxiosRequestConfig): Promise<RoleInfo> {
 return this.executeGenerated(getRoleOperation, { path: { roleCode }, config }) as Promise<RoleInfo>;
 }

 /** 濡등록 */
 async createRole(data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(createRoleOperation, {
 body: data as GeneratedOperationRequest<'createRole'>,
 config,
 });
 }

 /** 濡님섏젙 */
 async updateRole(roleCode: string, data: Partial<RoleInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(updateRoleOperation, {
 path: { roleCode },
 body: data as GeneratedOperationRequest<'updateRole'>,
 config,
 });
 }

 /** 濡님삭제 */
 async deleteRole(roleCode: string, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteRoleOperation, { path: { roleCode }, config });
 }

 /** 濡님ㅼ쨷 님젣 */
 async deleteRoles(roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteRolesOperation, { body: roleCodes, config });
 }
}

export const roleAdminService = new RoleAdminService();
