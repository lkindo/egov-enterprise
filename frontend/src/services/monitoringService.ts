import client from '@/lib/api/client';

// 1. Server Resource Monitoring
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

// 2. HTTP Monitoring
export interface HttpMon {
  sysId: string;
  sysNm: string;
  siteUrl: string;
  webKind: string; // e.g., 'HOMEPAGE'
  httpSttusCd: string;
  creatDt: string;
  mngrNm?: string;
  mngrEmailAddr?: string;
}

// 3. DB Monitoring
export interface DbMntrng {
  dataSourcNm: string;
  serverNm: string;
  dbmsKind: string;
  dbmsVer: string;
  dbmsIp: string;
  dbmsPort: number;
  dbmsId: string;
  dbmsPw?: string;
  mntrngSttus: string; // ?곹깭
  creatDt: string;
  mngrNm?: string;
  mngrEmailAddr?: string;
}

// 4. File System Monitoring
export interface FileSysMntrng {
  fileSysId: string;
  fileSysNm: string;
  fileSysManageNm: string;
  fileSysSize: number;
  fileSysThrhld: number; // ?꾧퀎移?
  fileSysUsgQty: number; // ?ъ슜??
  mntrngSttus: string;
  creatDt: string;
  mngrNm?: string;
  mngrEmailAddr?: string;
}

// 5. Process Monitoring
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

// 6. Network Service Monitoring
export interface NtwrkSvcMntrng {
  sysIp: string;
  sysPort: number;
  sysNm: string;
  mntrngSttus: string;
  creatDt: string;
  mngrNm?: string;
  mngrEmailAddr?: string;
}

export const monitoringService = {
  // 1. Server Resource
  getServerResourceLogs: async (params: { page?: number; size?: number; strServerNm?: string; startDt?: string; endDt?: string }) => {
    const response = await client.get('/admin/system/monitoring/logs', { params });
    return response;
  },
  recordServerResource: async (serverId: string, serverEqpmnId: string) => {
    const response = await client.post('/admin/system/monitoring/logs/record', null, { 
      params: { serverId, serverEqpmnId } 
    });
    return response;
  },

  // 2. HTTP Monitor
  getHttpMonList: async (params: { page?: number; size?: number; mngrNm?: string; httpSttusCd?: string }) => {
    const response = await client.get('/admin/system/http-monitoring', { params });
    return response;
  },
  createHttpMon: async (data: Partial<HttpMon>) => {
    const response = await client.post('/admin/system/http-monitoring', data);
    return response;
  },
  checkHttpStatus: async (sysId: string) => {
    const response = await client.post(`/admin/system/http-monitoring/${sysId}/check`);
    return response;
  },
  deleteHttpMon: async (sysId: string) => {
    const response = await client.delete(`/admin/system/http-monitoring/${sysId}`);
    return response;
  },

  // 3. DB Monitor
  getDbMntrngList: async (params: { page?: number; size?: number; dataSourcNm?: string }) => {
    const response = await client.get('/admin/system/db-monitoring', { params });
    return response;
  },
  createDbMntrng: async (data: Partial<DbMntrng>) => {
    const response = await client.post('/admin/system/db-monitoring', data);
    return response;
  },
  checkDbStatus: async (dataSourcNm: string) => {
    const response = await client.post(`/admin/system/db-monitoring/${dataSourcNm}/check`);
    return response;
  },
  deleteDbMntrng: async (dataSourcNm: string) => {
    const response = await client.delete(`/admin/system/db-monitoring/${dataSourcNm}`);
    return response;
  },

  // 4. File System Monitor
  getFileSysMntrngList: async (params: { page?: number; size?: number; fileSysNm?: string }) => {
    const response = await client.get('/admin/system/filesys-monitoring', { params });
    return response;
  },
  createFileSysMntrng: async (data: Partial<FileSysMntrng>) => {
    const response = await client.post('/admin/system/filesys-monitoring', data);
    return response;
  },
  checkFileSysStatus: async (fileSysId: string) => {
    const response = await client.post(`/admin/system/filesys-monitoring/${fileSysId}/check`);
    return response;
  },
  deleteFileSysMntrng: async (fileSysId: string) => {
    const response = await client.delete(`/admin/system/filesys-monitoring/${fileSysId}`);
    return response;
  },

  // 5. Process Monitor
  getProcessMonList: async (params: { page?: number; size?: number; processNm?: string; procsSttus?: string }) => {
    const response = await client.get('/admin/system/process-monitoring', { params });
    return response;
  },
  createProcessMon: async (data: Partial<ProcessMon>) => {
    const response = await client.post('/admin/system/process-monitoring', data);
    return response;
  },
  checkProcessStatus: async (processNm: string) => {
    const response = await client.post(`/admin/system/process-monitoring/${processNm}/check`);
    return response;
  },
  deleteProcessMon: async (processNm: string) => {
    const response = await client.delete(`/admin/system/process-monitoring/${processNm}`);
    return response;
  },

  // 6. Network Service Monitor
  getNtwrkSvcMntrngList: async (params: { page?: number; size?: number; sysNm?: string }) => {
    const response = await client.get('/admin/system/ntwrksvc-monitoring', { params });
    return response;
  },
  createNtwrkSvcMntrng: async (data: Partial<NtwrkSvcMntrng>) => {
    const response = await client.post('/admin/system/ntwrksvc-monitoring', data);
    return response;
  },
  checkNtwrkSvcStatus: async (sysIp: string, sysPort: number) => {
    const response = await client.post('/admin/system/ntwrksvc-monitoring/check', null, {
      params: { sysIp, sysPort }
    });
    return response;
  },
  deleteNtwrkSvcMntrng: async (sysIp: string, sysPort: number) => {
    const response = await client.delete('/admin/system/ntwrksvc-monitoring', {
      params: { sysIp, sysPort }
    });
    return response;
  }
};

