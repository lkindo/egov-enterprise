import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { UserManage, UserSearchParams } from '@/types/foundation/user';

/**
 * 사용자 관리 서비스 (Admin)
 */
class UserAdminService extends AdminService {
  constructor() {
    super('/users');
  }

  /** 사용자 목록 조회 (페이징) */
  async getUserList(params?: UserSearchParams | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserManage>> {
    return this.get<PageResponse<UserManage>>('', { ...config, params });
  }

  /** 사용자 상세 조회 */
  async getUser(userId: string, config?: AxiosRequestConfig): Promise<UserManage> {
    return this.get<UserManage>(`/${userId}`, config);
  }

  /** 사용자 등록 */
  async createUser(data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 사용자 정보 수정 */
  async updateUser(userId: string, data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${userId}`, data, config);
  }

  /** 사용자 삭제 */
  async deleteUser(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${userId}`, config);
  }

  /** 사용자 다중 삭제 */
  async deleteUsers(userIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: userIds });
  }

  /** 비밀번호 변경 */
  async updatePassword(userId: string, data: { newPassword: string }, config?: AxiosRequestConfig): Promise<void> {
    return this.patch<void>(`/${userId}/password`, data, config);
  }

  /** 아이디 중복 확인 */
  async checkIdDuplicate(userId: string, config?: AxiosRequestConfig): Promise<{ available: boolean }> {
    return this.get<{ available: boolean }>(`/check-id`, { ...config, params: { userId } });
  }
}

export const userAdminService = new UserAdminService();
