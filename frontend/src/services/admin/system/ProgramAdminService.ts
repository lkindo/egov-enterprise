import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams, ProgrmManage } from '@/types/system';

class ProgramAdminService extends AdminService {
    constructor() {
        super('/programs');
    }

    /**
     * 프로그램 리스트 조회
     */
    async getProgramList(params: SearchParams, config?: any): Promise<PaginationResponse<ProgrmManage>> {
        return this.get<PaginationResponse<ProgrmManage>>('', { ...config, params });
    }

    /**
     * 프로그램 상세 조회
     */
    async getProgram(progrmFileNm: string, config?: any): Promise<ProgrmManage> {
        return this.get<ProgrmManage>(`/${progrmFileNm}`, config);
    }

    /**
     * 프로그램 등록
     */
    async createProgram(program: ProgrmManage, config?: any): Promise<void> {
        return this.post('', program, config);
    }

    /**
     * 프로그램 수정
     */
    async updateProgram(id: string, data: Partial<ProgrmManage>, config?: any): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    /**
     * 프로그램 삭제
     */
    async deleteProgram(progrmFileNm: string, config?: any): Promise<void> {
        return this.delete(`/${progrmFileNm}`, config);
    }

    // legacy helpers or batch operations
    async getPrograms(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }
}

export const programAdminService = new ProgramAdminService();
