import client from '@/lib/api/client';

export interface CommonCodeDetail {
  codeId: string;
  code: string;
  codeNm: string;
  codeDc: string;
  useAt: 'Y' | 'N';
}

export const codeService = {
  /**
   * 怨듯넻 肄붾뱶 洹몃９(Master) 紐⑸줉 議고쉶
   */
  getGroups: async (params: { searchWrd?: string } = {}) => {
    const response = await client.get('/admin/system/codes', { params });
    return response;
  },

  /**
   * 怨듯넻 ?곸꽭 肄붾뱶 紐⑸줉 議고쉶
   */
  getDetails: async (params: { codeId: string; searchWrd?: string }) => {
    const response = await client.get(`/admin/system/codes/${params.codeId}/details`, { params });
    return response;
  },

  /**
   * ?곸꽭 肄붾뱶 ????섏젙
   */
  saveDetail: async (data: Partial<CommonCodeDetail>) => {
    const response = await client.post('/admin/system/codes/details', data);
    return response;
  },

  /**
   * ?곸꽭 肄붾뱶 ??젣
   */
  deleteDetail: async (codeId: string, code: string) => {
    const response = await client.delete(`/admin/system/codes/${codeId}/details/${code}`);
    return response;
  }
};

