import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface UserAuthorityDto {
  uniqId: string;
  authorCode: string;
  mberTyCode?: string;
}

export interface AuthorGroupProjection {
  uniqId: string;
  userId: string;
  userNm: string;
  authorCode: string;
  mberTyCode: string;
  regYn: string; // 'Y' or 'N'
}

/**
 * 사용자권한 관리님쒕퉬님(Admin)
 */
class UserAuthorityAdminService extends AdminService {
  constructor() {
    super('/user-authorities');
  }

  /** ъ슜?먮퀎 권한 목록 조회 (권한 ?좊떦 여부 ы븿) */
  async getUserAuthorityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorGroupProjection>> {
    return this.get<PageResponse<AuthorGroupProjection>>('', { ...config, params });
  }

  /** 사용자의 권한 정보 조회 */
  async getUserAuthority(uniqId: string, config?: AxiosRequestConfig): Promise<UserAuthorityDto | null> {
    return this.get<UserAuthorityDto | null>(`/${uniqId}`, config);
  }

  /** 사용자권한 님?낅뜲?댄듃 (④굔/ㅺ굔) */
  async saveUserAuthorities(data: UserAuthorityDto[], config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 사용자권한 ④굔 님*/
  async saveUserAuthority(data: UserAuthorityDto, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', [data], config);
  }

  /** 사용자권한 님젣 */
  async deleteUserAuthorities(uniqIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: uniqIds });
  }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
