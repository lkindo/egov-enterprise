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

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

class ApprovalUserService extends UserService {
    constructor() {
        super('/approvals');
    }

    async getPending(params: { page?: number; size?: number }): Promise<PageResult<Approval>> {
        return this.get<PageResult<Approval>>('/pending', { params });
    }

    async getMyHistory(params: { page?: number; size?: number }): Promise<PageResult<Approval>> {
        return this.get<PageResult<Approval>>('/my', { params });
    }

    async confirm(id: string, status: 'Y' | 'N', reason?: string): Promise<void> {
        return this.put<void>(`/${id}/confirm`, { status, reason });
    }
}

export const approvalUserService = new ApprovalUserService();