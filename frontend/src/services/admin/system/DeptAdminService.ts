import { AdminService } from '@/services/core/ApiService';

export interface DeptAuthorBatchRequest {
    deptId: string;
    authorCode: string;
    allMembers: boolean;
    userIds?: string[];
}

export interface DeptAuthorProjection {
    deptCode: string;
    deptNm: string;
    userId: string;
    userNm: string;
    authorCode: string;
    uniqId: string;
    regYn: string;
}

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
        const response = await this.get<any>('');
        return response?.result || response;
    }

    /**
     * 특정 부서의 사용자별 권한 목록 조회
     */
    async getDeptAuthorities(deptId: string): Promise<DeptAuthorProjection[]> {
        // security 관련 API는 별도 경로이므로 basePath 무시
        const response = await this.client.get<any>(`admin/security/dept-authorities/${deptId}`);
        return response?.result || response;
    }

    /**
     * 부서 권한 일괄 설정
     */
    async updateDeptAuthorities(data: DeptAuthorBatchRequest): Promise<void> {
        const response = await this.client.post<any>(`admin/security/dept-authorities/batch`, data);
        return response?.result || response;
    }
}

export const deptAdminService = new DeptAdminService();
