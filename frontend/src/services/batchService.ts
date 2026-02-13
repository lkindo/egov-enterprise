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
  /**
   * 배치 스케줄 목록 조회
   */
  getSchedules: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/batches/schedules', { params });
    return response.data;
  },

  /**
   * 배치 실행 결과 목록 조회
   */
  getResults: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/admin/system/batches/results', { params });
    return response.data;
  },

  /**
   * 배치 즉시 실행
   */
  executeNow: async (id: string) => {
    const response = await client.post(`/admin/system/batches/schedules/${id}/execute`);
    return response.data;
  }
};
