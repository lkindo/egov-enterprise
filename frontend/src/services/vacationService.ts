import client from '@/lib/api/client';
import { Vacation, YearlyLeave } from '@/types/vacation';

export const vacationService = {
  /**
   * 나의 휴가 신청 목록 조회
   */
  getMyVacations: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/vacations', { params });
    return response.data;
  },

  /**
   * 휴가 상세 조회
   */
  getVacationDetail: async (params: { applcntId: string, vcatnSe: string, bgnde: string }) => {
    const response = await client.get('/vacations/detail', { params });
    return response.data;
  },

  /**
   * 나의 연차 현황 조회
   */
  getMyYearlyLeave: async (year: string) => {
    const response = await client.get(`/vacations/yearly-leaves/my?occrrncYear=${year}`);
    return response.data;
  },

  /**
   * 휴가 신청
   */
  requestVacation: async (data: Partial<Vacation>) => {
    const response = await client.post('/vacations', data);
    return response.data;
  },

  /**
   * 휴가 수정
   */
  updateVacation: async (data: Partial<Vacation>) => {
    const response = await client.put('/vacations', data);
    return response.data;
  },

  /**
   * 휴가 삭제
   */
  deleteVacation: async (params: { applcntId: string, vcatnSe: string, bgnde: string }) => {
    const response = await client.delete('/vacations', { params });
    return response.data;
  },

  /**
   * 전사 휴가 신청 목록 조회 (Admin)
   */
  getAllVacations: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/vacations/admin/all', { params });
    return response.data;
  },

  /**
   * 휴가 승인/반려 처리 (Admin)
   */
  approveVacation: async (params: { 
    applcntId: string; 
    vcatnSe: string; 
    bgnde: string; 
    confmAt: 'Y' | 'N'; 
    returnResn?: string 
  }) => {
    const response = await client.put('/vacations/approval', null, { params });
    return response.data;
  },

  /**
   * 전사 연차 통계 조회
   */
  getYearlyLeaveStats: async (year: string) => {
    const response = await client.get(`/vacations/yearly-leaves?occrrncYear=${year}`);
    return response.data;
  }
};
