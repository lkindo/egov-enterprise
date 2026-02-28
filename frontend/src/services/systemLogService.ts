import client from '@/lib/api/client';

export interface SystemLog {
  logId: string;
  occcrrncDe: string;
  rqesterId: string;
  rqesterNm?: string;
  srvcNm: string;
  methodNm: string;
  processSeCode: string;
  processTime: number;
  errCode: string;
}

export const systemLogService = {
  getLogs: async (params: { page?: number; size?: number; searchWrd?: string; logType?: string }): Promise<any> => {
    const response = await client.get('/admin/system/logs', { params });
    return response;
  }
};
