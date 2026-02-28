import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, SysLog, UserLog, LoginLog, WebLog, PrivacyLog, TransferLog } from '@/types/system';

// System Log
export const getSysLogList = async (params: SearchParams): Promise<PaginationResponse<SysLog>> => {
    const res: any = await client.get('/log/sys/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getSysLog = async (requstId: string): Promise<SysLog> =>
    client.get<SysLog>(`/log/sys/${requstId}`);

// Login Log
export const getLoginLogList = async (params: SearchParams): Promise<PaginationResponse<LoginLog>> => {
    const res: any = await client.get('/log/login/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getLoginLog = async (logId: string): Promise<LoginLog> =>
    client.get<LoginLog>(`/log/login/${logId}`);

// User Log
export const getUserLogList = async (params: SearchParams): Promise<PaginationResponse<UserLog>> => {
    const res: any = await client.get('/log/user/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

// Web Log
export const getWebLogList = async (params: SearchParams): Promise<PaginationResponse<WebLog>> => {
    const res: any = await client.get('/log/web/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

// Privacy Log
export const getPrivacyLogList = async (params: SearchParams): Promise<PaginationResponse<PrivacyLog>> => {
    const res: any = await client.get('/log/privacy/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

// Transfer Log
export const getTransferLogList = async (params: SearchParams): Promise<PaginationResponse<TransferLog>> => {
    const res: any = await client.get('/log/trans/list', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};
