import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * ?ъ슜님遺님?뺣낫 DTO
 */
export interface UserAbsenceDto {
  emplyrId: string;
  userAbsnceAt: string; // Y: 遺님 N: ?뺤긽
}

class AbsenceAdminService extends AdminService {
  constructor() {
    super('/user-absences');
  }

  /** 遺님?뺣낫 紐⑸줉 조회 */
  async getAbsenceList(config?: AxiosRequestConfig) {
    return this.get<UserAbsenceDto[]>('', config);
  }

  /** 遺님?뺣낫 ?곸꽭 조회 */
  async getAbsence(emplyrId: string, config?: AxiosRequestConfig) {
    return this.get<UserAbsenceDto>(`/${emplyrId}`, config);
  }

  /** 遺님?뺣낫 ?낅뜲?댄듃 */
  async updateAbsence(emplyrId: string, userAbsnceAt: string, config?: AxiosRequestConfig) {
    return this.put<void>(`/${emplyrId}`, { emplyrId, userAbsnceAt }, config);
  }
}

export const absenceAdminService = new AbsenceAdminService();
