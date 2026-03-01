import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams, SysLog, LoginLog, UserLog, WebLog, PrivacyLog, TransferLog } from '@/types/system';

class SystemLogAdminService extends AdminService {
    constructor() {
        super('/log');
    }

    /**
     * 시스템 로그 목록 조회
     */
    async getSystemLogs(params: SearchParams, config?: any): Promise<PaginationResponse<SysLog>> {
        const res: any = await this.get('/sys/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 시스템 로그 상세 조회
     */
    async getSystemLog(requstId: string, config?: any): Promise<SysLog> {
        return this.get<SysLog>(`/sys/${requstId}`, config);
    }

    /**
     * 로그인 로그 목록 조회
     */
    async getLoginLogs(params: SearchParams, config?: any): Promise<PaginationResponse<LoginLog>> {
        const res: any = await this.get('/login/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 로그인 로그 상세 조회
     */
    async getLoginLog(logId: string, config?: any): Promise<LoginLog> {
        return this.get<LoginLog>(`/login/${logId}`, config);
    }

    /**
     * 사용자 로그 목록 조회
     */
    async getUserLogs(params: SearchParams, config?: any): Promise<PaginationResponse<UserLog>> {
        const res: any = await this.get('/user/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 웹 로그 목록 조회
     */
    async getWebLogs(params: SearchParams, config?: any): Promise<PaginationResponse<WebLog>> {
        const res: any = await this.get('/web/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 개인정보 조회 로그 목록 조회
     */
    async getPrivacyLogs(params: SearchParams, config?: any): Promise<PaginationResponse<PrivacyLog>> {
        const res: any = await this.get('/privacy/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 송수신 로그 목록 조회
     */
    async getTransferLogs(params: SearchParams, config?: any): Promise<PaginationResponse<TransferLog>> {
        const res: any = await this.get('/trans/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }
}

export const systemLogAdminService = new SystemLogAdminService();
