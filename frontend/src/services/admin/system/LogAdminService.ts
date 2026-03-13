import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface LoginLog {
    logId: string;
    creatDt: string;
    loginMthd: string;
    loginId: string;
    loginNm: string;
    loginIp: string;
    errCo: number;
}

export interface SystemLog {
    requestId: string;
    jobSeCode: string;
    insttCode: string;
    occurrncDe: string;
    rqesterIp: string;
    rqesterId: string;
    trgetMenuNm: string;
    svcNm: string;
    methodNm: string;
    processSeCode: string;
    processTime: number;
    rspnsCode: string;
    errorSe: string;
    errorCo: number;
    errorMssage: string;
}

/**
 * 로그 관리 서비스 (Admin)
 */
class LogAdminService extends AdminService {
    constructor() {
        super('/logs');
    }

    /** 로그인 로그 목록 조회 */
    async getLoginLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<LoginLog>> {
        const response = await this.get<any>('/login', { ...config, params });
        return response?.result || response;
    }

    /** 로그인 로그 상세 조회 */
    async getLoginLog(id: string, config?: AxiosRequestConfig): Promise<LoginLog> {
        const response = await this.get<any>(`/login/${id}`, config);
        return response?.result || response;
    }

    /** 시스템 로그 목록 조회 */
    async getSystemLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<SystemLog>> {
        const response = await this.get<any>('/system', { ...config, params });
        return response?.result || response;
    }

    /** 시스템 로그 상세 조회 */
    async getSystemLog(id: string, config?: AxiosRequestConfig): Promise<SystemLog> {
        const response = await this.get<any>(`/system/${id}`, config);
        return response?.result || response;
    }
}

export const logAdminService = new LogAdminService();
