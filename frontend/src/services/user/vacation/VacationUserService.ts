import { UserService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';
import type { Vacation, YearlyLeave } from '@/types/vacation';

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

export type { Vacation, YearlyLeave };

class VacationUserService extends UserService {
    constructor() {
        super('/vacations');
    }

    /**
     * 나의 휴가 신청 목록 조회
     */
    async getMyVacations(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Vacation>> {
        return this.get<PageResult<Vacation>>('', { params });
    }

    /**
     * 휴가 상세 조회
     */
    async getVacationDetail(params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<Vacation> {
        return this.get<Vacation>('/detail', { params });
    }

    /**
     * 나의 연차 현황 조회
     */
    async getMyYearlyLeave(year: string): Promise<YearlyLeave> {
        return this.get<YearlyLeave>(`/yearly-leaves/my?occrrncYear=${year}`);
    }

    /**
     * 휴가 신청
     */
    async requestVacation(data: Partial<Vacation>): Promise<void> {
        return this.post('', data);
    }

    /**
     * 휴가 수정
     */
    async updateVacation(data: Partial<Vacation>): Promise<void> {
        return this.put('', data);
    }

    /**
     * 휴가 삭제
     */
    async deleteVacation(params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<void> {
        return this.delete('', { params });
    }
}

export const vacationUserService = new VacationUserService();
