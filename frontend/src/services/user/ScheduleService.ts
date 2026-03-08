import { ApiService } from '@/services/core/ApiService';
import { Schedule, ScheduleResponse, MonthlyScheduleResponse } from '@/types/schedule';

class ScheduleService extends ApiService {
    constructor() {
        super('/schedule');
    }

    /**
     * ?袁⑷퍥 ??깆젟 筌뤴뫖以?鈺곌퀬??(??륁뵠筌왖)
     */
    async getScheduleList(params: { pageIndex?: number; pageUnit?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result || response;
    }

    /**
     * ?遺얩???깆젟 鈺곌퀬??
     * @param yearMonth yyyyMM
     */
    async getMonthlySchedule(yearMonth: string) {
        const response = await this.get<any>('/monthly', { params: { yearMonth } });
        return response?.result || response;
    }

    /**
     * ?醫롮? 甕곕뗄?욆퉪???깆젟 鈺곌퀬??
     * @param startDate yyyyMMdd
     * @param endDate yyyyMMdd
     */
    async getScheduleByRange(startDate: string, endDate: string) {
        const response = await this.get<any>('/range', { params: { startDate, endDate } });
        return response?.result || response;
    }

    /**
     * ??깆젟 ?怨멸쉭 鈺곌퀬??
     */
    async getSchedule(id: string) {
        const response = await this.get<any>(`/${id}`);
        return response?.result || response;
    }

    /**
     * ??깆젟 ?源낆쨯
     */
    async createSchedule(data: Partial<Schedule>) {
        const response = await this.post<any>('', data);
        return response?.result || response;
    }

    /**
     * ??깆젟 ??륁젟
     */
    async updateSchedule(id: string, data: Partial<Schedule>) {
        const response = await this.put<any>(`/${id}`, data);
        return response?.result || response;
    }

    /**
     * ??깆젟 ????
     */
    async deleteSchedule(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const scheduleService = new ScheduleService();
