import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';

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
 * 사용자 권한 관리 서비스 (Admin)
 */
class UserAuthorityAdminService extends AdminService {
 constructor() {
 super('/user-authorities');
 }

 /** 사용자별 권한 목록 조회 (권한 할당 여부 포함) */
 async getUserAuthorityList(params?: SearchParams, config?: any): Promise<PageResponse<AuthorGroupProjection>> {
 return this.get<PageResponse<AuthorGroupProjection>>('', { ...config, params });
 }

 /** 사용자의 권한 정보 조회 */
 async getUserAuthority(uniqId: string, config?: any): Promise<UserAuthorityDto | null> {
 return this.get<UserAuthorityDto | null>(`/${uniqId}`, config);
 }

 /** 사용자 권한 저장/업데이트 (단건/다건) */
 async saveUserAuthorities(data: UserAuthorityDto[], config?: any): Promise<void> {
 return this.post<void>('', data, config);
 }

 /** 사용자 권한 단건 저장 */
 async saveUserAuthority(data: UserAuthorityDto, config?: any): Promise<void> {
 return this.post<void>('', [data], config);
 }

 /** 사용자 권한 삭제 */
 async deleteUserAuthorities(uniqIds: string[], config?: any): Promise<void> {
 return this.delete<void>('', { ...config, data: uniqIds });
 }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
