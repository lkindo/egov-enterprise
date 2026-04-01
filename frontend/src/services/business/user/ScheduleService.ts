import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { Schedule, MonthlyScheduleResponse } from '@/types/business/schedule';

class ScheduleService extends ApiService {
 constructor() {
 super('/schedule');
 }

 /**
 * ?꾩껜 ?쇱젙 紐⑸줉 조회 (?섏씠吏?
 */
 async getScheduleList(params: { page踰덊샇?: number; pageUnit?: number }): Promise<PageResponse<Schedule>> {
 return this.get<PageResponse<Schedule>>('', { params });
 }

 /**
 * ?붾퀎 ?쇱젙 조회
 * @param yearMonth yyyyMM
 */
 async getMonthlySchedule(yearMonth: string): Promise<MonthlyScheduleResponse> {
 return this.get<MonthlyScheduleResponse>('/monthly', { params: { yearMonth } });
 }

 /**
 * 吏님湲곌컙蹂님쇱젙 조회
 * @param startDate yyyyMMdd
 * @param endDate yyyyMMdd
 */
 async getScheduleByRange(startDate: string, endDate: string): Promise<Schedule[]> {
 return this.get<Schedule[]>('/range', { params: { startDate, endDate } });
 }

 /**
 * ?쇱젙 ?곸꽭 조회
 */
 async getSchedule(id: string): Promise<Schedule> {
 return this.get<Schedule>(`/${id}`);
 }

 /**
 * ?쇱젙 등록
 */
 async createSchedule(data: Partial<Schedule>): Promise<Schedule> {
 return this.post<Schedule>('', data);
 }

 /**
 * ?쇱젙 ?섏젙
 */
 async updateSchedule(id: string, data: Partial<Schedule>): Promise<void> {
 return this.put<void>(`/${id}`, data);
 }

 /**
 * ?쇱젙 님젣
 */
 async deleteSchedule(id: string): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const scheduleService = new ScheduleService();
