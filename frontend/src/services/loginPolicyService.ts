import client from '@/lib/api/client';

export interface LoginPolicy {
  emplyrId: string;
  emplyrNm: string;
  ipInfo: string;
  dplctPermAt: 'Y' | 'N';
  lmttAt: 'Y' | 'N';
  regYn: 'Y' | 'N';
  lastUpdusrId?: string;
}

export const loginPolicyService = {
  getPolicies: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/user/login-policies', { 
      params: {
        pageIndex: (params.page || 0) + 1,
        searchKeyword: params.searchWrd || ''
      }
    });
    return response;
  },

  getPolicy: async (emplyrId: string) => {
    const response = await client.get(`/admin/user/login-policies/${emplyrId}`);
    return response;
  },

  updatePolicy: async (emplyrId: string, data: Partial<LoginPolicy>) => {
    const response = await client.put(`/admin/user/login-policies/${emplyrId}`, data);
    return response;
  }
};

