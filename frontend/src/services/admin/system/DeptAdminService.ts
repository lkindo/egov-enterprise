import { AdminService } from '@/services/core/ApiService';

export interface Department {
    orgnztId: string;
    orgnztNm: string;
    orgnztDc?: string;
}

class DeptAdminService extends AdminService {
    constructor() {
        super('/departments');
    }

    /**
     * 전체 부서(조직) 목록 조회
     */
    async getDepts(): Promise<Department[]> {
        return this.get<Department[]>('');
    }
}

export const deptAdminService = new DeptAdminService();