import client from '@/lib/api/client';

export interface UserAbsence {
  userId: string;
  userNm: string;
  userAbsnceAt: 'Y' | 'N';
  lastUpdusrPnttm?: string;
}

export const absenceService = {
  getAbsences: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/user/absences', { params });
    return response;
  },

  updateAbsence: async (userId: string, isAbsent: boolean) => {
    const response = await client.put(`/admin/user/absences/${userId}`, { 
      userAbsnceAt: isAbsent ? 'Y' : 'N' 
    });
    return response;
  }
};

