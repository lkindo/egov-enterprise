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
    client.get<PageResult<UserAbsence>>('/admin/system/vacations/absence', { params }),

  updateAbsence: async (userId: string, isAbsent: boolean): Promise<void> =>
    client.post('/admin/system/vacations/absence', {
      userId,
      userAbsnceAt: isAbsent ? 'Y' : 'N'
    })
};
