import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, SysLog, UserLog, LoginLog, WebLog, PrivacyLog, TransferLog } from '@/types/system';

export const getSysLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<SysLog>>('/sym/log/lgm/SelectSysLogList.do', { params });
    return data;
};

export const getSysLog = async (requstId: string) => {
    const { data } = await client.get<SysLog>(`/sym/log/lgm/SelectSysLogDetail.do?requstId=${requstId}`);
    return data;
};

export const getUserLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<UserLog>>('/sym/log/ulg/SelectUserLogList.do', { params });
    return data;
};

export const getUserLog = async (userLogId: string) => {
    const { data } = await client.get<UserLog>(`/sym/log/ulg/SelectUserLogDetail.do?userLogId=${userLogId}`);
    return data;
};

// Login Log
export const getLoginLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<LoginLog>>('/sym/log/clg/SelectLoginLogList.do', { params });
    return data;
};

export const getLoginLog = async (logId: string) => {
    const { data } = await client.get<LoginLog>(`/sym/log/clg/SelectLoginLogDetail.do?logId=${logId}`);
    return data;
};

// Web Log
export const getWebLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<WebLog>>('/sym/log/wlg/SelectWebLogList.do', { params });
    return data;
};

export const getWebLog = async (webLogId: string) => {
    const { data } = await client.get<WebLog>(`/sym/log/wlg/SelectWebLogDetail.do?webLogId=${webLogId}`);
    return data;
};

// Privacy Log
export const getPrivacyLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<PrivacyLog>>('/sym/log/plg/SelectPrivacyLogList.do', { params });
    return data;
};

export const getPrivacyLog = async (logId: string) => {
    const { data } = await client.get<PrivacyLog>(`/sym/log/plg/SelectPrivacyLogDetail.do?logId=${logId}`);
    return data;
};

// Transfer Log
export const getTransferLogList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<TransferLog>>('/sym/log/tlg/SelectTrsmrcvLogList.do', { params });
    return data;
};

export const getTransferLog = async (logId: string) => {
    const { data } = await client.get<TransferLog>(`/sym/log/tlg/SelectTrsmrcvLogDetail.do?logId=${logId}`);
    return data;
};
