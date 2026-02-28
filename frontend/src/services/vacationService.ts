import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';
import { Vacation, YearlyLeave } from '@/types/vacation';

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export type { Vacation, YearlyLeave };

export const vacationService = {
  /**
   * 나의 휴가 신청 목록 조회
   */
  getMyVacations: async (params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Vacation>> =>
    client.get<PageResult<Vacation>>('/vacations', { params }),

  /**
   * 휴가 상세 조회
   */
  getVacationDetail: async (params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<Vacation> =>
    client.get<Vacation>('/vacations/detail', { params }),

  /**
   * 나의 연차 현황 조회
   */
  getMyYearlyLeave: async (year: string): Promise<YearlyLeave> =>
    client.get<YearlyLeave>(`/vacations/yearly-leaves/my?occrrncYear=${year}`),

  /**
   * 휴가 신청
   */
  requestVacation: async (data: Partial<Vacation>): Promise<void> =>
    client.post('/vacations', data),

  /**
   * 휴가 수정
   */
  updateVacation: async (data: Partial<Vacation>): Promise<void> =>
    client.put('/vacations', data),

  /**
   * 휴가 삭제
   */
  deleteVacation: async (params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<void> =>
    client.delete('/vacations', { params }),

  /**
   * 전사 휴가 신청 목록 조회 (Admin)
   */
  getAllVacations: async (params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResult<Vacation>> =>
    client.get<PageResult<Vacation>>('/admin/system/vacations', { ...config, params }),

  /**
   * 휴가 승인/반려 처리 (Admin)
   */
  approveVacation: async (params: {
    applcntId: string;
    vcatnSe: string;
    bgnde: string;
    confmAt: 'Y' | 'N';
    returnResn?: string
  }): Promise<void> =>
    client.put('/admin/system/vacations/approval', null, { params }),

  /**
   * 전사 연차 통계 조회
   */
  getYearlyLeaveStats: async (year: string, config?: AxiosRequestConfig): Promise<YearlyLeave[]> =>
    client.get<YearlyLeave[]>(`/admin/system/vacations/annual-leaves?occrrncYear=${year}`, config)
};
