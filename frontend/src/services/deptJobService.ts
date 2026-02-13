import client from '@/lib/api/client';

export interface DeptJob {
  deptJobId: string;
  deptJobNm: string;
  deptJobCn: string;
  deptJobSe: string; // 1:일반, 2:중요
  deptId: string;
  deptNm?: string;
  chargerId: string;
  chargerNm?: string;
  priort: string; // 1:높음, 2:보통, 3:낮음
  sttus: string; // 1:진행중, 2:완료
  frstRegisterId: string;
  createdDate: string;
}

export const deptJobService = {
  /**
   * 부서 업무 목록 조회
   */
  getDeptJobs: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/dept-jobs', { params });
    return response.data;
  },

  /**
   * 부서 업무 상세 조회
   */
  getDeptJob: async (id: string) => {
    const response = await client.get(`/dept-jobs/${id}`);
    return response.data;
  },

  /**
   * 부서 업무 등록/수정
   */
  saveDeptJob: async (data: Partial<DeptJob>) => {
    if (data.deptJobId) {
      return (await client.put(`/dept-jobs/${data.deptJobId}`, data)).data;
    }
    return (await client.post('/dept-jobs', data)).data;
  },

  /**
   * 상태 변경 (완료 처리 등)
   */
  updateStatus: async (id: string, sttus: string) => {
    const response = await client.patch(`/dept-jobs/${id}/status`, { sttus });
    return response.data;
  }
};
