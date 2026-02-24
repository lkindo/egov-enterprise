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
  /**
   * 媛먯궗 濡쒓렇 紐⑸줉 議고쉶 (Admin)
   */
  getAuditLogs: async (params: { page?: number; size?: number; keyword?: string }) => {
    const response = await client.get('/admin/audit', { params });
    return response;
  }
};

