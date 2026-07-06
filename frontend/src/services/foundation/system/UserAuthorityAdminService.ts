import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface UserAuthorityDto {
  scrtyDcsnTrgtId: string;
  authrtId: string;
  mbrTypeCd?: string;
}

export interface AuthorGroupProjection {
  scrtyDcsnTrgtId: string;
  userId: string;
  userNm: string;
  authrtId: string;
  mbrTypeCd: string;
  regYn: string; // 'Y' or 'N'
  groupId?: string;
  mberTyNm?: string;
}

/**
 * 사용자권한 관리 서비스 (Admin)
 */
class UserAuthorityAdminService extends AdminService {
  constructor() {
    super('/user-authorities');
  }

  /** 사용자별 권한 목록 조회 */
  async getUserAuthorityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorGroupProjection>> {
    return this.get<PageResponse<AuthorGroupProjection>>('', { ...config, params });
  }

  /** 사용자의 권한 정보 조회 */
  async getUserAuthority(scrtyDcsnTrgtId: string, config?: AxiosRequestConfig): Promise<UserAuthorityDto | null> {
    return this.get<UserAuthorityDto | null>(`/${scrtyDcsnTrgtId}`, config);
  }

  /** 사용자권한 저장/업데이트 */
  async saveUserAuthorities(data: UserAuthorityDto[], config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 사용자권한 단건 저장 */
  async saveUserAuthority(data: UserAuthorityDto, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', [data], config);
  }

  /** 사용자권한 삭제 */
  async deleteUserAuthorities(uniqIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: uniqIds });
  }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
