import client from '@/lib/api/client';

export interface Anniversary {
  annvrsryId: string;
  annvrsryNm: string;
  annvrsryDe: string;
  annvrsrySe: string; // 1:생일, 2:결혼, 3:기타
  userNm: string;
  memo: string;
}

export const anniversaryService = {
  getAnniversaries: async () => {
    const response = await client.get('/uss/ion/anniversaries');
    return response.data;
  }
};
