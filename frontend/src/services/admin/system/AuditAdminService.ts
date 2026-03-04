import { AdminService } from '@/services/core/ApiService';

export interface AuditLog {
    histId: string;
    sysNm: string;
    histSeCode: string;
    histCn: string;
    frstRegisterId: string;
    frstRegisterPnttm: string;
}

class AuditAdminService extends AdminService {
    constructor() {
        super('/audit');
    }

    async getAuditLogs(params: { page?: number; size?: number; keyword?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }
}

export const auditAdminService = new AuditAdminService();