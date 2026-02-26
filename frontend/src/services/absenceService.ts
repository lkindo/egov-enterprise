import client from '@/lib/api/client';

export interface UserAbsence {
  userId: string;
  userNm: string;
  userAbsnceAt: 'Y' | 'N';
  lastUpdusrPnttm?: string;
}

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const absenceService = {
  getAbsences: async (params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<UserAbsence>> =>
    client.get<PageResult<UserAbsence>>('/admin/user/absences', { params }),

  updateAbsence: async (userId: string, isAbsent: boolean): Promise<void> =>
    client.put(`/admin/user/absences/${userId}`, { 
      userAbsnceAt: isAbsent ? 'Y' : 'N' 
    })
};
