import client from '@/lib/api/client';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AuthorManage, RoleManage, GroupManage } from '@/types/security';

// Authority Management
export const getAuthorList = async (params: SearchParams): Promise<PaginationResponse<AuthorManage>> => {
    return client.get<PaginationResponse<AuthorManage>>('/sec/ram/EgovAuthorList.do', { params });
};

export const getAuthor = async (authorCode: string): Promise<AuthorManage> => {
    return client.get<AuthorManage>(`/sec/ram/EgovAuthor.do?authorCode=${authorCode}`);
};

export const createAuthor = async (author: AuthorManage): Promise<void> => {
    return client.post('/sec/ram/EgovAuthorInsert.do', author);
};

export const updateAuthor = async (author: AuthorManage): Promise<void> => {
    return client.post('/sec/ram/EgovAuthorUpdate.do', author);
};

export const deleteAuthor = async (authorCode: string): Promise<void> => {
    return client.post(`/sec/ram/EgovAuthorDelete.do?authorCode=${authorCode}`);
};

// Role Management
export const getRoleList = async (params: SearchParams): Promise<PaginationResponse<RoleManage>> => {
    return client.get<PaginationResponse<RoleManage>>('/sec/rmt/EgovRoleList.do', { params });
};

export const getRole = async (roleCode: string): Promise<RoleManage> => {
    return client.get<RoleManage>(`/sec/rmt/EgovRole.do?roleCode=${roleCode}`);
};

export const createRole = async (role: RoleManage): Promise<void> => {
    return client.post('/sec/rmt/EgovRoleInsert.do', role);
};

export const deleteRole = async (roleCode: string): Promise<void> => {
    return client.post(`/sec/rmt/EgovRoleDelete.do?roleCode=${roleCode}`);
};

// Group Management
export const getGroupList = async (params: SearchParams): Promise<PaginationResponse<GroupManage>> => {
    return client.get<PaginationResponse<GroupManage>>('/sec/gmt/EgovGroupList.do', { params });
};

export const getGroup = async (groupId: string): Promise<GroupManage> => {
    return client.get<GroupManage>(`/sec/gmt/EgovGroup.do?groupId=${groupId}`);
};

export const createGroup = async (group: GroupManage): Promise<void> => {
    return client.post('/sec/gmt/EgovGroupInsert.do', group);
};

export const updateGroup = async (group: GroupManage): Promise<void> => {
    return client.post('/sec/gmt/EgovGroupUpdate.do', group);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    return client.post(`/sec/gmt/EgovGroupDelete.do?groupId=${groupId}`);
};
