import client from '@/lib/api/client';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AuthorManage, RoleManage, GroupManage } from '@/types/security';

// Authority Management
export const getAuthorList = async (params: SearchParams): Promise<PaginationResponse<AuthorManage>> => {
    return client.get<PaginationResponse<AuthorManage>>('/admin/security/authorities', { params });
};

export const getAuthor = async (authorCode: string): Promise<AuthorManage> => {
    return client.get<AuthorManage>(`/admin/security/authorities/${authorCode}`);
};

export const createAuthor = async (author: AuthorManage): Promise<void> => {
    return client.post('/admin/security/authorities', author);
};

export const updateAuthor = async (author: AuthorManage): Promise<void> => {
    return client.put(`/admin/security/authorities/${author.authorCode}`, author);
};

export const deleteAuthor = async (authorCode: string): Promise<void> => {
    return client.delete(`/admin/security/authorities/${authorCode}`);
};

// Role Management
export const getRoleList = async (params: SearchParams): Promise<PaginationResponse<RoleManage>> => {
    return client.get<PaginationResponse<RoleManage>>('/admin/security/roles', { params });
};

export const getRole = async (roleCode: string): Promise<RoleManage> => {
    return client.get<RoleManage>(`/admin/security/roles/${roleCode}`);
};

export const createRole = async (role: RoleManage): Promise<void> => {
    return client.post('/admin/security/roles', role);
};

export const updateRole = async (role: RoleManage): Promise<void> => {
    return client.put(`/admin/security/roles/${role.roleCode}`, role);
};

export const deleteRole = async (roleCode: string): Promise<void> => {
    return client.delete(`/admin/security/roles/${roleCode}`);
};

// Group Management
export const getGroupList = async (params: SearchParams): Promise<PaginationResponse<GroupManage>> => {
    return client.get<PaginationResponse<GroupManage>>('/admin/security/groups', { params });
};

export const getGroup = async (groupId: string): Promise<GroupManage> => {
    return client.get<GroupManage>(`/admin/security/groups/${groupId}`);
};

export const createGroup = async (group: GroupManage): Promise<void> => {
    return client.post('/admin/security/groups', group);
};

export const updateGroup = async (group: GroupManage): Promise<void> => {
    return client.put(`/admin/security/groups/${group.groupId}`, group);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    return client.delete(`/admin/security/groups/${groupId}`);
};

/**
 * Get menu list for a specific authority
 */
export const getMenuCreatList = async (authorCode: string): Promise<PaginationResponse<any>> => {
    return client.get<PaginationResponse<any>>(`/admin/security/authorities/${authorCode}/menus`);
};
