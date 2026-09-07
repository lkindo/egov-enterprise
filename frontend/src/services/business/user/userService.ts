import { ApiService } from '@/services/core/ApiService';
import { UserDto } from '@/types/foundation/user';
import type { components } from '@/types/generated-api';
import { changePasswordOperation, getMeOperation, updateMeOperation } from '@/types/generated-operations';

/*
  [2026-09-08 정정] 종전에는 관리자용 `UserProfileUpdateRequest`(17필드)를 선언했는데,
  `PUT /users/me` 가 실제로 받는 계약은 `UserSelfProfileUpdateRequest`(13필드)다 —
  소속 그룹·부서·기관은 그 경계가 아예 역직렬화하지 않는다(@JsonIgnoreProperties).
  관리자 타입이 상위집합이라 tsc 는 통과했고 서버도 무시했지만, 계약 표기가 사실과 달라
  화면이 '보내면 반영된다' 고 오해할 수 있었다.
*/
type SelfProfileUpdate = components['schemas']['UserSelfProfileUpdateRequest'];

class UserService extends ApiService {
  constructor() {
    super('/users/me');
  }

  /** 내 정보 조회 */
  async getMe(): Promise<UserDto> {
    return this.executeGenerated(getMeOperation, {}) as Promise<UserDto>;
  }

  /** 내 정보 수정 */
  async updateMe(data: SelfProfileUpdate): Promise<void> {
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
