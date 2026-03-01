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
        return this.get<any>('');
    }

    /**
     * 내 정보 수정
     */
    async updateMe(data: Partial<UserDto>) {
        return this.put<any>('', data);
    }

    /**
     * 비밀번호 변경
     */
    async changePassword(oldPassword: string, newPassword: string) {
        return this.put<any>('/password', { oldPassword, newPassword });
    }
}

export const userService = new UserService();
