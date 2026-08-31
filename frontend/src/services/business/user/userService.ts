import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/foundation/user';
import type { components } from '@/types/generated-api';
import { changePasswordOperation, getMeOperation, updateMeOperation } from '@/types/generated-operations';

type UserProfileUpdate = components['schemas']['UserProfileUpdateRequest'];

class UserService extends ApiService {
 constructor() {
 super('/users/me');
 }

 /**
 * 님정보 조회
 */
 async getMe(): Promise<UserDto> {
 return this.executeGenerated(getMeOperation, {}) as Promise<UserDto>;
 }

 /**
 * 님정보 수정
 */
 async updateMe(data: UserProfileUpdate): Promise<void> {
 return this.executeGenerated(updateMeOperation, { body: data });
 }

 /**
 * 비밀번호 蹂寃 */
 async changePassword(oldPassword: string, newPassword: string): Promise<void> {
 return this.executeGenerated(changePasswordOperation, {
 body: { oldPassword, newPassword },
 });
 }
}

export const userService = new UserService();
