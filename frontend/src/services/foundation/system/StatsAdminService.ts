import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * 통계 관리 서비스(Admin) — `/api/v1/admin/system/statistics`
 *
 * ⚠ 백엔드 계약(2026-07-22 감사 P0-21 반영):
 * `StatisticsApiController#convertToStatsDto` 는 집계 결과에서 `statsDate`, `statsCo`
 * **2개 필드만** 빌드한다. 나머지 필드(`creatCo`/`inqCnt`/`updtCo`/`deleteCo`/`errorCo` 등)는
 * 백엔드 DTO 에 선언만 되어 있고 값이 채워지지 않아 항상 `0` 으로 직렬화된다.
 * 따라서 차트 `dataKey` 나 지표 산식에 사용해서는 안 되며, 여기서도 optional 로 선언한다.
 * (이전 버전은 이들을 non-optional 로 "거짓 선언"하여 빈 차트를 유발했다.)
 */
export interface StatsDto {
  /** 집계 일자(yyyyMMdd) — 백엔드가 실제로 채우는 필드 */
  statsDate?: string;
  /** 집계 건수 — 백엔드가 실제로 채우는 필드 */
  statsCo?: number;

  /* --- 이하: 백엔드 DTO 에 존재하나 현재 집계 쿼리가 채우지 않음(항상 0). 신규 사용 금지. --- */
  creatCo?: number;
  inqCnt?: number;
  updtCo?: number;
  deleteCo?: number;
  errorCo?: number;
  [key: string]: unknown;
}

class StatsAdminService extends AdminService {
  constructor() {
    super('/statistics');
  }

  /** 요약 통계 조회 */
  async getSummary(config?: AxiosRequestConfig) {
    return this.get<Record<string, unknown>>('/summary', config);
  }

  /** 접속 통계 조회 (시스템 활성/화면 요청 지표의 유일한 실존 소스) */
  async getConnectStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/connect', { ...config, params });
  }

  /** 게시물 통계 조회 */
  async getBbsStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/bbs', { ...config, params });
  }

  /** 사용자 통계 조회 */
  async getUserStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/user', { ...config, params });
  }

  /** 보고서 통계 조회 */
  async getReportStats(params?: { fromDate?: string; toDate?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/report', { ...config, params });
  }

  /** 자료이용현황 통계 조회 */
  async getDataUsageStats(params?: { fromDate?: string; toDate?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/data-usage', { ...config, params });
  }
}

export const statsAdminService = new StatsAdminService();
