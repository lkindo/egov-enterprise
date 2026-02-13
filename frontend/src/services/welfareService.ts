import client from '@/lib/api/client';

export interface Reward {
  rwardId: string;
  rwardNm: string;
  rwardDe: string;
  rwardKnd: string;
  userNm: string;
  rwardCn: string;
}

export interface Ctsnn {
  ctsnnId: string;
  ctsnnNm: string;
  ctsnnDe: string;
  ctsnnCode: string; // 1:결혼, 2:부고...
  userNm: string;
  trgetNm: string;
}

export const welfareService = {
  getRewards: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/uss/ion/rewards', { params });
    return response.data;
  },

  getCtsnns: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/uss/ion/ctsnn', { params });
    return response.data;
  }
};
