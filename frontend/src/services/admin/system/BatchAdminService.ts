import { AdminService } from '@/services/core/ApiService';

export interface BatchSchedule {
    batchSchdulId: string;
    batchOpertId: string;
    batchOpertNm: string;
    executCycle: string; // 01:筌띲끉?? 02:筌띲끉竊?..
    executSchdulDe: string;
    executSchdulHour: string;
    executSchdulMnt: string;
    executSchdulSecnd: string;
}

export interface BatchResult {
    batchResultId: string;
    batchOpertNm: string;
    sttus: string; // 01:?源껊궗, 02:??쎈솭, 03:??묐뻬餓?    executBeginTime: string;
    executEndTime: string;
}

class BatchAdminService extends AdminService {
    constructor() {
        super('/system/batches');
    }

    async getSchedules(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        return this.get<any>('/schedules', { ...config, params });
    }

    async getResults(params: { page?: number; size?: number }, config?: any) {
        return this.get<any>('/results', { ...config, params });
    }

    async executeNow(id: string, config?: any) {
        return this.post<any>(`/schedules/${id}/execute`, null, config);
    }
}

export const batchAdminService = new BatchAdminService();
