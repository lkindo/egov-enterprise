import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { UserManage, UserSearchParams } from '@/types/foundation/user';

/**
 * 사용자관리님쒕퉬님(Admin)
 */
class UserAdminService extends AdminService {
  constructor() {
    super('/users');
  }

  /** 사용자紐⑸줉 조회 (?섏씠吏 */
  async getUserList(params?: UserSearchParams | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserManage>> {
    return this.get<PageResponse<UserManage>>('', { ...config, params });
  }

  /** 사용자상세 조회 */
  async getUser(userId: string, config?: AxiosRequestConfig): Promise<UserManage> {
    return this.get<UserManage>(`/${userId}`, config);
  }

  /** 사용자등록 */
  async createUser(data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 사용자?뺣낫 ?섏젙 */
  async updateUser(userId: string, data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${userId}`, data, config);
  }

  /** 사용자님젣 */
  async deleteUser(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${userId}`, config);
  }

  /** 사용자ㅼ쨷 님젣 */
  async deleteUsers(userIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: userIds });
  }

  /** 鍮꾨踰덊샇 蹂寃*/
  async updatePassword(userId: string, data: { newPassword: string }, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${userId}/password`, data, config);
  }

  /** ?꾩씠님以묐났 확인 */
  async checkIdDuplicate(userId: string, config?: AxiosRequestConfig): Promise<{ available: boolean }> {
    return this.get<{ available: boolean }>(`/check-id`, { ...config, params: { userId } });
  }
}

export const userAdminService = new UserAdminService();
