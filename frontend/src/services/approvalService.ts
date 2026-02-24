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
   * 寃곗옱 ?湲?紐⑸줉 (諛쏆? 寃곗옱??
   */
  getPending: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/approvals/pending', { params });
    return response;
  },

  /**
   * ??寃곗옱 ?좎껌 ?대젰 (蹂대궦 寃곗옱??
   */
  getMyHistory: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/approvals/my', { params });
    return response;
  },

  /**
   * 寃곗옱 ?뱀씤/諛섎젮 泥섎━
   */
  confirm: async (id: string, status: 'Y' | 'N', reason?: string) => {
    const response = await client.put(`/approvals/${id}/confirm`, { status, reason });
    return response;
  }
};

