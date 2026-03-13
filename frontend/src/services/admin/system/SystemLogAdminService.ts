import { AdminService } from '@/services/core/ApiService';

export interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    page: number;
}

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

class SystemLogAdminService extends AdminService {
    constructor() {
        super('/logs');
    }

    /**
     * 시스템 로그 목록 조회
     */
    async getSystemLogs(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<SysLog>> {
        return this.get<PageResult<SysLog>>('/system', {
            params: {
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        });
    }

    /**
     * 시스템 로그 상세 조회
     */
    async getSystemLog(requstId: string): Promise<SysLog> {
        return this.get<SysLog>(`/system/${requstId}`);
    }

    /**
     * 로그인 로그 목록 조회
     */
    async getLoginLogs(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<LoginLog>> {
        return this.get<PageResult<LoginLog>>('/login', {
            params: {
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        });
    }

    /**
     * 로그인 로그 상세 조회
     */
    async getLoginLog(logId: string): Promise<LoginLog> {
        return this.get<LoginLog>(`/login/${logId}`);
    }
}

export const systemLogAdminService = new SystemLogAdminService();
