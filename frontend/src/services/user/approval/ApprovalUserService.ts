import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';

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

 async getPending(params: { page?: number; size?: number }): Promise<PageResponse<Approval>> {
 return this.get<PageResponse<Approval>>('/pending', { params });
 }

 async getMyHistory(params: { page?: number; size?: number }): Promise<PageResponse<Approval>> {
 return this.get<PageResponse<Approval>>('/my', { params });
 }

 async confirm(id: string, status: 'Y' | 'N', reason?: string): Promise<void> {
 return this.put<void>(`/${id}/confirm`, { status, reason });
 }
}

export const approvalUserService = new ApprovalUserService();
