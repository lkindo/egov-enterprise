import client from '@/lib/api/client';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AuthorManage, RoleManage, GroupManage } from '@/types/security';

// Authority Management
export const getAuthorList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<AuthorManage>>('/sec/ram/EgovAuthorList.do', { params });
    return data;
};

export const getAuthor = async (authorCode: string) => {
    const { data } = await client.get<AuthorManage>(`/sec/ram/EgovAuthor.do?authorCode=${authorCode}`);
    return data;
};

export const createAuthor = async (author: AuthorManage) => {
    return client.post('/sec/ram/EgovAuthorInsert.do', author);
};

export const updateAuthor = async (author: AuthorManage) => {
    return client.post('/sec/ram/EgovAuthorUpdate.do', author);
};

export const deleteAuthor = async (authorCode: string) => {
    return client.post(`/sec/ram/EgovAuthorDelete.do?authorCode=${authorCode}`);
};

// Role Management
export const getRoleList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<RoleManage>>('/sec/rmt/EgovRoleList.do', { params });
    return data;
};

export const getRole = async (roleCode: string) => {
    const { data } = await client.get<RoleManage>(`/sec/rmt/EgovRole.do?roleCode=${roleCode}`);
    return data;
};

export const createRole = async (role: RoleManage) => {
    return client.post('/sec/rmt/EgovRoleInsert.do', role);
};

export const deleteRole = async (roleCode: string) => {
    return client.post(`/sec/rmt/EgovRoleDelete.do?roleCode=${roleCode}`);
};

// Group Management
export const getGroupList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<GroupManage>>('/sec/gmt/EgovGroupList.do', { params });
    return data;
};

export const getGroup = async (groupId: string) => {
    const { data } = await client.get<GroupManage>(`/sec/gmt/EgovGroup.do?groupId=${groupId}`);
    return data;
};

export const createGroup = async (group: GroupManage) => {
    return client.post('/sec/gmt/EgovGroupInsert.do', group);
};

export const updateGroup = async (group: GroupManage) => {
    return client.post('/sec/gmt/EgovGroupUpdate.do', group);
};

export const deleteGroup = async (groupId: string) => {
    return client.post(`/sec/gmt/EgovGroupDelete.do?groupId=${groupId}`);
};

