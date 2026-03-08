import { AdminService } from '@/services/core/ApiService';

export interface UserAbsence {
    userId: string;
    userNm: string;
    userAbsnceAt: 'Y' | 'N';
    lastUpdusrPnttm?: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

class AbsenceAdminService extends AdminService {
    constructor() {
        // /api/v1 (client.ts ?癒?퐣 ??뱁쒙쭪? + /admin/system (AdminService) + /vacations/absence
        super('/vacations/absence');
    }

    async getAbsences(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<UserAbsence>> {
        return this.get<PageResult<UserAbsence>>('', { params });
    }

    async updateAbsence(userId: string, isAbsent: boolean): Promise<void> {
        return this.post('', {
            userId,
            userAbsnceAt: isAbsent ? 'Y' : 'N'
        });
    }
}

export const absenceAdminService = new AbsenceAdminService();
