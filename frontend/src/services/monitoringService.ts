import client from '@/lib/api/client';

export interface ServerResrceLog {
    logId?: string;
    serverId: string;
    serverEqpmnId: string;
    cpuUseRt: number;
    moryUseRt: number;
    svcSttus: string;
    logInfo?: string;
    creatDt: string;
    serverNm?: string;
}

export interface HttpMon {
    sysId: string;
    sysNm: string;
    siteUrl: string;
    webKind: string;
    httpSttusCd: string;
    creatDt: string;
    mngrNm?: string;
    mngrEmailAddr?: string;
}

export interface DbMntrng {
    dataSourcNm: string;
    serverNm: string;
    dbmsKind: string;
    dbmsVer: string;
    dbmsIp: string;
    dbmsPort: number;
    dbmsId: string;
    dbmsPw?: string;
    mntrngSttus: string;
    creatDt: string;
    mngrNm?: string;
    mngrEmailAddr?: string;
}

export interface FileSysMntrng {
    fileSysId: string;
    fileSysNm: string;
    fileSysManageNm: string;
    fileSysSize: number;
    fileSysThrhld: number;
    fileSysUsgQty: number;
    mntrngSttus: string;
    creatDt: string;
    mngrNm?: string;
    mngrEmailAddr?: string;
}

export interface ProcessMon {
    processNm: string;
    serverNm: string;
    procsSttus: string;
    creatDt: string;
    mngrNm?: string;
    mngrEmailAddr?: string;
    cpuUseRt?: number;
    moryUseRt?: number;
}

export interface NtwrkSvcMntrng {
    sysIp: string;
    sysPort: number;
    sysNm: string;
    mntrngSttus: string;
    creatDt: string;
    mngrNm?: string;
    mngrEmailAddr?: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

export const monitoringService = {
    getServerResourceLogs: async (params: { page?: number; size?: number; strServerNm?: string; startDt?: string; endDt?: string }, config?: any): Promise<PageResult<ServerResrceLog>> =>
        client.get<PageResult<ServerResrceLog>>('/admin/system/monitoring/logs', { ...config, params }),

    recordServerResource: async (serverId: string, serverEqpmnId: string, config?: any): Promise<void> =>
        client.post('/admin/system/monitoring/logs/record', null, { ...config, params: { serverId, serverEqpmnId } }),

    getHttpMonList: async (params: { page?: number; size?: number; mngrNm?: string; httpSttusCd?: string }, config?: any): Promise<PageResult<HttpMon>> =>
        client.get<PageResult<HttpMon>>('/admin/system/http-monitoring', { ...config, params }),

    createHttpMon: async (data: Partial<HttpMon>, config?: any): Promise<void> =>
        client.post('/admin/system/http-monitoring', data, config),

    checkHttpStatus: async (sysId: string, config?: any): Promise<void> =>
        client.post(`/admin/system/http-monitoring/${sysId}/check`, {}, config),

    deleteHttpMon: async (sysId: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/http-monitoring/${sysId}`, config),

    getDbMntrngList: async (params: { page?: number; size?: number; dataSourcNm?: string }, config?: any): Promise<PageResult<DbMntrng>> =>
        client.get<PageResult<DbMntrng>>('/admin/system/db-monitoring', { ...config, params }),

    createDbMntrng: async (data: Partial<DbMntrng>, config?: any): Promise<void> =>
        client.post('/admin/system/db-monitoring', data, config),

    checkDbStatus: async (dataSourcNm: string, config?: any): Promise<void> =>
        client.post(`/admin/system/db-monitoring/${dataSourcNm}/check`, {}, config),

    deleteDbMntrng: async (dataSourcNm: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/db-monitoring/${dataSourcNm}`, config),

    getFileSysMntrngList: async (params: { page?: number; size?: number; fileSysNm?: string }, config?: any): Promise<PageResult<FileSysMntrng>> =>
        client.get<PageResult<FileSysMntrng>>('/admin/system/filesys-monitoring', { ...config, params }),

    createFileSysMntrng: async (data: Partial<FileSysMntrng>, config?: any): Promise<void> =>
        client.post('/admin/system/filesys-monitoring', data, config),

    checkFileSysStatus: async (fileSysId: string, config?: any): Promise<void> =>
        client.post(`/admin/system/filesys-monitoring/${fileSysId}/check`, {}, config),

    deleteFileSysMntrng: async (fileSysId: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/filesys-monitoring/${fileSysId}`, config),

    getProcessMonList: async (params: { page?: number; size?: number; processNm?: string; procsSttus?: string }, config?: any): Promise<PageResult<ProcessMon>> =>
        client.get<PageResult<ProcessMon>>('/admin/system/process-monitoring', { ...config, params }),

    createProcessMon: async (data: Partial<ProcessMon>, config?: any): Promise<void> =>
        client.post('/admin/system/process-monitoring', data, config),

    checkProcessStatus: async (processNm: string, config?: any): Promise<void> =>
        client.post(`/admin/system/process-monitoring/${processNm}/check`, {}, config),

    deleteProcessMon: async (processNm: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/process-monitoring/${processNm}`, config),

    getNtwrkSvcMntrngList: async (params: { page?: number; size?: number; sysNm?: string }, config?: any): Promise<PageResult<NtwrkSvcMntrng>> =>
        client.get<PageResult<NtwrkSvcMntrng>>('/admin/system/ntwrksvc-monitoring', { ...config, params }),

    createNtwrkSvcMntrng: async (data: Partial<NtwrkSvcMntrng>, config?: any): Promise<void> =>
        client.post('/admin/system/ntwrksvc-monitoring', data, config),

    checkNtwrkSvcStatus: async (sysIp: string, sysPort: number, config?: any): Promise<void> =>
        client.post('/admin/system/ntwrksvc-monitoring/check', null, { ...config, params: { sysIp, sysPort } }),

    deleteNtwrkSvcMntrng: async (sysIp: string, sysPort: number, config?: any): Promise<void> =>
        client.delete('/admin/system/ntwrksvc-monitoring', { ...config, params: { sysIp, sysPort } }),
};
