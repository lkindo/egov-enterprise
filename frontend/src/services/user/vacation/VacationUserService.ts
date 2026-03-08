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
     * ??륁벥 ??? ?醫롪퍕 筌뤴뫖以?鈺곌퀬??
     */
    async getMyVacations(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Vacation>> {
        return this.get<PageResult<Vacation>>('', { params });
    }

    /**
     * ??? ?怨멸쉭 鈺곌퀬??
     */
    async getVacationDetail(params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<Vacation> {
        return this.get<Vacation>('/detail', { params });
    }

    /**
     * ??륁벥 ?怨쀪컧 ?袁れ넺 鈺곌퀬??
     */
    async getMyYearlyLeave(year: string): Promise<YearlyLeave> {
        return this.get<YearlyLeave>(`/yearly-leaves/my?occrrncYear=${year}`);
    }

    /**
     * ??? ?醫롪퍕
     */
    async requestVacation(data: Partial<Vacation>): Promise<void> {
        return this.post('', data);
    }

    /**
     * ??? ??륁젟
     */
    async updateVacation(data: Partial<Vacation>): Promise<void> {
        return this.put('', data);
    }

    /**
     * ??? ????
     */
    async deleteVacation(params: { applcntId: string, vcatnSe: string, bgnde: string }): Promise<void> {
        return this.delete('', { params });
    }
}

export const vacationUserService = new VacationUserService();
