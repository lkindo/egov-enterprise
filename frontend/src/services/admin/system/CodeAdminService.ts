import { AdminService } from '@/services/core/ApiService';
import { CmmnClCode, CmmnCode, CmmnDetailCode, SearchParams, PaginationResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

/**
 * ?⑤벏?삭굜遺얜굡 ?온????뺥돩??(Admin)
 */
class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // --- Classification Code (?브쑬履잒굜遺얜굡) ---
    async getClCodes(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/cl', { ...config, params });
        return response?.result || response;
    }

    async getClCode(clCode: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/cl/${clCode}`, config);
        return response?.result || response;
    }

    async createClCode(data: CmmnClCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/cl', data, config);
        return response?.result || response;
    }

    async updateClCode(clCode: string, data: CmmnClCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/cl/${clCode}`, data, config);
        return response?.result || response;
    }

    async deleteClCode(clCode: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/cl/${clCode}`, config);
        return response?.result || response;
    }

    // --- Common Code (?⑤벏?삭굜遺얜굡) ---
    async getGroups(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/cmmn', { ...config, params });
        return response?.result || response;
    }

    async getGroup(codeId: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/cmmn/${codeId}`, config);
        return response?.result || response;
    }

    async createGroup(data: CmmnCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/cmmn', data, config);
        return response?.result || response;
    }

    async updateGroup(codeId: string, data: CmmnCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/cmmn/${codeId}`, data, config);
        return response?.result || response;
    }

    async deleteGroup(codeId: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/cmmn/${codeId}`, config);
        return response?.result || response;
    }

    // --- Detail Code (?怨멸쉭?꾨뗀諭? ---
    async getDetails(params?: SearchParams, config?: AxiosRequestConfig) {
        const response = await this.get<any>('/detail', { ...config, params });
        return response?.result || response;
    }

    async getDetail(codeId: string, code: string, config?: AxiosRequestConfig) {
        const response = await this.get<any>(`/detail/${codeId}/${code}`, config);
        return response?.result || response;
    }

    async createDetail(data: CmmnDetailCode, config?: AxiosRequestConfig) {
        const response = await this.post<any>('/detail', data, config);
        return response?.result || response;
    }

    async updateDetail(codeId: string, code: string, data: CmmnDetailCode, config?: AxiosRequestConfig) {
        const response = await this.put<any>(`/detail/${codeId}/${code}`, data, config);
        return response?.result || response;
    }

    async deleteDetail(codeId: string, code: string, config?: AxiosRequestConfig) {
        const response = await this.delete<any>(`/detail/${codeId}/${code}`, config);
        return response?.result || response;
    }
}

export const codeAdminService = new CodeAdminService();
export interface CommonCodeDetail extends CmmnDetailCode { }
