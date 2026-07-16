import { UserService } from '@/services/core/ApiService';
import { StatsDto } from '@/services/foundation/system/StatsAdminService';
import { AxiosRequestConfig } from 'axios';

/**
 * 통계 서비스(User)
 * 사용자 홈 대시보드가 관리자 전용(/admin/system/statistics, 403) 대신 사용자 경로(/api/v1/statistics)를 사용.
 * (배너/팝업 사용자 서비스와 동일 패턴)
 */
class StatsUserService extends UserService {
  constructor() {
    super('/statistics');
  }

  /** 접속(로그인) 추이 통계 */
  async getConnectStats(
    params?: { fromDate?: string; toDate?: string },
    config?: AxiosRequestConfig,
  ): Promise<StatsDto[]> {
    return this.get<StatsDto[]>('/connect', { ...config, params });
  }
}

export const statsUserService = new StatsUserService();
