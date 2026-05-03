import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/foundation/user';

class UserService extends ApiService {
 constructor() {
 super('/users/me');
 }

 /**
 * 님정보 조회
 */
 async getMe(): Promise<UserDto> {
 return this.get<UserDto>('');
 }

 /**
 * 님정보 ?섏젙
 */
 async updateMe(data: Partial<UserDto>): Promise<void> {
 return this.put<void>('', data);
 }

 /**
 * 鍮꾨踰덊샇 蹂寃 */
 async changePassword(oldPassword: string, newPassword: string): Promise<void> {
 return this.put<void>('/password', { oldPassword, newPassword });
 }
}

export const userService = new UserService();
