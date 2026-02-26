import client from '@/lib/api/client';
import { UserDto } from '@/types/user';

export const userService = {
  /**
   * 내 정보 조회
   */
  getMe: async () => {
    const response = await client.get('/users/me');
    return response;
  },

  /**
   * 내 정보 수정
   */
  updateMe: async (data: Partial<UserDto>) => {
    const response = await client.put('/users/me', data);
    return response;
  },

  /**
   * 비밀번호 변경
   */
  changePassword: async (oldPassword: String, newPassword: String) => {
    const response = await client.put('/users/me/password', { oldPassword, newPassword });
    return response;
  }
};
