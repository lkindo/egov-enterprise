import { ApiService } from '@/services/core/ApiService';
import { UserManage, UserSearchParams, UserDto } from '@/types/user';
import { PaginationResponse } from '@/types/system';

class UserAdminService extends ApiService {
    constructor() {
        super('/admin/system/users');
    }

    /**
     * ?????筌뤴뫖以?鈺곌퀬??
     */
    async getUsers(params: UserSearchParams = {}, config?: any): Promise<PaginationResponse<UserManage>> {
        const res: any = await this.get('', { ...config, params });
        return {
            resultList: res.resultList || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * ??????怨멸쉭 鈺곌퀬??
     */
    async getUser(userId: string, config?: any): Promise<UserManage> {
        return this.get<UserManage>(`/${userId}`, config);
    }

    /**
     * ??????源낆쨯
     */
    async createUser(data: Partial<UserManage>, config?: any): Promise<void> {
        return this.post('', data, config);
    }

    /**
     * ???????륁젟
     */
    async updateUser(userId: string, data: Partial<UserManage>, config?: any): Promise<void> {
        return this.put(`/${userId}`, data, config);
    }

    /**
     * ?????????
     */
    async deleteUser(userId: string, config?: any): Promise<void> {
        return this.delete(`/${userId}`, config);
    }
}

export const userAdminService = new UserAdminService();
