import type { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { UserManage, UserSearchParams } from '@/types/foundation/user';
import type { components, operations } from '@/types/generated-api';
import { toManagedUserRole } from '@/lib/auth/administrative-role';
import {
  deleteUserOperation,
  deleteUsersOperation,
  getUserOperation,
  getUsersOperation,
  insertUserOperation,
  moveUsersToDeptOperation,
  updatePasswordByAdminOperation,
  updateUserOperation,
  updateUsersRoleOperation,
  updateUsersStatusOperation,
} from '@/types/generated-operations';

type UserListQuery = NonNullable<operations['getUsers']['parameters']['query']>;
type UserProfileUpdate = components['schemas']['UserProfileUpdateRequest'];
type UserResponse = Omit<
  components['schemas']['UserDto'],
  'pswd' | 'pswdHint' | 'pswdCrans'
>;

function toUserListQuery(params?: UserSearchParams | SearchParams): UserListQuery {
  if (!params) return {};
  const normalizedParams = params as UserSearchParams & SearchParams;
  const {
    pageIndex,
    pageNo,
    pageSize,
    recordCountPerPage,
    searchWrd,
    ...query
  } = normalizedParams;
  const generatedQuery = query as UserListQuery;

  if (generatedQuery.page === undefined) {
    if (pageIndex !== undefined) generatedQuery.page = pageIndex - 1;
    else if (pageNo !== undefined) generatedQuery.page = pageNo - 1;
  }
  if (generatedQuery.size === undefined) {
    if (typeof pageSize === 'number') generatedQuery.size = pageSize;
    else if (typeof recordCountPerPage === 'number') generatedQuery.size = recordCountPerPage;
  }
  if (generatedQuery.searchKeyword === undefined && typeof searchWrd === 'string') {
    generatedQuery.searchKeyword = searchWrd;
  }
  return generatedQuery;
}

function toUserManage(item: UserResponse): UserManage {
  if (
    typeof item.userId !== 'string'
    || typeof item.userNm !== 'string'
  ) {
    throw new Error('사용자 응답이 필수 공개 계약과 일치하지 않습니다.');
  }

  const result: UserManage = {
    userId: item.userId,
    userNm: item.userNm,
  };
  const optionalFields = [
    'userSttsCd',
    'emlAddr',
    'groupId',
    'esntlId',
    'mblTelno',
    'areaNo',
    'middleTelno',
    'endTelno',
    'faxNo',
    'zip',
    'homeAddr',
    'daddr',
    'ognzId',
    'emplNo',
    'gndrCd',
    'brthYmd',
  ] as const;
  for (const field of optionalFields) {
    const value = item[field];
    if (value !== undefined) Object.assign(result, { [field]: value });
  }
  return result;
}

function toUserProfileUpdate(data: UserProfileUpdate): UserProfileUpdate {
  const result: UserProfileUpdate = { userNm: data.userNm };
  const optionalFields = [
    'emplNo',
    'areaNo',
    'middleTelno',
    'endTelno',
    'faxNo',
    'homeAddr',
    'daddr',
    'zip',
    'officeTelno',
    'mblTelno',
    'emlAddr',
    'ofcpsNm',
    'groupId',
    'ognzId',
    'pstinstCd',
  ] as const satisfies readonly (keyof UserProfileUpdate)[];
  for (const field of optionalFields) {
    const value = data[field];
    if (value !== undefined) Object.assign(result, { [field]: value });
  }
  return result;
}

function requireUserPage(
  response: {
    list?: UserResponse[];
    total?: number;
    page?: number;
    size?: number;
    totalPage?: number;
  },
): PageResponse<UserManage> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('사용자 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(toUserManage),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 사용자 관리 서비스 (Admin) */
class UserAdminService extends AdminService {
  constructor() {
    super('/users');
  }

  /** 사용자 목록 조회 (페이징) */
  async getUserList(params?: UserSearchParams | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserManage>> {
    const response = await this.executeGenerated(getUsersOperation, {
      query: toUserListQuery(params),
      config,
    });
    return requireUserPage(response);
  }

  /** 사용자 상세 조회 */
  async getUser(userId: string, config?: AxiosRequestConfig): Promise<UserManage> {
    const response = await this.executeGenerated(getUserOperation, { path: { userId }, config });
    return toUserManage(response);
  }

  /** 사용자 등록 */
  async createUser(data: Partial<UserManage>, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(insertUserOperation, {
      body: data as components['schemas']['UserDto'],
      config,
    });
  }

  /** 사용자 정보 수정 */
  async updateUser(userId: string, data: UserProfileUpdate, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateUserOperation, {
      path: { userId },
      body: toUserProfileUpdate(data),
      config,
    });
  }

  /** 사용자 삭제 */
  async deleteUser(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteUserOperation, { path: { userId }, config });
  }

  /** 사용자 다중 삭제 */
  async deleteUsers(userIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteUsersOperation, { body: userIds, config });
  }

  /** 비밀번호 변경 */
  async updatePassword(userId: string, data: { newPassword: string }, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updatePasswordByAdminOperation, {
      path: { userId },
      body: data,
      config,
    });
  }

  /** 사용자 상태 일괄 변경 */
  async updateUsersStatus(userIds: string[], status: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateUsersStatusOperation, { body: { userIds, status }, config });
  }

  /** 사용자 부서 일괄 이동 */
  async moveUsersToDept(userIds: string[], ognzId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(moveUsersToDeptOperation, { body: { userIds, ognzId }, config });
  }

  /** 사용자 권한 일괄 변경 */
  async updateUsersRole(userIds: string[], role: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateUsersRoleOperation, {
      body: { userIds, role: toManagedUserRole(role) },
      config,
    });
  }
}

export const userAdminService = new UserAdminService();
