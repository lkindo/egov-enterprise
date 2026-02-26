import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { UserManage, UserSearchParams } from '@/types/user';

/**
 * 사용자 목록 조회
 */
export const getUserList = async (params: UserSearchParams, config?: any): Promise<PaginationResponse<UserManage>> => {
    const response: any = await client.get('/admin/users', { ...config, params });
    return {
        resultList: response.resultList || response.data || [],
        paginationInfo: response.paginationInfo || response.pagination || {}
    };
};

/**
 * 사용자 상세 조회
 */
export const getUser = async (userId: string, config?: any): Promise<UserManage> => {
    return client.get<UserManage>(`/admin/users/${userId}`, config);
};

/**
 * 사용자 등록
 */
export const createUser = async (user: UserManage, config?: any): Promise<void> => {
    return client.post('/admin/users', user, config);
};

/**
 * 사용자 수정
 */
export const updateUser = async (user: UserManage, config?: any): Promise<void> => {
    return client.put(`/admin/users/${user.userId}`, user, config);
};

/**
 * 사용자 삭제
 */
export const deleteUser = async (userId: string, config?: any): Promise<void> => {
    return client.delete(`/admin/users/${userId}`, config);
};

/**
 * 아이디 중복 체크
 */
export const checkIdDuplicate = async (userId: string, config?: any): Promise<unknown> => {
    return client.post(`/admin/users/check-id/${userId}`, {}, config);
};
