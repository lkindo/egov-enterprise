import client from '@/lib/api/client';

export interface Anniversary {
  annId: string;
  usid: string;
  annvrsryNm: string;
  annvrsryDe: string;
  annvrsrySe: string; // 1:생일, 2:결혼, 3:기타
  userNm?: string;
  memo: string;
  cldrSe?: string;
  reptitAt?: string;
}

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const anniversaryService = {
  getAnniversaries: async (params?: { keyword?: string; page?: number; size?: number }) =>
    client.get<PageResult<Anniversary>>('/anniversaries', { params }),

  getMyAnniversaries: async (params?: { page?: number; size?: number }) =>
    client.get<PageResult<Anniversary>>('/anniversaries/my', { params }),

  getAnniversary: async (annId: string) =>
    client.get<Anniversary>(`/anniversaries/${annId}`),

  createAnniversary: async (data: Partial<Anniversary>) =>
    client.post('/anniversaries', data),

  updateAnniversary: async (annId: string, data: Partial<Anniversary>) =>
    client.put(`/anniversaries/${annId}`, data),

  deleteAnniversary: async (annId: string) =>
    client.delete(`/anniversaries/${annId}`)
};
