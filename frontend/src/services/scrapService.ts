import client from '@/lib/api/client';

export interface Scrap {
  scrapId: string;
  bbsId: string;
  nttId: number;
  scrapNm: string;
  createdDate: string;
}

export const scrapService = {
  /**
   * 나의 스크랩 목록 조회
   */
  getMyScraps: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/scraps', { params });
    return response.data;
  },

  /**
   * 스크랩 삭제
   */
  deleteScrap: async (id: string) => {
    const response = await client.delete(`/scraps/${id}`);
    return response.data;
  }
};
