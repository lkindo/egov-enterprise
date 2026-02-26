import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, SysLog, UserLog, LoginLog, WebLog, PrivacyLog, TransferLog } from '@/types/system';

export const getSysLogList = async (params: SearchParams): Promise<PaginationResponse<SysLog>> =>
    client.get<PaginationResponse<SysLog>>('/sym/log/lgm/SelectSysLogList.do', { params });

export const getSysLog = async (requstId: string): Promise<SysLog> =>
    client.get<SysLog>(`/sym/log/lgm/SelectSysLogDetail.do?requstId=${requstId}`);

export const getUserLogList = async (params: SearchParams): Promise<PaginationResponse<UserLog>> =>
    client.get<PaginationResponse<UserLog>>('/sym/log/ulg/SelectUserLogList.do', { params });

export const getUserLog = async (userLogId: string): Promise<UserLog> =>
    client.get<UserLog>(`/sym/log/ulg/SelectUserLogDetail.do?userLogId=${userLogId}`);

export const getLoginLogList = async (params: SearchParams): Promise<PaginationResponse<LoginLog>> =>
    client.get<PaginationResponse<LoginLog>>('/sym/log/clg/SelectLoginLogList.do', { params });

export const getLoginLog = async (logId: string): Promise<LoginLog> =>
    client.get<LoginLog>(`/sym/log/clg/SelectLoginLogDetail.do?logId=${logId}`);

export const getWebLogList = async (params: SearchParams): Promise<PaginationResponse<WebLog>> =>
    client.get<PaginationResponse<WebLog>>('/sym/log/wlg/SelectWebLogList.do', { params });

export const getWebLog = async (webLogId: string): Promise<WebLog> =>
    client.get<WebLog>(`/sym/log/wlg/SelectWebLogDetail.do?webLogId=${webLogId}`);

export const getPrivacyLogList = async (params: SearchParams): Promise<PaginationResponse<PrivacyLog>> =>
    client.get<PaginationResponse<PrivacyLog>>('/sym/log/plg/SelectPrivacyLogList.do', { params });

export const getPrivacyLog = async (logId: string): Promise<PrivacyLog> =>
    client.get<PrivacyLog>(`/sym/log/plg/SelectPrivacyLogDetail.do?logId=${logId}`);

export const getTransferLogList = async (params: SearchParams): Promise<PaginationResponse<TransferLog>> =>
    client.get<PaginationResponse<TransferLog>>('/sym/log/tlg/SelectTrsmrcvLogList.do', { params });

export const getTransferLog = async (logId: string): Promise<TransferLog> =>
    client.get<TransferLog>(`/sym/log/tlg/SelectTrsmrcvLogDetail.do?logId=${logId}`);
