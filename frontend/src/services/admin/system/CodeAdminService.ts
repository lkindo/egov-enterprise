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
    administZoneSe: string;
    upperAdministZoneCode: string;
    useAt: string;
}

export interface InstitutionCode {
    insttCode: string;
    allInsttNm: string;
    lowestInsttNm?: string;
    insttAbrvNm?: string;
    odr?: string;
    ord?: string;
    insttOdr?: string;
    bestInsttCode?: string;
    upperInsttCode?: string;
    reprsntInsttCode?: string;
    insttTyLclas?: string;
    insttTyMclas?: string;
    insttTySclas?: string;
    telno?: string;
    fxnum?: string;
    creatDe?: string;
    ablDe?: string;
    ablEnnc?: string;
}

export interface InstitutionCodeRecptn {
    occrrncDe: string;
    insttCode: string;
    opertSn: number;
    changeSeCode: string;
    processSe: string;
    etcCode: string;
    allInsttNm: string;
    lowestInsttNm: string;
    telno: string;
    fxnum: string;
    creatDe: string;
    ablDe: string;
    ablEnnc: string;
    frstRegistPnttm: string;
    frstRegisterId: string;
}

/**
 * 코드 관리 서비스 (Admin)
 */
class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // --- 분류코드 (Classification Code) ---
    async getClCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnClCode>> {
        const response = await this.get<any>('/cl', { ...config, params });
        return response?.result || response;
    }

    async getClCode(clCode: string, config?: AxiosRequestConfig): Promise<CmmnClCode> {
        const response = await this.get<any>(`/cl/${clCode}`, config);
        return response?.result || response;
    }

    async createClCode(data: CmmnClCode, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/cl', data, config);
    }

    async updateClCode(clCode: string, data: CmmnClCode, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/cl/${clCode}`, data, config);
    }

    async deleteClCode(clCode: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/cl/${clCode}`, config);
    }

    // --- 공통코드 (Common Code) ---
    async getCmmnCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnCode>> {
        const response = await this.get<any>('/cmmn', { ...config, params });
        return response?.result || response;
    }

    async getCmmnCode(codeId: string, config?: AxiosRequestConfig): Promise<CmmnCode> {
        const response = await this.get<any>(`/cmmn/${codeId}`, config);
        return response?.result || response;
    }

    async createCmmnCode(data: CmmnCode, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/cmmn', data, config);
    }

    async updateCmmnCode(codeId: string, data: CmmnCode, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/cmmn/${codeId}`, data, config);
    }

    async deleteCmmnCode(codeId: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/cmmn/${codeId}`, config);
    }

    // --- 상세코드 (Detail Code) ---
    async getDetailCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<CmmnDetailCode>> {
        const response = await this.get<any>('/detail', { ...config, params });
        return response?.result || response;
    }

    async getDetailCode(codeId: string, code: string, config?: AxiosRequestConfig): Promise<CmmnDetailCode> {
        const response = await this.get<any>(`/detail/${codeId}/${code}`, config);
        return response?.result || response;
    }

    async createDetailCode(data: CmmnDetailCode, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/detail', data, config);
    }

    async updateDetailCode(codeId: string, code: string, data: CmmnDetailCode, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/detail/${codeId}/${code}`, data, config);
    }

    async deleteDetailCode(codeId: string, code: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/detail/${codeId}/${code}`, config);
    }

    // --- 행정코드 (Administrative Code) ---
    async getAdministCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<AdministCode>> {
        const response = await this.get<any>('/administ', { ...config, params });
        return response?.result || response;
    }

    async getAdministCodeDetail(administZoneCode: string, config?: AxiosRequestConfig): Promise<AdministCode> {
        const response = await this.get<any>(`/administ/${administZoneCode}`, config);
        return response?.result || response;
    }

    async createAdministCode(data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/administ', data, config);
    }

    async updateAdministCode(administZoneCode: string, data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/administ/${administZoneCode}`, data, config);
    }

    async deleteAdministCode(administZoneCode: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/administ/${administZoneCode}`, config);
    }

    // --- 기관코드 (Institution Code) ---
    async getInstitutionCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<InstitutionCode>> {
        const response = await this.get<any>('/institution', { ...config, params });
        return response?.result || response;
    }

    /** 기관코드 수신 내역 조회 */
    async getInstitutionCodeRecptnList(params?: SearchParams & { processSe?: string }, config?: AxiosRequestConfig): Promise<PaginationResponse<InstitutionCodeRecptn>> {
        const response = await this.get<any>('/institution/receptions', { ...config, params });
        return response?.result || response;
    }

    /** 기관코드 수신 처리 */
    async processInstitutionCodeRecptn(params: { occrrncDe: string, insttCode: string, opertSn: number }, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/institution/receptions/process', null, { ...config, params });
    }
}

export const codeAdminService = new CodeAdminService();
