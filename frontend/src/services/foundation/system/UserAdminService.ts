import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { UserManage, UserSearchParams } from '@/types/foundation/user';

/**
 * ?ъ슜님愿由님쒕퉬님(Admin)
 */
class UserAdminService extends AdminService {
  constructor() {
    super('/users');
  }

  /** ?ъ슜님紐⑸줉 조회 (?섏씠吏? */
  async getUserList(params?: UserSearchParams | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserManage>> {
    return this.get<PageResponse<UserManage>>('', { ...config, params });
  }

  /** ?ъ슜님?곸꽭 조회 */
  async getUser(userId: string, config?: AxiosRequestConfig): Promise<UserManage> {
    return this.get<UserManage>(`/${userId}`, config);
  }

  /** ?ъ슜님등록 */
  async createUser(data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** ?ъ슜님?뺣낫 ?섏젙 */
  async updateUser(userId: string, data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${userId}`, data, config);
  }

  /** ?ъ슜님님젣 */
  async deleteUser(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${userId}`, config);
  }

  /** ?ъ슜님?ㅼ쨷 님젣 */
  async deleteUsers(userIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: userIds });
  }

  /** 鍮꾨?踰덊샇 蹂寃?*/
  async updatePassword(userId: string, data: { newPassword: string }, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${userId}/password`, data, config);
  }

  /** ?꾩씠님以묐났 ?뺤씤 */
  async checkIdDuplicate(userId: string, config?: AxiosRequestConfig): Promise<{ available: boolean }> {
    return this.get<{ available: boolean }>(`/check-id`, { ...config, params: { userId } });
  }
}

export const userAdminService = new UserAdminService();
