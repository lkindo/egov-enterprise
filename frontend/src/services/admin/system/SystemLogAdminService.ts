import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams, SysLog, LoginLog, UserLog, WebLog, PrivacyLog, TransferLog } from '@/types/system';

class SystemLogAdminService extends AdminService {
    constructor() {
        super('/log');
    }

    /**
     * ??뽯뮞??嚥≪뮄??筌뤴뫖以?鈺곌퀬??
     */
    async getSystemLogs(params: SearchParams, config?: any): Promise<PaginationResponse<SysLog>> {
        const res: any = await this.get('/sys/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * ??뽯뮞??嚥≪뮄???怨멸쉭 鈺곌퀬??
     */
    async getSystemLog(requstId: string, config?: any): Promise<SysLog> {
        return this.get<SysLog>(`/sys/${requstId}`, config);
    }

    /**
     * 嚥≪뮄???嚥≪뮄??筌뤴뫖以?鈺곌퀬??
     */
    async getLoginLogs(params: SearchParams, config?: any): Promise<PaginationResponse<LoginLog>> {
        const res: any = await this.get('/login/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 嚥≪뮄???嚥≪뮄???怨멸쉭 鈺곌퀬??
     */
    async getLoginLog(logId: string, config?: any): Promise<LoginLog> {
        return this.get<LoginLog>(`/login/${logId}`, config);
    }

    /**
     * ?????嚥≪뮄??筌뤴뫖以?鈺곌퀬??
     */
    async getUserLogs(params: SearchParams, config?: any): Promise<PaginationResponse<UserLog>> {
        const res: any = await this.get('/user/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * ??嚥≪뮄??筌뤴뫖以?鈺곌퀬??
     */
    async getWebLogs(params: SearchParams, config?: any): Promise<PaginationResponse<WebLog>> {
        const res: any = await this.get('/web/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * 揶쏆뮇??類ｋ궖 鈺곌퀬??嚥≪뮄??筌뤴뫖以?鈺곌퀬??
     */
    async getPrivacyLogs(params: SearchParams, config?: any): Promise<PaginationResponse<PrivacyLog>> {
        const res: any = await this.get('/privacy/list', { ...config, params });
        return {
            resultList: res.list || [],
            paginationInfo: res.paginationInfo || { totalRecordCount: 0 }
        };
    }

    /**
     * ??る땾??嚥≪뮄??筌뤴뫖以?鈺곌퀬??
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
