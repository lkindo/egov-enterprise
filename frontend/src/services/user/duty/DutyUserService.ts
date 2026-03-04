import { UserService } from '@/services/core/ApiService';

export interface Duty {
    dutyId: string;
    dutyDe: string;
    dutyUserNm: string;
    dutyUserId: string;
    postNm: string;
    telNo: string;
}

class DutyUserService extends UserService {
    constructor() {
        super('/uss/ion/duties');
    }

    async getDuties(params: { month?: string }) {
        return this.get<any>('', { params });
    }

    async saveDuty(data: Partial<Duty>) {
        return this.post<any>('', data);
    }

    async deleteDuty(id: string) {
        return this.delete<any>(`/${id}`);
    }
}

export const dutyUserService = new DutyUserService();
