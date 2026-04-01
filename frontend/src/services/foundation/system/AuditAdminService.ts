import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface AuditLog {
 histId: string;
 sysNm: string;
 histSeCode: string;
 histCn: string;
 frstRegisterId: string;
 frstRegisterPnttm: string;
}

/**
 * 媛먯궗 濡쒓렇 愿由님쒕퉬님(Admin)
 */
class AuditAdminService extends AdminService {
  constructor() {
    super('/logs/system');
  }

 /**
 * 媛먯궗 濡쒓렇 紐⑸줉 조회
 */
 async getAuditLogs(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<AuditLog>> {
 return this.get<PageResponse<AuditLog>>('', { ...config, params });
 }
}

export const auditAdminService = new AuditAdminService();
