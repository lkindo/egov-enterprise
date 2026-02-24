import client from '@/lib/api/client';
import { Schedule, ScheduleResponse, MonthlyScheduleResponse } from '@/types/schedule';

export const scheduleService = {
  /**
   * ?꾩껜 ?쇱젙 紐⑸줉 議고쉶 (?섏씠吏?
   */
  getScheduleList: async (params: { pageIndex?: number; pageUnit?: number }) => {
    const response = await client.get<ScheduleResponse>('/schedule', { params });
    return response;
  },

  /**
   * ?붾퀎 ?쇱젙 議고쉶
   * @param yearMonth yyyyMM
   */
  getMonthlySchedule: async (yearMonth: string) => {
    const response = await client.get<MonthlyScheduleResponse>('/schedule/monthly', {
      params: { yearMonth }
    });
    return response;
  },

  /**
   * ?좎쭨 踰붿쐞蹂??쇱젙 議고쉶
   * @param startDate yyyyMMdd
   * @param endDate yyyyMMdd
   */
  getScheduleByRange: async (startDate: string, endDate: string) => {
    const response = await client.get<{ schedules: Schedule[] }>('/schedule/range', {
      params: { startDate, endDate }
    });
    return response;
  },

  /**
   * ?쇱젙 ?곸꽭 議고쉶
   */
  getSchedule: async (id: string) => {
    const response = await client.get<{ schedule: Schedule }>(`/schedule/${id}`);
    return response;
  },

  /**
   * ?쇱젙 ?깅줉
   */
  createSchedule: async (data: Partial<Schedule>) => {
    const response = await client.post('/schedule', data);
    return response;
  },

  /**
   * ?쇱젙 ?섏젙
   */
  updateSchedule: async (id: string, data: Partial<Schedule>) => {
    const response = await client.put(`/schedule/${id}`, data);
    return response;
  },

  /**
   * ?쇱젙 ??젣
   */
  deleteSchedule: async (id: string) => {
    const response = await client.delete(`/schedule/${id}`);
    return response;
  }
};

