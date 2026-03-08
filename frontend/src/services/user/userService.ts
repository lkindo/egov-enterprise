import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/user';

class UserService extends ApiService {
    constructor() {
        super('/users/me');
    }

    /**
     * ???類ｋ궖 鈺곌퀬??
     */
    async getMe() {
        const response = await this.get<any>('');
        return response?.result || response;
    }

    /**
     * ???類ｋ궖 ??륁젟
     */
    async updateMe(data: Partial<UserDto>) {
        const response = await this.put<any>('', data);
        return response?.result || response;
    }

    /**
     * ??쑬?甕곕뜇??癰궰野?     */
    async changePassword(oldPassword: string, newPassword: string) {
        const response = await this.put<any>('/password', { oldPassword, newPassword });
        return response?.result || response;
    }
}

export const userService = new UserService();
