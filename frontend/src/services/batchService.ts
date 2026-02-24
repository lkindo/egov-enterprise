import client from '@/lib/api/client';

export interface BatchSchedule {
  batchSchdulId: string;
  batchOpertId: string;
  batchOpertNm: string;
  executCycle: string; // 01:留ㅼ씪, 02:留ㅼ＜...
  executSchdulDe: string;
  executSchdulHour: string;
  executSchdulMnt: string;
  executSchdulSecnd: string;
}

export interface BatchResult {
  batchResultId: string;
  batchOpertNm: string;
  sttus: string; // 01:?깃났, 02:?ㅽ뙣, 03:?섑뻾以?
  executBeginTime: string;
  executEndTime: string;
}

export const batchService = {
  /**
   * 諛곗튂 ?ㅼ?以?紐⑸줉 議고쉶
   */
  getSchedules: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/batches/schedules', { params });
    return response;
  },

  /**
   * 諛곗튂 ?ㅽ뻾 寃곌낵 紐⑸줉 議고쉶
   */
  getResults: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/admin/system/batches/results', { params });
    return response;
  },

  /**
   * 諛곗튂 利됱떆 ?ㅽ뻾
   */
  executeNow: async (id: string) => {
    const response = await client.post(`/admin/system/batches/schedules/${id}/execute`);
    return response;
  }
};

