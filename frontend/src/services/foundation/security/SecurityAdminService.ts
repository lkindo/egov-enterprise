import { AdminService } from '@/services/core/ApiService';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { AuthorManage, RoleManage, GroupManage, MenuByAuthority } from '@/types/foundation/security';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createAuthorOperation,
  createGroupOperation,
  createRoleOperation,
  deleteAuthorOperation,
  deleteGroupOperation,
  deleteRoleOperation,
  getAuthorMenusOperation,
  getAuthorOperation,
  getAuthorsOperation,
  getGroupOperation,
  getGroupsOperation,
  getRoleOperation,
  getRolesOperation,
  updateAuthorOperation,
  updateGroupOperation,
  updateRoleOperation,
} from '@/types/generated-operations';

type BaseSearchQuery = NonNullable<operations['getAuthors']['parameters']['query']>;
type GroupSearchQuery = NonNullable<operations['getGroups']['parameters']['query']>;

function toBaseSearchQuery(params: SearchParams): BaseSearchQuery {
  const { page, pageNo, size, searchWrd, ...query } = params;
  const generatedQuery = query as BaseSearchQuery;

  if (generatedQuery.pageIndex === undefined) {
    if (pageNo !== undefined) generatedQuery.pageIndex = pageNo;
    else if (page !== undefined) generatedQuery.pageIndex = page + 1;
  }
  if (generatedQuery.pageUnit === undefined) {
    generatedQuery.pageUnit = size ?? generatedQuery.pageSize;
  }
  if (generatedQuery.recordCountPerPage === undefined) {
    generatedQuery.recordCountPerPage = size ?? generatedQuery.pageSize;
  }
  if (generatedQuery.searchKeyword === undefined && searchWrd !== undefined) {
    generatedQuery.searchKeyword = searchWrd;
  }
  return generatedQuery;
}

function toGroupSearchQuery(params: SearchParams): GroupSearchQuery {
  const { page, pageNo, searchWrd, ...query } = params;
  const generatedQuery = query as GroupSearchQuery;

  if (generatedQuery.pageIndex === undefined) {
    if (pageNo !== undefined) generatedQuery.pageIndex = pageNo;
    else if (page !== undefined) generatedQuery.pageIndex = page + 1;
  }
  if (generatedQuery.searchKeyword === undefined && searchWrd !== undefined) {
    generatedQuery.searchKeyword = searchWrd;
  }
  return generatedQuery;
}

function requireSecurityPage<T>(
  response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('보안 관리 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list,
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

function requireAuthor(item: components['schemas']['AuthorManageDto']): AuthorManage {
  if (
    typeof item.authrtCd !== 'string'
    || typeof item.authrtNm !== 'string'
    || typeof item.authrtExpln !== 'string'
  ) {
    throw new Error('권한 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    authrtCd: item.authrtCd,
    authrtNm: item.authrtNm,
    authrtExpln: item.authrtExpln,
    ...(item.authrtCrtYmd === undefined ? {} : { authrtCrtYmd: item.authrtCrtYmd }),
  };
}

function requireRole(item: components['schemas']['RoleManageDto']): RoleManage {
  if (
    typeof item.roleId !== 'string'
    || typeof item.roleNm !== 'string'
    || typeof item.rolePatrn !== 'string'
    || typeof item.roleExpln !== 'string'
    || typeof item.roleTypeCd !== 'string'
    || typeof item.roleSort !== 'string'
  ) {
    throw new Error('롤 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    roleId: item.roleId,
    roleNm: item.roleNm,
    rolePatrn: item.rolePatrn,
    roleExpln: item.roleExpln,
    roleTypeCd: item.roleTypeCd,
    roleSort: item.roleSort,
    ...(item.crtDt === undefined ? {} : { crtDt: item.crtDt }),
  };
}

function requireGroup(item: components['schemas']['GroupManageDto']): GroupManage {
  if (
    typeof item.groupId !== 'string'
    || typeof item.groupNm !== 'string'
    || typeof item.groupDc !== 'string'
  ) {
    throw new Error('그룹 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    groupId: item.groupId,
    groupNm: item.groupNm,
    groupDc: item.groupDc,
    ...(item.groupCrtDt === undefined ? {} : { groupCrtDt: item.groupCrtDt }),
  };
}

function requireIdentifier(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label}가 필수입니다.`);
  return value;
}

/** 권한 관리 서비스 (Admin) */
export class AuthorityAdminService extends AdminService {
  constructor() {
    super('/authorities', 'system');
  }

  async getAuthorList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorManage>> {
    const response = await this.executeGenerated(getAuthorsOperation, {
      query: toBaseSearchQuery(params),
      config,
    });
    const page = requireSecurityPage(response);
    return { ...page, list: page.list.map(requireAuthor) };
  }

  async getAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorManage> {
    const response = await this.executeGenerated(getAuthorOperation, {
      path: { authrtCd: authorCode },
      config,
    });
    return requireAuthor(response);
  }

  async createAuthor(author: Partial<AuthorManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createAuthorOperation, {
      body: author as components['schemas']['AuthorManageDto'],
      config,
    });
  }

  async updateAuthor(author: Partial<AuthorManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateAuthorOperation, {
      path: { authrtCd: requireIdentifier(author.authrtCd, '권한 코드') },
      body: author as components['schemas']['AuthorManageDto'],
      config,
    });
  }

  async deleteAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteAuthorOperation, { path: { authrtCd: authorCode }, config });
  }

  /** 현재 OpenAPI는 메뉴 생성 배열을 반환하며 기존 메뉴 트리 페이지와 필드가 호환되지 않는다. */
  async getMenuByAuthority(authorCode: string, config?: AxiosRequestConfig): Promise<PageResponse<MenuByAuthority>> {
    await this.executeGenerated(getAuthorMenusOperation, {
      path: { authrtCd: authorCode },
      config,
    });
    throw new Error('권한 메뉴 OpenAPI 응답을 기존 메뉴 트리 페이지로 안전하게 변환할 수 없습니다.');
  }
}

/** 롤 관리 서비스 (Admin) */
export class RoleAdminService extends AdminService {
  constructor() {
    super('/roles', 'system');
  }

  async getRoleList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<RoleManage>> {
    const response = await this.executeGenerated(getRolesOperation, {
      query: toBaseSearchQuery(params),
      config,
    });
    const page = requireSecurityPage(response);
    return { ...page, list: page.list.map(requireRole) };
  }

  async getRole(roleCode: string, config?: AxiosRequestConfig): Promise<RoleManage> {
    const response = await this.executeGenerated(getRoleOperation, { path: { roleCode }, config });
    return requireRole(response);
  }

  async createRole(role: Partial<RoleManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createRoleOperation, {
      body: role as components['schemas']['RoleManageDto'],
      config,
    });
  }

  async updateRole(role: Partial<RoleManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateRoleOperation, {
      path: { roleCode: requireIdentifier(role.roleId, '롤 코드') },
      body: role as components['schemas']['RoleManageDto'],
      config,
    });
  }

  async deleteRole(roleCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteRoleOperation, { path: { roleCode }, config });
  }
}

/** 그룹 관리 서비스 (Admin) */
export class GroupAdminService extends AdminService {
  constructor() {
    super('/groups', 'system');
  }

  async getGroupList(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<GroupManage>> {
    const response = await this.executeGenerated(getGroupsOperation, {
      query: toGroupSearchQuery(params),
      config,
    });
    const page = requireSecurityPage(response);
    return { ...page, list: page.list.map(requireGroup) };
  }

  async getGroup(groupId: string, config?: AxiosRequestConfig): Promise<GroupManage> {
    const response = await this.executeGenerated(getGroupOperation, { path: { groupId }, config });
    return requireGroup(response);
  }

  async createGroup(group: Partial<GroupManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createGroupOperation, {
      body: group as components['schemas']['GroupManageDto'],
      config,
    });
  }

  async updateGroup(group: Partial<GroupManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateGroupOperation, {
      path: { groupId: requireIdentifier(group.groupId, '그룹 ID') },
      body: group as components['schemas']['GroupManageDto'],
      config,
    });
  }

  async deleteGroup(groupId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteGroupOperation, { path: { groupId }, config });
  }
}

const authorityAdminService = new AuthorityAdminService();

export const getAuthorList = authorityAdminService.getAuthorList.bind(authorityAdminService);
