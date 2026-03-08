import { AdminService } from '@/services/core/ApiService';
import { CmmnClCode, CmmnCode, CmmnDetailCode, SearchParams, PaginationResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

/**
 * 공통코드 관리 서비스 (Admin)
 */
class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // --- Classification Code (분류코드) ---
    async getClCodes(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/cl', { ...config, params });
        return response?.result;
    }

    async getClCode(clCode: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/cl/${clCode}`, config);
        return response?.result;
    }

    async createClCode(data: CmmnClCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/cl', data, config);
        return response?.result;
    }

    async updateClCode(clCode: string, data: CmmnClCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/cl/${clCode}`, data, config);
        return response?.result;
    }

    async deleteClCode(clCode: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/cl/${clCode}`, config);
        return response?.result;
    }

    // --- Common Code (공통코드) ---
    async getGroups(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/cmmn', { ...config, params });
        return response?.result;
    }

    async getGroup(codeId: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/cmmn/${codeId}`, config);
        return response?.result;
    }

    async createGroup(data: CmmnCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/cmmn', data, config);
        return response?.result;
    }

    async updateGroup(codeId: string, data: CmmnCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/cmmn/${codeId}`, data, config);
        return response?.result;
    }

    async deleteGroup(codeId: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/cmmn/${codeId}`, config);
        return response?.result;
    }

    // --- Detail Code (상세코드) ---
    async getDetails(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/detail', { ...config, params });
        return response?.result;
    }

    async getDetail(codeId: string, code: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/detail/${codeId}/${code}`, config);
        return response?.result;
    }

    async createDetail(data: CmmnDetailCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/detail', data, config);
        return response?.result;
    }

    async updateDetail(codeId: string, code: string, data: CmmnDetailCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/detail/${codeId}/${code}`, data, config);
        return response?.result;
    }

    async deleteDetail(codeId: string, code: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/detail/${codeId}/${code}`, config);
        return response?.result;
    }
}

export const codeAdminService = new CodeAdminService();
export interface CommonCodeDetail extends CmmnDetailCode { }
