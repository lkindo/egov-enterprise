import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/foundation/user';
import type { components } from '@/types/generated-api';
import { changePasswordOperation, getMeOperation, updateMeOperation } from '@/types/generated-operations';

type UserProfileUpdate = components['schemas']['UserProfileUpdateRequest'];

class UserService extends ApiService {
  constructor() {
    super('/users/me');
  }

  /** 내 정보 조회 */
  async getMe(): Promise<UserDto> {
    return this.executeGenerated(getMeOperation, {}) as Promise<UserDto>;
  }

  /** 내 정보 수정 */
  async updateMe(data: UserProfileUpdate): Promise<void> {
    return this.executeGenerated(updateMeOperation, { body: data });
  }

  /**
   * 비밀번호 변경.
   *
   * <p>현재 비밀번호를 함께 보내는 것은 서버 계약이다({@code PasswordChangeRequest.oldPassword} 필수) —
   * 세션만 탈취한 공격자가 비밀번호를 바꿔 계정을 잠그는 경로를 막는다.
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.executeGenerated(changePasswordOperation, {
      body: { oldPassword, newPassword },
    });
  }
}

export const userService = new UserService();
