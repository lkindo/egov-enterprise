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
 * ?ъ슜님沅뚰븳 愿由님쒕퉬님(Admin)
 */
class UserAuthorityAdminService extends AdminService {
  constructor() {
    super('/user-authorities');
  }

  /** ?ъ슜?먮퀎 沅뚰븳 紐⑸줉 조회 (沅뚰븳 ?좊떦 ?щ? ?ы븿) */
  async getUserAuthorityList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorGroupProjection>> {
    return this.get<PageResponse<AuthorGroupProjection>>('', { ...config, params });
  }

  /** ?ъ슜?먯쓽 沅뚰븳 ?뺣낫 조회 */
  async getUserAuthority(uniqId: string, config?: AxiosRequestConfig): Promise<UserAuthorityDto | null> {
    return this.get<UserAuthorityDto | null>(`/${uniqId}`, config);
  }

  /** ?ъ슜님沅뚰븳 ?님?낅뜲?댄듃 (?④굔/?ㅺ굔) */
  async saveUserAuthorities(data: UserAuthorityDto[], config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** ?ъ슜님沅뚰븳 ?④굔 ?님*/
  async saveUserAuthority(data: UserAuthorityDto, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', [data], config);
  }

  /** ?ъ슜님沅뚰븳 님젣 */
  async deleteUserAuthorities(uniqIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: uniqIds });
  }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
