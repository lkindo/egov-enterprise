import { ApiService } from '@/services/core/ApiService';
import { UserManage, UserSearchParams, UserDto } from '@/types/user';
import { PaginationResponse } from '@/types/system';

class UserAdminService extends ApiService {
    constructor() {
        super('/admin/system/users');
    }

    /**
     * 사용자 목록 조회
     */
    async getUsers(params: UserSearchParams = {}, config?: any): Promise<PaginationResponse<UserManage>> {
        const res: any = await this.get('', { ...config, params });
        return {
            resultList: res.resultList || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 사용자 상세 조회
     */
    async getUser(userId: string, config?: any): Promise<UserManage> {
        return this.get<UserManage>(`/${userId}`, config);
    }

    /**
     * 사용자 등록
     */
    async createUser(data: Partial<UserManage>, config?: any): Promise<void> {
        return this.post('', data, config);
    }

    /**
     * 사용자 수정
     */
    async updateUser(userId: string, data: Partial<UserManage>, config?: any): Promise<void> {
        return this.put(`/${userId}`, data, config);
    }

    /**
     * 사용자 삭제
     */
    async deleteUser(userId: string, config?: any): Promise<void> {
        return this.delete(`/${userId}`, config);
    }
}

export const userAdminService = new UserAdminService();
