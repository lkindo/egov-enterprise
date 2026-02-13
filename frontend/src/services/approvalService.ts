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

export const approvalService = {
  /**
   * 결재 대기 목록 (받은 결재함)
   */
  getPending: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/approvals/pending', { params });
    return response.data;
  },

  /**
   * 내 결재 신청 이력 (보낸 결재함)
   */
  getMyHistory: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/approvals/my', { params });
    return response.data;
  },

  /**
   * 결재 승인/반려 처리
   */
  confirm: async (id: string, status: 'Y' | 'N', reason?: string) => {
    const response = await client.put(`/approvals/${id}/confirm`, { status, reason });
    return response.data;
  }
};
