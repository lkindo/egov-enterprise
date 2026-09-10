import type { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import {
  authzCatalogOperation, authzGroupsOperation, authzGroupOperation,
  authzCreateGroupOperation, authzUpdateGroupOperation, authzDeleteGroupOperation,
  authzReplaceGrantsOperation, authzMembershipsOperation, authzReplaceMembershipsOperation,
  authzUsersOperation, authzHistoryOperation,
  authzDepartmentsOperation, authzDepartmentMembershipsOperation, authzUpdateDepartmentMembershipsOperation,
} from '@/types/generated-operations';
import {
  authorizationCatalogSchema, authorizationGroupsSchema, authorizationGroupSnapshotSchema,
  authorizationMembershipSchema, authorizationUsersPageSchema, authorizationHistoryPageSchema,
  authorizationDepartmentsSchema, authorizationDepartmentSnapshotSchema,
  type AuthorizationGrant, type AuthorizationGroupFormValues,
} from '@/lib/auth/authorization-management-contract';

export interface AuthorizationHistoryFilters {
  groupCode?: string; userId?: string; actorId?: string; fromDate?: string; toDate?: string;
}

class AuthorizationAdminService extends AdminService {
  constructor() { super('/authorization'); }
  async getCatalog(config?: AxiosRequestConfig) {
    return authorizationCatalogSchema.parse(await this.executeGenerated(authzCatalogOperation, { config }));
  }
  async getGroups(config?: AxiosRequestConfig) {
    return authorizationGroupsSchema.parse(await this.executeGenerated(authzGroupsOperation, { config }));
  }
  async getGroup(code: string) {
    const value = authorizationGroupSnapshotSchema.parse(await this.executeGenerated(authzGroupOperation, { path: { code } }));
    if (value.code !== code) throw new Error('조회한 그룹이 요청한 그룹과 일치하지 않습니다.');
    return value;
  }
  createGroup(body: AuthorizationGroupFormValues) {
    return this.executeGenerated(authzCreateGroupOperation, { body });
  }
  updateGroup(code: string, body: { name: string; description: string; version: string }) {
    return this.executeGenerated(authzUpdateGroupOperation, { path: { code }, body });
  }
  deleteGroup(code: string, version: string) {
    if (!version) throw new Error('전체 그룹 정보를 다시 조회해 주세요.');
    return this.executeGenerated(authzDeleteGroupOperation, { path: { code }, query: { version } });
  }
  saveGroupGrants(code: string, body: { grants: AuthorizationGrant[]; version: string; complete: true }) {
    if (!body.version || body.complete !== true) throw new Error('전체 권한을 다시 조회해 주세요.');
    return this.executeGenerated(authzReplaceGrantsOperation, { path: { code }, body });
  }
  async getMemberships(userId: string) {
    const value = authorizationMembershipSchema.parse(await this.executeGenerated(authzMembershipsOperation, { path: { userId } }));
    if (value.userId !== userId) throw new Error('조회한 사용자가 요청한 사용자와 일치하지 않습니다.');
    return value;
  }
  saveUserGroups(userId: string, body: { groups: string[]; version: string; complete: true }) {
    if (!body.version || body.complete !== true) throw new Error('사용자의 전체 그룹을 다시 조회해 주세요.');
    return this.executeGenerated(authzReplaceMembershipsOperation, { path: { userId }, body });
  }
  async getUsers(keyword: string, page: number, size = 20) {
    return authorizationUsersPageSchema.parse(await this.executeGenerated(authzUsersOperation, { query: { keyword, page, size } }));
  }
  async getHistory(page: number, size = 20, filters: AuthorizationHistoryFilters = {}) {
    return authorizationHistoryPageSchema.parse(await this.executeGenerated(authzHistoryOperation, { query: { ...filters, page, size } }));
  }
  async getDepartments() {
    return authorizationDepartmentsSchema.parse(await this.executeGenerated(authzDepartmentsOperation, {}));
  }
  async getDepartmentMemberships(departmentId: string) {
    const value = authorizationDepartmentSnapshotSchema.parse(await this.executeGenerated(authzDepartmentMembershipsOperation, { path: { departmentId } }));
    if (value.departmentId !== departmentId) throw new Error('조회한 부서가 요청한 부서와 일치하지 않습니다.');
    return value;
  }
  async updateDepartmentMemberships(departmentId: string, body: { userIds: string[]; groupCode: string; action: 'ADD' | 'REMOVE'; version: string; complete: true }) {
    if (!body.version || body.complete !== true || body.userIds.length === 0) throw new Error('부서 전체 명부를 확인하고 대상을 선택해 주세요.');
    const value = authorizationDepartmentSnapshotSchema.parse(await this.executeGenerated(authzUpdateDepartmentMembershipsOperation, { path: { departmentId }, body }));
    if (value.departmentId !== departmentId) throw new Error('저장한 부서가 요청한 부서와 일치하지 않습니다.');
    return value;
  }
}

export const authorizationAdminService = new AuthorizationAdminService();
