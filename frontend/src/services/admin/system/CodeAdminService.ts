import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/system';

class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // Classification Code
    async getClCodeList(params: SearchParams, config?: any): Promise<PaginationResponse<CmmnClCode>> {
        const res: any = await this.get('/cl', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    async getClCode(clCode: string, config?: any): Promise<CmmnClCode> {
        const res: any = await this.get(`/cl/${clCode}`, config);
        return res.data;
    }

    async createClCode(data: CmmnClCode, config?: any): Promise<void> {
        return this.post('/cl', data, config);
    }

    async updateClCode(data: CmmnClCode, config?: any): Promise<void> {
        return this.put(`/cl/${data.clCode}`, data, config);
    }

    async deleteClCode(clCode: string, config?: any): Promise<void> {
        return this.delete(`/cl/${clCode}`, config);
    }

    // Common Code (Group)
    async getCmmnCodeList(params: SearchParams, config?: any): Promise<PaginationResponse<CmmnCode>> {
        const res: any = await this.get('/cmmn', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    async getCmmnCode(codeId: string, config?: any): Promise<CmmnCode> {
        const res: any = await this.get(`/cmmn/${codeId}`, config);
        return res.data;
    }

    async createCmmnCode(data: CmmnCode, config?: any): Promise<void> {
        return this.post('/cmmn', data, config);
    }

    async updateCmmnCode(data: CmmnCode, config?: any): Promise<void> {
        return this.put(`/cmmn/${data.codeId}`, data, config);
    }

    async deleteCmmnCode(codeId: string, config?: any): Promise<void> {
        return this.delete(`/cmmn/${codeId}`, config);
    }

    // Detail Code
    async getDetailCodeList(params: SearchParams, config?: any): Promise<PaginationResponse<CmmnDetailCode>> {
        const res: any = await this.get('/detail', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    async getDetailCode(codeId: string, code: string, config?: any): Promise<CmmnDetailCode> {
        const res: any = await this.get(`/detail/${codeId}/${code}`, config);
        return res.data;
    }

    async createDetailCode(data: CmmnDetailCode, config?: any): Promise<void> {
        return this.post('/detail', data, config);
    }

    async updateDetailCode(data: CmmnDetailCode, config?: any): Promise<void> {
        return this.put(`/detail/${data.codeId}/${data.code}`, data, config);
    }

    async deleteDetailCode(codeId: string, code: string, config?: any): Promise<void> {
        return this.delete(`/detail/${codeId}/${code}`, config);
    }
}

export const codeAdminService = new CodeAdminService();
