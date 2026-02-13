import client from '@/lib/api/client';

export interface Department {
  orgnztId: string;
  orgnztNm: string;
  orgnztDc?: string;
}

export const deptService = {
  /**
   * 전체 부서(조직) 목록 조회
   */
  getDepts: async () => {
    const response = await client.get('/admin/departments');
    return response.data;
  }
};
