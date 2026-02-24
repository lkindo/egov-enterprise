import client from '@/lib/api/client';

export interface Department {
  orgnztId: string;
  orgnztNm: string;
  orgnztDc?: string;
}

export const deptService = {
  /**
   * ?꾩껜 遺??議곗쭅) 紐⑸줉 議고쉶
   */
  getDepts: async () => {
    const response = await client.get('/admin/departments');
    return response;
  }
};

