import { AdminService } from '@/services/core/ApiService';
import { UserManage, UserSearchParams } from '@/types/user';

/**
 * 사용자 관리 서비스 (Admin)
 */
class UserAdminService extends AdminService {
    constructor() {
        super('/users');
    }

    /** 사용자 목록 조회 (페이징) */
    async getUserList(params?: UserSearchParams, config?: any) {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 사용자 상세 조회 */
    async getUser(userId: string, config?: any) {
        const response = await this.get<any>(`/${userId}`, config);
        return response?.result || response;
    }

    /** 사용자 등록 */
    async createUser(data: Partial<UserManage>, config?: any) {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 사용자 정보 수정 */
    async updateUser(userId: string, data: Partial<UserManage>, config?: any) {
        const response = await this.put<any>(`/${userId}`, data, config);
        return response?.result || response;
    }

    /** 사용자 삭제 */
    async deleteUser(userId: string, config?: any) {
        const response = await this.delete<any>(`/${userId}`, config);
        return response?.result || response;
    }

    /** 아이디 중복 확인 */
    async checkIdDuplicate(userId: string, config?: any) {
        const response = await this.get<any>('/check-id', { ...config, params: { userId } });
        return response?.result || response;
    }
}

export const userAdminService = new UserAdminService();
