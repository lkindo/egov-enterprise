import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface SysLog {
    requstId: string;
    occcrrncDe: string;
    srvcNm: string;
    methodNm: string;
    processSeCode: string;
    processSeCodeNm: string;
    processTime: string;
    rqesterIp: string;
    rqesterId: string;
    rqsterNm: string;
    trgetMenuNm?: string;
}

export interface LoginLog {
    logId: string;
    creatDt: string;
    loginMthd: string;
    loginIp: string;
    loginId: string;
    loginNm: string;
}

/**
 * 시스템 로그 관리 서비스 (Admin)
 */
class SystemLogAdminService extends AdminService {
    constructor() {
        super('/logs');
    }

    /**
     * 시스템 로그 목록 조회
     */
    async getSystemLogs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<SysLog>> {
        return this.get<PageResponse<SysLog>>('/system', {
            ...config,
            params: {
                ...params,
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        });
    }

    /**
     * 시스템 로그 상세 조회
     */
    async getSystemLog(requstId: string, config?: AxiosRequestConfig): Promise<SysLog> {
        return this.get<SysLog>(`/system/${requstId}`, config);
    }

    /**
     * 로그인 로그 목록 조회
     */
    async getLoginLogs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
        return this.get<PageResponse<LoginLog>>('/login', {
            ...config,
            params: {
                ...params,
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        });
    }

    /**
     * 로그인 로그 상세 조회
     */
    async getLoginLog(logId: string, config?: AxiosRequestConfig): Promise<LoginLog> {
        return this.get<LoginLog>(`/login/${logId}`, config);
    }
}

export const systemLogAdminService = new SystemLogAdminService();
