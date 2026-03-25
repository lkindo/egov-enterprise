import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { Schedule, MonthlyScheduleResponse } from '@/types/schedule';

class ScheduleService extends ApiService {
 constructor() {
 super('/schedule');
 }

 /**
 * 전체 일정 목록 조회 (페이징)
 */
 async getScheduleList(params: { page번호?: number; pageUnit?: number }): Promise<PageResponse<Schedule>> {
 return this.get<PageResponse<Schedule>>('', { params });
 }

 /**
 * 월별 일정 조회
 * @param yearMonth yyyyMM
 */
 async getMonthlySchedule(yearMonth: string): Promise<MonthlyScheduleResponse> {
 return this.get<MonthlyScheduleResponse>('/monthly', { params: { yearMonth } });
 }

 /**
 * 지정 기간별 일정 조회
 * @param startDate yyyyMMdd
 * @param endDate yyyyMMdd
 */
 async getScheduleByRange(startDate: string, endDate: string): Promise<Schedule[]> {
 return this.get<Schedule[]>('/range', { params: { startDate, endDate } });
 }

 /**
 * 일정 상세 조회
 */
 async getSchedule(id: string): Promise<Schedule> {
 return this.get<Schedule>(`/${id}`);
 }

 /**
 * 일정 등록
 */
 async createSchedule(data: Partial<Schedule>): Promise<Schedule> {
 return this.post<Schedule>('', data);
 }

 /**
 * 일정 수정
 */
 async updateSchedule(id: string, data: Partial<Schedule>): Promise<void> {
 return this.put<void>(`/${id}`, data);
 }

 /**
 * 일정 삭제
 */
 async deleteSchedule(id: string): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const scheduleService = new ScheduleService();
