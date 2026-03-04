import { AdminService } from '@/services/core/ApiService';

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

class MonitoringAdminService extends AdminService {
    constructor() {
        super('/monitoring'); // Will map to /admin/system/monitoring
    }

    async getServerResourceLogs(params: { page?: number; size?: number; strServerNm?: string; startDt?: string; endDt?: string }, config?: any): Promise<PageResult<ServerResrceLog>> {
        return this.get<PageResult<ServerResrceLog>>('/logs', { ...config, params });
    }

    async recordServerResource(serverId: string, serverEqpmnId: string, config?: any): Promise<void> {
        return this.post('/logs/record', null, { ...config, params: { serverId, serverEqpmnId } });
    }

    // HTTP Monitoring
    async getHttpMonList(params: { page?: number; size?: number; mngrNm?: string; httpSttusCd?: string }, config?: any): Promise<PageResult<HttpMon>> {
        // Base AdminService might prepend /admin/system/monitoring
        // monitoringService used /admin/system/http-monitoring
        // So we might need to adjust base path or use direct client for these
        return this.client.get<PageResult<HttpMon>>('/admin/system/http-monitoring', { ...config, params });
    }

    async createHttpMon(data: Partial<HttpMon>, config?: any): Promise<void> {
        return this.client.post('/admin/system/http-monitoring', data, config);
    }

    async checkHttpStatus(sysId: string, config?: any): Promise<void> {
        return this.client.post(`/admin/system/http-monitoring/${sysId}/check`, {}, config);
    }

    async deleteHttpMon(sysId: string, config?: any): Promise<void> {
        return this.client.delete(`/admin/system/http-monitoring/${sysId}`, config);
    }

    // DB Monitoring
    async getDbMntrngList(params: { page?: number; size?: number; dataSourcNm?: string }, config?: any): Promise<PageResult<DbMntrng>> {
        return this.client.get<PageResult<DbMntrng>>('/admin/system/db-monitoring', { ...config, params });
    }

    async createDbMntrng(data: Partial<DbMntrng>, config?: any): Promise<void> {
        return this.client.post('/admin/system/db-monitoring', data, config);
    }

    async checkDbStatus(dataSourcNm: string, config?: any): Promise<void> {
        return this.client.post(`/admin/system/db-monitoring/${dataSourcNm}/check`, {}, config);
    }

    async deleteDbMntrng(dataSourcNm: string, config?: any): Promise<void> {
        return this.client.delete(`/admin/system/db-monitoring/${dataSourcNm}`, config);
    }

    // File System Monitoring
    async getFileSysMntrngList(params: { page?: number; size?: number; fileSysNm?: string }, config?: any): Promise<PageResult<FileSysMntrng>> {
        return this.client.get<PageResult<FileSysMntrng>>('/admin/system/filesys-monitoring', { ...config, params });
    }

    async createFileSysMntrng(data: Partial<FileSysMntrng>, config?: any): Promise<void> {
        return this.client.post('/admin/system/filesys-monitoring', data, config);
    }

    async checkFileSysStatus(fileSysId: string, config?: any): Promise<void> {
        return this.client.post(`/admin/system/filesys-monitoring/${fileSysId}/check`, {}, config);
    }

    async deleteFileSysMntrng(fileSysId: string, config?: any): Promise<void> {
        return this.client.delete(`/admin/system/filesys-monitoring/${fileSysId}`, config);
    }

    // Process Monitoring
    async getProcessMonList(params: { page?: number; size?: number; processNm?: string; procsSttus?: string }, config?: any): Promise<PageResult<ProcessMon>> {
        return this.client.get<PageResult<ProcessMon>>('/admin/system/process-monitoring', { ...config, params });
    }

    async createProcessMon(data: Partial<ProcessMon>, config?: any): Promise<void> {
        return this.client.post('/admin/system/process-monitoring', data, config);
    }

    async checkProcessStatus(processNm: string, config?: any): Promise<void> {
        return this.client.post(`/admin/system/process-monitoring/${processNm}/check`, {}, config);
    }

    async deleteProcessMon(processNm: string, config?: any): Promise<void> {
        return this.client.delete(`/admin/system/process-monitoring/${processNm}`, config);
    }

    // Network Service Monitoring
    async getNtwrkSvcMntrngList(params: { page?: number; size?: number; sysNm?: string }, config?: any): Promise<PageResult<NtwrkSvcMntrng>> {
        return this.client.get<PageResult<NtwrkSvcMntrng>>('/admin/system/ntwrksvc-monitoring', { ...config, params });
    }

    async createNtwrkSvcMntrng(data: Partial<NtwrkSvcMntrng>, config?: any): Promise<void> {
        return this.client.post('/admin/system/ntwrksvc-monitoring', data, config);
    }

    async checkNtwrkSvcStatus(sysIp: string, sysPort: number, config?: any): Promise<void> {
        return this.client.post('/admin/system/ntwrksvc-monitoring/check', null, { ...config, params: { sysIp, sysPort } });
    }

    async deleteNtwrkSvcMntrng(sysIp: string, sysPort: number, config?: any): Promise<void> {
        return this.client.delete('/admin/system/ntwrksvc-monitoring', { ...config, params: { sysIp, sysPort } });
    }
}

export const monitoringAdminService = new MonitoringAdminService();