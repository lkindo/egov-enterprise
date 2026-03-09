import { ApiService } from '@/services/core/ApiService';
import { Schedule, ScheduleResponse, MonthlyScheduleResponse } from '@/types/schedule';

class ScheduleService extends ApiService {
    constructor() {
        super('/schedule');
    }

    /**
     * 전체 일정 목록 조회 (페이징)
     */
    async getScheduleList(params: { pageIndex?: number; pageUnit?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result || response;
    }

    /**
     * 월별 일정 조회
     * @param yearMonth yyyyMM
     */
    async getMonthlySchedule(yearMonth: string) {
        const response = await this.get<any>('/monthly', { params: { yearMonth } });
        return response?.result || response;
    }

    /**
     * 지정 기간별 일정 조회
     * @param startDate yyyyMMdd
     * @param endDate yyyyMMdd
     */
    async getScheduleByRange(startDate: string, endDate: string) {
        const response = await this.get<any>('/range', { params: { startDate, endDate } });
        return response?.result || response;
    }

    /**
     * 일정 상세 조회
     */
    async getSchedule(id: string) {
        const response = await this.get<any>(`/${id}`);
        return response?.result || response;
    }

    /**
     * 일정 등록
     */
    async createSchedule(data: Partial<Schedule>) {
        const response = await this.post<any>('', data);
        return response?.result || response;
    }

    /**
     * 일정 수정
     */
    async updateSchedule(id: string, data: Partial<Schedule>) {
        const response = await this.put<any>(`/${id}`, data);
        return response?.result || response;
    }

    /**
     * 일정 삭제
     */
    async deleteSchedule(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const scheduleService = new ScheduleService();
