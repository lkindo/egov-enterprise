import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * 사용자 부재 정보 DTO
 */
export interface UserAbsenceDto {
  userId: string;
  userAbsnYn: string; // Y: 부재 N: 정상
}

class AbsenceAdminService extends AdminService {
  constructor() {
    super('/user-absences');
  }

  /** 부재 정보 목록 조회 */
  async getAbsenceList(config?: AxiosRequestConfig) {
    return this.get<UserAbsenceDto[]>('', config);
  }

  /** 부재 정보 상세 조회 */
  async getAbsence(userId: string, config?: AxiosRequestConfig) {
    return this.get<UserAbsenceDto>(`/${userId}`, config);
  }

  /** 부재 정보 업데이트 */
  async updateAbsence(userId: string, userAbsnYn: string, config?: AxiosRequestConfig) {
    return this.put<void>(`/${userId}`, { userId, userAbsnYn }, config);
  }
}

export const absenceAdminService = new AbsenceAdminService();
