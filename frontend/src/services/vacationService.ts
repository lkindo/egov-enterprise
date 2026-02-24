import client from '@/lib/api/client';
import { Vacation, YearlyLeave } from '@/types/vacation';

export const vacationService = {
  /**
   * ?섏쓽 ?닿? ?좎껌 紐⑸줉 議고쉶
   */
  getMyVacations: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/vacations', { params });
    return response;
  },

  /**
   * ?닿? ?곸꽭 議고쉶
   */
  getVacationDetail: async (params: { applcntId: string, vcatnSe: string, bgnde: string }) => {
    const response = await client.get('/vacations/detail', { params });
    return response;
  },

  /**
   * ?섏쓽 ?곗감 ?꾪솴 議고쉶
   */
  getMyYearlyLeave: async (year: string) => {
    const response = await client.get(`/vacations/yearly-leaves/my?occrrncYear=${year}`);
    return response;
  },

  /**
   * ?닿? ?좎껌
   */
  requestVacation: async (data: Partial<Vacation>) => {
    const response = await client.post('/vacations', data);
    return response;
  },

  /**
   * ?닿? ?섏젙
   */
  updateVacation: async (data: Partial<Vacation>) => {
    const response = await client.put('/vacations', data);
    return response;
  },

  /**
   * ?닿? ??젣
   */
  deleteVacation: async (params: { applcntId: string, vcatnSe: string, bgnde: string }) => {
    const response = await client.delete('/vacations', { params });
    return response;
  },

  /**
   * ?꾩궗 ?닿? ?좎껌 紐⑸줉 議고쉶 (Admin)
   */
  getAllVacations: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/vacations/admin/all', { params });
    return response;
  },

  /**
   * ?닿? ?뱀씤/諛섎젮 泥섎━ (Admin)
   */
  approveVacation: async (params: { 
    applcntId: string; 
    vcatnSe: string; 
    bgnde: string; 
    confmAt: 'Y' | 'N'; 
    returnResn?: string 
  }) => {
    const response = await client.put('/vacations/approval', null, { params });
    return response;
  },

  /**
   * ?꾩궗 ?곗감 ?듦퀎 議고쉶
   */
  getYearlyLeaveStats: async (year: string) => {
    const response = await client.get(`/vacations/yearly-leaves?occrrncYear=${year}`);
    return response;
  }
};

