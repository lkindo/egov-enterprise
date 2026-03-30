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
 * 감사 로그 관리 서비스 (Admin)
 */
class AuditAdminService extends AdminService {
  constructor() {
    super('/logs/system');
  }

 /**
 * 감사 로그 목록 조회
 */
 async getAuditLogs(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<AuditLog>> {
 return this.get<PageResponse<AuditLog>>('', { ...config, params });
 }
}

export const auditAdminService = new AuditAdminService();
