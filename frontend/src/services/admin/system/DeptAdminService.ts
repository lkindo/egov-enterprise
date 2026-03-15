import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';

export interface Department {
    orgnztId: string;
    orgnztNm: string;
    orgnztDc?: string;
}

/**
 * 부서 관리 서비스 (Admin)
 */
class DeptAdminService extends AdminService {
    constructor() {
        super('/departments');
    }

    /** 부서 목록 조회 */
    async getDeptList(params?: SearchParams, config?: any): Promise<PageResponse<Department>> {
        return this.get<PageResponse<Department>>('', { ...config, params });
    }

    /** 부서 상세 조회 */
    async getDept(deptId: string, config?: any): Promise<Department> {
        return this.get<Department>(`/${deptId}`, config);
    }

    /** 부서 등록 */
    async createDept(data: Partial<Department>, config?: any): Promise<void> {
        return this.post<void>('', data, config);
    }

    /** 부서 수정 */
    async updateDept(deptId: string, data: Partial<Department>, config?: any): Promise<void> {
        return this.put<void>(`/${deptId}`, data, config);
    }

    /** 부서 삭제 */
    async deleteDept(deptId: string, config?: any): Promise<void> {
        return this.delete<void>(`/${deptId}`, config);
    }
}

export const deptAdminService = new DeptAdminService();
