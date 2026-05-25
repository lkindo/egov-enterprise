import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AuthorManage, RoleManage, GroupManage, MenuByAuthority } from '@/types/foundation/security';
import { AxiosRequestConfig } from 'axios';

/**
 * 권한 관리 서비스 (Admin)
 */
export class AuthorityAdminService extends AdminService {
  constructor() {
    super('/authorities', 'system');
  }

  async getAuthorList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorManage>> {
    return this.get<PageResponse<AuthorManage>>('', { ...config, params });
  }

  async getAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorManage> {
    return this.get<AuthorManage>(`/${authorCode}`, config);
  }

  async createAuthor(author: Partial<AuthorManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', author, config);
  }

  async updateAuthor(author: Partial<AuthorManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${author.authrtCd}`, author, config);
  }

  async deleteAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${authorCode}`, config);
  }

  /** 특정 권한에 할당된 메뉴 목록 조회 */
  async getMenuByAuthority(authorCode: string, config?: AxiosRequestConfig): Promise<PageResponse<MenuByAuthority>> {
    return this.get<PageResponse<MenuByAuthority>>(`/${authorCode}/menus`, config);
  }
}

/**
 * 롤 관리 서비스 (Admin)
 */
export class RoleAdminService extends AdminService {
  constructor() {
    super('/roles', 'system');
  }

  async getRoleList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<RoleManage>> {
    return this.get<PageResponse<RoleManage>>('', { ...config, params });
  }

  async getRole(roleCode: string, config?: AxiosRequestConfig): Promise<RoleManage> {
    return this.get<RoleManage>(`/${roleCode}`, config);
  }

  async createRole(role: Partial<RoleManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', role, config);
  }

  async updateRole(role: Partial<RoleManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${role.roleId}`, role, config);
  }

  async deleteRole(roleCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${roleCode}`, config);
  }
}

/**
 * 그룹 관리 서비스 (Admin)
 */
export class GroupAdminService extends AdminService {
  constructor() {
    super('/groups', 'system');
  }

  async getGroupList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<GroupManage>> {
    return this.get<PageResponse<GroupManage>>('', { ...config, params });
  }

  async getGroup(groupId: string, config?: AxiosRequestConfig): Promise<GroupManage> {
    return this.get<GroupManage>(`/${groupId}`, config);
  }

  async createGroup(group: Partial<GroupManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', group, config);
  }

  async updateGroup(group: Partial<GroupManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${group.groupId}`, group, config);
  }

  async deleteGroup(groupId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${groupId}`, config);
  }
}

export const authorityAdminService = new AuthorityAdminService();
export const roleAdminService = new RoleAdminService();
export const groupAdminService = new GroupAdminService();

export const getAuthorList = authorityAdminService.getAuthorList.bind(authorityAdminService);
export const getAuthor = authorityAdminService.getAuthor.bind(authorityAdminService);
export const createAuthor = authorityAdminService.createAuthor.bind(authorityAdminService);
export const updateAuthor = authorityAdminService.updateAuthor.bind(authorityAdminService);
export const deleteAuthor = authorityAdminService.deleteAuthor.bind(authorityAdminService);

export const getRoleList = roleAdminService.getRoleList.bind(roleAdminService);
export const getGroupList = groupAdminService.getGroupList.bind(groupAdminService);
