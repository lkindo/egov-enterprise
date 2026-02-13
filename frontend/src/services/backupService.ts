import client from '@/lib/api/client';

export interface BackupOpert {
  backupOpertId: string;
  backupOpertNm: string;
  backupOrginDrctry: string;
  backupStreDrctry: string;
  executCycle: string;
  executSchdulDe: string;
  executSchdulHour: string;
  executSchdulMnt: string;
  executSchdulSecnd: string;
  useAt: 'Y' | 'N';
}

export const backupService = {
  getBackups: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/backups', { params });
    return response.data;
  },

  executeNow: async (id: string) => {
    const response = await client.post(`/admin/system/backups/${id}/execute`);
    return response.data;
  }
};
