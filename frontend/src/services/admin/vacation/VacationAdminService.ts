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
     * ?袁⑷텢 ??? ?醫롪퍕 筌뤴뫖以?鈺곌퀬??(Admin)
     */
    async getAllVacations(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResult<Vacation>> {
        return this.get<PageResult<Vacation>>('', { ...config, params });
    }

    /**
     * ??? ?諭??獄쏆꼶??筌ｌ꼶??(Admin)
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
     * ?袁⑷텢 ?怨쀪컧 ????鈺곌퀬??
     */
    async getYearlyLeaveStats(year: string, config?: AxiosRequestConfig): Promise<YearlyLeave[]> {
        return this.get<YearlyLeave[]>(`/annual-leaves?occrrncYear=${year}`, config);
    }
}

export const vacationAdminService = new VacationAdminService();
