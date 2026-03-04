import { AdminService } from '@/services/core/ApiService';

export interface AuthorInfo {
    authorCode: string;
    authorNm: string;
    authorDc?: string;
}

class RoleAdminService extends AdminService {
    constructor() {
        super('/authorities'); // Will map to /admin/system/authorities
    }

    /**
     * 전체 권한 목록 조회
     */
    async getAuthors() {
        return this.get<any>('');
    }
}

export const roleAdminService = new RoleAdminService();
