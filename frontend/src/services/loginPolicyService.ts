import client from '@/lib/api/client';

export interface LoginPolicy {
  emplyrId: string;
  userNm: string;
  ipAdres: string;
  dplctPermitAt: 'Y' | 'N';
  lmttAt: 'Y' | 'N';
  lastUpdusrPnttm?: string;
}

export const loginPolicyService = {
  getPolicies: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/user/login-policies', { params });
    return response.data;
  },

  updatePolicy: async (userId: string, data: Partial<LoginPolicy>) => {
    const response = await client.put(`/admin/user/login-policies/${userId}`, data);
    return response.data;
  }
};
