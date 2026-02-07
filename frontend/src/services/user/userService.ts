import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { UserManage, UserSearchParams } from '@/types/user';

// User Management
export const getUserList = async (params: UserSearchParams) => {
    const { data } = await client.get<PaginationResponse<UserManage>>('/uss/umt/EgovUserManage.do', { params });
    return data;
};

export const getUser = async (userId: string) => {
    const { data } = await client.get<UserManage>(`/uss/umt/EgovUserSelectUpdtView.do?selectedId=${userId}`);
    return data;
};

export const createUser = async (user: UserManage) => {
    return client.post('/uss/umt/EgovUserInsert.do', user);
};

export const updateUser = async (user: UserManage) => {
    return client.post('/uss/umt/EgovUserSelectUpdt.do', user);
};

export const deleteUser = async (userId: string) => {
    return client.post(`/uss/umt/EgovUserDelete.do?checkedIdForDel=${userId}`);
};

export const checkIdDuplicate = async (userId: string) => {
    const { data } = await client.post('/uss/umt/EgovIdDplctCnfirm.do', { checkId: userId });
    return data;
};
