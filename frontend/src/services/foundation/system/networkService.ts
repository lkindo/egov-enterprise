import client from '@/lib/api/client';
import { SearchParams, PageResponse } from '@/types/foundation/system';

export interface NetworkStatusDetailed {
  sysNm: string;
  sysIp: string;
  sysPort: string;
  svcSttus: string;
  logDt: string;
}

/** 네트워크 토폴로지 화면이 사용하는 읽기 전용 모니터링 서비스. */
export const networkService = {
  /** 네트워크 서비스 상태 목록 조회 */
  getStatus: async (params?: SearchParams): Promise<PageResponse<NetworkStatusDetailed>> => {
    return client.get<PageResponse<NetworkStatusDetailed>>(
      '/admin/system/ntwrksvc-monitoring',
      { params }
    );
  },
};
