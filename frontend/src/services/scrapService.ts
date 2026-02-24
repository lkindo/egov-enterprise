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
   * ?섏쓽 ?ㅽ겕??紐⑸줉 議고쉶
   */
  getMyScraps: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/scraps', { params });
    return response;
  },

  /**
   * ?ㅽ겕????젣
   */
  deleteScrap: async (id: string) => {
    const response = await client.delete(`/scraps/${id}`);
    return response;
  }
};

