import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { GroupManage } from '@/types/foundation/security';

export type GroupInfo = GroupManage;

/**
 * 그룹 관리님쒕퉬님(Admin)
 */
class GroupAdminService extends AdminService {
 constructor() {
 super('/groups');
 }

 /** 그룹 목록 조회 */
 async getGroupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<GroupInfo>> {
 return this.get<PageResponse<GroupInfo>>('', { ...config, params });
 }

 /** 그룹 상세 조회 */
 async getGroup(groupId: string, config?: AxiosRequestConfig): Promise<GroupInfo> {
 return this.get<GroupInfo>(`/${groupId}`, config);
 }

 /** 그룹 등록 */
 async createGroup(data: Partial<GroupInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('', data, config);
 }

 /** 그룹 수정 */
 async updateGroup(groupId: string, data: Partial<GroupInfo>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${groupId}`, data, config);
 }

 /** 그룹 님젣 */
 async deleteGroup(groupId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${groupId}`, config);
 }

 /** 그룹 ㅼ쨷 님젣 */
 async deleteGroups(groupIds: string[], config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>('', { ...config, data: groupIds });
 }
}

export const groupAdminService = new GroupAdminService();
