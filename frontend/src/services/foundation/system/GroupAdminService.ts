import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { GroupManage } from '@/types/foundation/security';
import type { operations } from '@/types/generated-api';
import {
 createGroupOperation,
 deleteGroupOperation,
 deleteGroupsOperation,
 getGroupOperation,
 getGroupsOperation,
 type GeneratedOperationRequest,
 updateGroupOperation,
} from '@/types/generated-operations';

type GroupInfo = GroupManage;
type GroupListQuery = NonNullable<operations['getGroups']['parameters']['query']>;

function toGroupListQuery(params?: SearchParams): GroupListQuery {
 if (!params) return {};
 return {
 ...(params.pageIndex !== undefined
 ? { pageIndex: params.pageIndex }
 : params.page !== undefined
 ? { pageIndex: params.page + 1 }
 : params.pageNo !== undefined
 ? { pageIndex: params.pageNo }
 : {}),
 searchKeyword: params.searchKeyword || params.searchWrd || '',
 };
}

function requireGroupPage(
 response: { list?: GroupInfo[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<GroupInfo> {
 if (
 !Array.isArray(response.list)
 || typeof response.total !== 'number'
 || typeof response.page !== 'number'
 || typeof response.size !== 'number'
 || typeof response.totalPage !== 'number'
 ) {
 throw new Error('그룹 페이지 응답이 필수 계약과 일치하지 않습니다.');
 }
 return response as PageResponse<GroupInfo>;
}

/**
 * 그룹 관리님쒕퉬님(Admin)
 */
class GroupAdminService extends AdminService {
 constructor() {
 super('/groups');
 }

 /** 그룹 목록 조회 */
 async getGroupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<GroupInfo>> {
 const response = await this.executeGenerated(getGroupsOperation, {
 query: toGroupListQuery(params),
 config,
 });
 return requireGroupPage(response as PageResponse<GroupInfo>);
 }

 /** 그룹 상세 조회 */
 async getGroup(groupId: string, config?: AxiosRequestConfig): Promise<GroupInfo> {
 return this.executeGenerated(getGroupOperation, { path: { groupId }, config }) as Promise<GroupInfo>;
 }

 /** 그룹 등록 */
 async createGroup(data: Partial<GroupInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(createGroupOperation, {
 body: data as GeneratedOperationRequest<'createGroup'>,
 config,
 });
 }

 /** 그룹 수정 */
 async updateGroup(groupId: string, data: Partial<GroupInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(updateGroupOperation, {
 path: { groupId },
 body: data as GeneratedOperationRequest<'updateGroup'>,
 config,
 });
 }

 /** 그룹 님젣 */
 async deleteGroup(groupId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteGroupOperation, { path: { groupId }, config });
 }

 /** 그룹 ㅼ쨷 님젣 */
 async deleteGroups(groupIds: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteGroupsOperation, { body: groupIds, config });
 }
}

export const groupAdminService = new GroupAdminService();
