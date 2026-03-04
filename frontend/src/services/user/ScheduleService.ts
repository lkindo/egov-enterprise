import { ApiService } from '@/services/core/ApiService';
import { Schedule, ScheduleResponse, MonthlyScheduleResponse } from '@/types/schedule';

class ScheduleService extends ApiService {
    constructor() {
        super('/schedule');
    }

    /**
     * 전체 일정 목록 조회 (페이지)
     */
    async getScheduleList(params: { pageIndex?: number; pageUnit?: number }) {
        return this.get<ScheduleResponse>('', { params });
    }

    /**
     * 월별 일정 조회
     * @param yearMonth yyyyMM
     */
    async getMonthlySchedule(yearMonth: string) {
        return this.get<MonthlyScheduleResponse>('/monthly', { params: { yearMonth } });
    }

    /**
     * 날짜 범위별 일정 조회
     * @param startDate yyyyMMdd
     * @param endDate yyyyMMdd
     */
    async getScheduleByRange(startDate: string, endDate: string) {
        return this.get<{ schedules: Schedule[] }>('/range', { params: { startDate, endDate } });
    }

    /**
     * 일정 상세 조회
     */
    async getSchedule(id: string) {
        return this.get<{ schedule: Schedule }>(`/${id}`);
    }

    /**
     * 일정 등록
     */
    async createSchedule(data: Partial<Schedule>) {
        return this.post<any>('', data);
    }

    /**
     * 일정 수정
     */
    async updateSchedule(id: string, data: Partial<Schedule>) {
        return this.put<any>(`/${id}`, data);
    }

    /**
     * 일정 삭제
     */
    async deleteSchedule(id: string) {
        return this.delete<any>(`/${id}`);
    }
}

export const scheduleService = new ScheduleService();
