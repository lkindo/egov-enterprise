import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';
import type { Vacation, YearlyLeave } from '@/types/vacation';

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

class VacationAdminService extends AdminService {
    constructor() {
        super('/vacations');
    }

    /**
     * 전사 휴가 신청 목록 조회 (Admin)
     */
    async getAllVacations(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResult<Vacation>> {
        return this.get<PageResult<Vacation>>('', { ...config, params });
    }

    /**
     * 휴가 승인/반려 처리 (Admin)
     */
    async approveVacation(params: {
        applcntId: string;
        vcatnSe: string;
        bgnde: string;
        confmAt: 'Y' | 'N';
        returnResn?: string
    }): Promise<void> {
        return this.put('/approval', null, { params });
    }

    /**
     * 전사 연차 통계 조회
     */
    async getYearlyLeaveStats(year: string, config?: AxiosRequestConfig): Promise<YearlyLeave[]> {
        return this.get<YearlyLeave[]>(`/annual-leaves?occrrncYear=${year}`, config);
    }
}

export const vacationAdminService = new VacationAdminService();
