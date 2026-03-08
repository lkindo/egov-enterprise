import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/user';

class UserService extends ApiService {
    constructor() {
        super('/users/me');
    }

    /**
     * 내 정보 조회
     */
    async getMe() {
        const response = await this.get<any>('');
        return response?.result || response;
    }

    /**
     * 내 정보 수정
     */
    async updateMe(data: Partial<UserDto>) {
        const response = await this.put<any>('', data);
        return response?.result || response;
    }

    /**
     * 비밀번호 변경
     */
    async changePassword(oldPassword: string, newPassword: string) {
        const response = await this.put<any>('/password', { oldPassword, newPassword });
        return response?.result || response;
    }
}

export const userService = new UserService();
