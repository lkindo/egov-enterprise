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
   * 공통 코드 그룹(Master) 목록 조회
   */
  getGroups: async (params: { searchWrd?: string } = {}) => {
    const response = await client.get('/admin/system/codes', { params });
    return response.data;
  },

  /**
   * 공통 상세 코드 목록 조회
   */
  getDetails: async (params: { codeId: string; searchWrd?: string }) => {
    const response = await client.get(`/admin/system/codes/${params.codeId}/details`, { params });
    return response.data;
  },

  /**
   * 상세 코드 저장/수정
   */
  saveDetail: async (data: Partial<CommonCodeDetail>) => {
    const response = await client.post('/admin/system/codes/details', data);
    return response.data;
  },

  /**
   * 상세 코드 삭제
   */
  deleteDetail: async (codeId: string, code: string) => {
    const response = await client.delete(`/admin/system/codes/${codeId}/details/${code}`);
    return response.data;
  }
};
