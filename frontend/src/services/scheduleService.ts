import client from '@/lib/api/client';
import { Schedule, ScheduleResponse, MonthlyScheduleResponse } from '@/types/schedule';

export const scheduleService = {
  /**
   * 전체 일정 목록 조회 (페이징)
   */
  getScheduleList: async (params: { pageIndex?: number; pageUnit?: number }) => {
    const response = await client.get<ScheduleResponse>('/schedule', { params });
    return response.data;
  },

  /**
   * 월별 일정 조회
   * @param yearMonth yyyyMM
   */
  getMonthlySchedule: async (yearMonth: string) => {
    const response = await client.get<MonthlyScheduleResponse>('/schedule/monthly', {
      params: { yearMonth }
    });
    return response.data;
  },

  /**
   * 날짜 범위별 일정 조회
   * @param startDate yyyyMMdd
   * @param endDate yyyyMMdd
   */
  getScheduleByRange: async (startDate: string, endDate: string) => {
    const response = await client.get<{ schedules: Schedule[] }>('/schedule/range', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  /**
   * 일정 상세 조회
   */
  getSchedule: async (id: string) => {
    const response = await client.get<{ schedule: Schedule }>(`/schedule/${id}`);
    return response.data;
  },

  /**
   * 일정 등록
   */
  createSchedule: async (data: Partial<Schedule>) => {
    const response = await client.post('/schedule', data);
    return response.data;
  },

  /**
   * 일정 수정
   */
  updateSchedule: async (id: string, data: Partial<Schedule>) => {
    const response = await client.put(`/schedule/${id}`, data);
    return response.data;
  },

  /**
   * 일정 삭제
   */
  deleteSchedule: async (id: string) => {
    const response = await client.delete(`/schedule/${id}`);
    return response.data;
  }
};
