import client from '@/lib/api/client';

export interface Anniversary {
  annvrsryId: string;
  annvrsryNm: string;
  annvrsryDe: string;
  annvrsrySe: string; // 1:?앹씪, 2:寃고샎, 3:湲고?
  userNm: string;
  memo: string;
}

export const anniversaryService = {
  getAnniversaries: async () => {
    const response = await client.get('/uss/ion/anniversaries');
    return response;
  }
};

