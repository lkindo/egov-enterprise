import client from '@/lib/api/client';

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

export const approvalService = {
    getPending: async (params: { page?: number; size?: number }): Promise<PageResult<Approval>> =>
        client.get<PageResult<Approval>>('/approvals/pending', { params }),

    getMyHistory: async (params: { page?: number; size?: number }): Promise<PageResult<Approval>> =>
        client.get<PageResult<Approval>>('/approvals/my', { params }),

    confirm: async (id: string, status: 'Y' | 'N', reason?: string): Promise<void> =>
        client.put(`/approvals/${id}/confirm`, { status, reason }),
};
