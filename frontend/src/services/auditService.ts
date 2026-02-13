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
   * 감사 로그 목록 조회 (Admin)
   */
  getAuditLogs: async (params: { page?: number; size?: number; keyword?: string }) => {
    const response = await client.get('/admin/audit', { params });
    return response.data;
  }
};
