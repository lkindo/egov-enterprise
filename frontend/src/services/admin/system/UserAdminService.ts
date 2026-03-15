import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { UserManage, UserSearchParams } from '@/types/user';

/**
 * 사용자 관리 서비스 (Admin)
 */
class UserAdminService extends AdminService {
    constructor() {
        super('/users');
    }

    /** 사용자 목록 조회 (페이징) */
    async getUserList(params?: UserSearchParams | SearchParams, config?: any): Promise<PageResponse<UserManage>> {
        return this.get<PageResponse<UserManage>>('', { ...config, params });
    }

    /** 사용자 상세 조회 */
    async getUser(userId: string, config?: any): Promise<UserManage> {
        return this.get<UserManage>(`/${userId}`, config);
    }

    /** 사용자 등록 */
    async createUser(data: Partial<UserManage>, config?: any): Promise<void> {
        return this.post<void>('', data, config);
    }

    /** 사용자 정보 수정 */
    async updateUser(userId: string, data: Partial<UserManage>, config?: any): Promise<void> {
        return this.put<void>(`/${userId}`, data, config);
    }

    /** 사용자 삭제 */
    async deleteUser(userId: string, config?: any): Promise<void> {
        return this.delete<void>(`/${userId}`, config);
    }

    /** 사용자 다중 삭제 */
    async deleteUsers(userIds: string[], config?: any): Promise<void> {
        return this.delete<void>('', { ...config, data: userIds });
    }

    /** 비밀번호 변경 */
    async updatePassword(userId: string, data: { newPassword: string }, config?: any): Promise<void> {
        return this.put<void>(`/${userId}/password`, data, config);
    }

    /** 아이디 중복 확인 */
    async checkIdDuplicate(userId: string, config?: any): Promise<{ available: boolean }> {
        return this.get<{ available: boolean }>(`/check-id`, { ...config, params: { userId } });
    }
}

export const userAdminService = new UserAdminService();
