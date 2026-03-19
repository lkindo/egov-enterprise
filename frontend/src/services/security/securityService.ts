import client from '@/lib/api/client';
import { PageResponse, SearchParams } from '@/types/system';
import { AuthorManage, RoleManage, GroupManage } from '@/types/security';

// Authority Management
export const getAuthorList = async (params: SearchParams): Promise<PageResponse<AuthorManage>> => {
 return client.get<PageResponse<AuthorManage>>('/admin/system/authorities', { params });
};

export const getAuthor = async (authorCode: string): Promise<AuthorManage> => {
 return client.get<AuthorManage>(`/admin/system/authorities/${authorCode}`);
};

export const createAuthor = async (author: Partial<AuthorManage>): Promise<void> => {
 return client.post('/admin/system/authorities', author);
};

export const updateAuthor = async (author: Partial<AuthorManage>): Promise<void> => {
 return client.put(`/admin/system/authorities/${author.authorCode}`, author);
};

export const deleteAuthor = async (authorCode: string): Promise<void> => {
 return client.delete(`/admin/system/authorities/${authorCode}`);
};

// Role Management
export const getRoleList = async (params: SearchParams): Promise<PageResponse<RoleManage>> => {
 return client.get<PageResponse<RoleManage>>('/admin/system/roles', { params });
};

export const getRole = async (roleCode: string): Promise<RoleManage> => {
 return client.get<RoleManage>(`/admin/system/roles/${roleCode}`);
};

export const createRole = async (role: Partial<RoleManage>): Promise<void> => {
 return client.post('/admin/system/roles', role);
};

export const updateRole = async (role: Partial<RoleManage>): Promise<void> => {
 return client.put(`/admin/system/roles/${role.roleCode}`, role);
};

export const deleteRole = async (roleCode: string): Promise<void> => {
 return client.delete(`/admin/system/roles/${roleCode}`);
};

// Group Management
export const getGroupList = async (params: SearchParams): Promise<PageResponse<GroupManage>> => {
 return client.get<PageResponse<GroupManage>>('/admin/system/groups', { params });
};

export const getGroup = async (groupId: string): Promise<GroupManage> => {
 return client.get<GroupManage>(`/admin/system/groups/${groupId}`);
};

export const createGroup = async (group: Partial<GroupManage>): Promise<void> => {
 return client.post('/admin/system/groups', group);
};

export const updateGroup = async (group: Partial<GroupManage>): Promise<void> => {
 return client.put(`/admin/system/groups/${group.groupId}`, group);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
 return client.delete(`/admin/system/groups/${groupId}`);
};

/**
 * Get menu list for a specific authority
 */
export const getMenuCreatList = async (authorCode: string): Promise<PageResponse<any>> => {
 return client.get<PageResponse<any>>(`/admin/system/authorities/${authorCode}/menus`);
};
