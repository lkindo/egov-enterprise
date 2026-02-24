import client from '@/lib/api/client';

export interface DeptJob {
  deptJobId: string;
  deptJobNm: string;
  deptJobCn: string;
  deptJobSe: string; // 1:?쇰컲, 2:以묒슂
  deptId: string;
  deptNm?: string;
  chargerId: string;
  chargerNm?: string;
  priort: string; // 1:?믪쓬, 2:蹂댄넻, 3:??쓬
  sttus: string; // 1:吏꾪뻾以? 2:?꾨즺
  frstRegisterId: string;
  createdDate: string;
}

export const deptJobService = {
  /**
   * 遺???낅Т 紐⑸줉 議고쉶
   */
  getDeptJobs: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/dept-jobs', { params });
    return response;
  },

  /**
   * 遺???낅Т ?곸꽭 議고쉶
   */
  getDeptJob: async (id: string) => {
    const response = await client.get(`/dept-jobs/${id}`);
    return response;
  },

  /**
   * 遺???낅Т ?깅줉/?섏젙
   */
  saveDeptJob: async (data: Partial<DeptJob>) => {
    if (data.deptJobId) {
      return (await client.put(`/dept-jobs/${data.deptJobId}`, data)).data;
    }
    return (await client.post('/dept-jobs', data)).data;
  },

  /**
   * ?곹깭 蹂寃?(?꾨즺 泥섎━ ??
   */
  updateStatus: async (id: string, sttus: string) => {
    const response = await client.patch(`/dept-jobs/${id}/status`, { sttus });
    return response;
  }
};

