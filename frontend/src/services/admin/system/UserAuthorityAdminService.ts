import { AdminService } from '@/services/core/ApiService';

export interface UserAuthorityDto {
    uniqId: string;
    authorCode: string;
    mberTyCode: string;
}

/**
 * 사용자 권한 관리 서비스 (Admin)
 */
class UserAuthorityAdminService extends AdminService {
    constructor() {
        super('/user-authorities');
    }

    /** 사용자의 권한 정보 조회 */
    async getUserAuthority(uniqId: string, config?: any): Promise<UserAuthorityDto | null> {
        return this.get<UserAuthorityDto | null>(`/${uniqId}`, config);
    }

    /** 사용자 권한 저장/업데이트 */
    async saveUserAuthority(data: UserAuthorityDto, config?: any): Promise<void> {
        return this.post<void>('', data, config);
    }

    /** 사용자 권한 삭제 */
    async deleteUserAuthority(uniqId: string, config?: any): Promise<void> {
        return this.delete<void>(`/${uniqId}`, config);
    }
}

export const userAuthorityAdminService = new UserAuthorityAdminService();
