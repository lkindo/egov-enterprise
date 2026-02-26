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
  ctsnnCode: string; // 1:결혼, 2:부고..
  userNm: string;
  trgetNm: string;
}

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const welfareService = {
  getRewards: async (params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Reward>> =>
    client.get<PageResult<Reward>>('/uss/ion/rewards', { params }),

  getCtsnns: async (params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Ctsnn>> =>
    client.get<PageResult<Ctsnn>>('/uss/ion/ctsnn', { params })
};
