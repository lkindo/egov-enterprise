import client from '@/lib/api/client';

export interface BackupOpert {
  backupOpertId: string;
  backupOpertNm: string;
  backupOrginlDrctry: string;
  backupStreDrctry: string;
  cmprsSe: string;
  cmprsSeNm?: string;
  executCycle: string;
  executCycleNm?: string;
  executSchdulDe?: string;
  executSchdulHour: string;
  executSchdulMnt: string;
  executSchdulSecnd: string;
  executSchdulDfkSes?: string[];
  useAt: 'Y' | 'N';
}

export interface BackupResult {
  backupResultId: string;
  backupOpertId: string;
  backupOpertNm: string;
  backupOrginlDrctry: string;
  backupStreDrctry: string;
  sttus: string;
  sttusNm?: string;
  errorLog?: string;
  executBeginTime: string;
  executEndTime: string;
}

export const backupService = {
  getOperations: async (params: { page?: number; size?: number; keyword?: string; condition?: string }) => {
    const response = await client.get('/admin/system/backups/operations', { params });
    return response;
  },

  getOperation: async (id: string) => {
    const response = await client.get(`/admin/system/backups/operations/${id}`);
    return response;
  },

  createOperation: async (data: Partial<BackupOpert>) => {
    const response = await client.post('/admin/system/backups/operations', data);
    return response;
  },

  updateOperation: async (id: string, data: Partial<BackupOpert>) => {
    const response = await client.put(`/admin/system/backups/operations/${id}`, data);
    return response;
  },

  deleteOperation: async (id: string) => {
    const response = await client.delete(`/admin/system/backups/operations/${id}`);
    return response;
  },

  getResults: async (params: { page?: number; size?: number; sttus?: string; keyword?: string; condition?: string }) => {
    const response = await client.get('/admin/system/backups/results', { params });
    return response;
  }
};

