import { AdminService } from '@/services/core/ApiService';

export interface AuthorInfo {
    authorCode: string;
    authorNm: string;
    authorDc?: string;
}

class RoleAdminService extends AdminService {
    constructor() {
        super('/authorities'); // Maps to /admin/system/authorities
    }

    /**
     * 권한 목록 조회
     */
    async getAuthors() {
        const response = await this.get<any>('');
        return response?.result || response;
    }
}

export const roleAdminService = new RoleAdminService();
