import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface CmmnClCode {
    clCode: string;
    clCodeNm: string;
    clCodeDc: string;
    useAt: string;
}

export interface CmmnCode {
    codeId: string;
    codeIdNm: string;
    codeIdDc: string;
    useAt: string;
    clCode: string;
}

export interface CmmnDetailCode {
    codeId: string;
    code: string;
    codeNm: string;
    codeDc: string;
    useAt: string;
}

export interface AdministCode {
    administZoneCode: string;
    administZoneNm: string;
    useAt: string;
}

export interface InstitutionCode {
    insttCode: string;
    allInsttNm: string;
    useAt: string;
}

/**
 * 코드 관리 서비스 (Admin)
 */
class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // --- 분류코드 ---
    async getClCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnClCode>> {
        const response = await this.get<any>('/cl', { ...config, params });
        return response?.result || response;
    }

    async getClCode(clCode: string, config?: AxiosRequestConfig): Promise<CmmnClCode> {
        const response = await this.get<any>(`/cl/${clCode}`, config);
        return response?.result || response;
    }

    // --- 공통코드 ---
    async getCmmnCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnCode>> {
        const response = await this.get<any>('/cmmn', { ...config, params });
        return response?.result || response;
    }

    async getCmmnCode(codeId: string, config?: AxiosRequestConfig): Promise<CmmnCode> {
        const response = await this.get<any>(`/cmmn/${codeId}`, config);
        return response?.result || response;
    }

    // --- 상세코드 ---
    async getDetailCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnDetailCode>> {
        const response = await this.get<any>('/detail', { ...config, params });
        return response?.result || response;
    }

    // --- 행정코드 ---
    async getAdministCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<AdministCode>> {
        const response = await this.get<any>('/administ', { ...config, params });
        return response?.result || response;
    }

    // --- 기관코드 ---
    async getInstitutionCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<InstitutionCode>> {
        const response = await this.get<any>('/institution', { ...config, params });
        return response?.result || response;
    }
}

export const codeAdminService = new CodeAdminService();
