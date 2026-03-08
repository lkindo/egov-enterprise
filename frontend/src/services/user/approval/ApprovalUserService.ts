import { UserService } from '@/services/core/ApiService';

export interface Approval {
    approvalId: string;
    jobType: string;
    jobTypeNm: string;
    applicantId: string;
    requestDate: string;
    approverId: string;
    status: 'R' | 'Y' | 'N';
    approvalDate?: string;
    returnReason?: string;
}

class ApprovalUserService extends UserService {
    constructor() {
        super('/approvals');
    }

    async getPending(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/pending', { params });
        return response?.result || response;
    }

    async getMyHistory(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/my', { params });
        return response?.result || response;
    }

    async confirm(id: string, status: 'Y' | 'N', reason?: string) {
        const response = await this.put<any>(`/${id}/confirm`, { status, reason });
        return response?.result || response;
    }
}

export const approvalUserService = new ApprovalUserService();
