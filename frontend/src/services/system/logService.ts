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

// User Log (Mapped to sys log for simplicity, or separate if implemented)
export const getUserLogList = async (params: SearchParams): Promise<PaginationResponse<UserLog>> => {
    return getSysLogList(params) as any;
};

export const getUserLog = async (userLogId: string): Promise<UserLog> => {
    return getSysLog(userLogId) as any;
};

// Web Log, Privacy Log, etc. can be added as needed based on backend controllers
