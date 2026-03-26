import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/foundation/user';

class UserService extends ApiService {
 constructor() {
 super('/users/me');
 }

 /**
 * 내 정보 조회
 */
 async getMe(): Promise<UserDto> {
 return this.get<UserDto>('');
 }

 /**
 * 내 정보 수정
 */
 async updateMe(data: Partial<UserDto>): Promise<void> {
 return this.put<void>('', data);
 }

 /**
 * 비밀번호 변경
 */
 async changePassword(oldPassword: string, newPassword: string): Promise<void> {
 return this.put<void>('/password', { oldPassword, newPassword });
 }
}

export const userService = new UserService();
