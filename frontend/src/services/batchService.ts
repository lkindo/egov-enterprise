import client from '@/lib/api/client';

export interface BatchSchedule {
  batchSchdulId: string;
  batchOpertId: string;
  batchOpertNm: string;
  executCycle: string; // 01:매일, 02:매주...
  executSchdulDe: string;
  executSchdulHour: string;
  executSchdulMnt: string;
  executSchdulSecnd: string;
}

export interface BatchResult {
  batchResultId: string;
  batchOpertNm: string;
  sttus: string; // 01:성공, 02:실패, 03:수행중
  executBeginTime: string;
  executEndTime: string;
}

export const batchService = {
  getSchedules: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any) => {
    return client.get<any>('/admin/system/batches/schedules', { ...config, params });
  },

  getResults: async (params: { page?: number; size?: number }, config?: any) => {
    return client.get<any>('/admin/system/batches/results', { ...config, params });
  },

  executeNow: async (id: string, config?: any) => {
    return client.post(`/admin/system/batches/schedules/${id}/execute`, null, config);
  }
};
