import client from '@/lib/api/client';

export interface AuditLog {
  histId: string;
  sysNm: string;
  histSeCode: string;
  histCn: string;
  frstRegisterId: string;
  frstRegisterPnttm: string;
}

export const auditService = {
  getAuditLogs: async (params: { page?: number; size?: number; keyword?: string }, config?: any) => {
    return client.get<any>('/admin/audit', { ...config, params });
  }
};
