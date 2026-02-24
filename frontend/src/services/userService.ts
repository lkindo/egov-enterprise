import client from '@/lib/api/client';
import { UserDto } from '@/types/user';

export const userService = {
  /**
   * ???뺣낫 議고쉶
   */
  getMe: async () => {
    const response = await client.get('/users/me');
    return response;
  },

  /**
   * ???뺣낫 ?섏젙
   */
  updateMe: async (data: Partial<UserDto>) => {
    const response = await client.put('/users/me', data);
    return response;
  },

  /**
   * 鍮꾨?踰덊샇 蹂寃?
   */
  changePassword: async (oldPassword: String, newPassword: String) => {
    const response = await client.put('/users/me/password', { oldPassword, newPassword });
    return response;
  }
};

