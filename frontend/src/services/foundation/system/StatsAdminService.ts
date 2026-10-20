import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import {
  getBbsStatsOperation,
  getConnectStats_1Operation,
  getDataUsageStatsOperation,
  getSummaryOperation,
  getUserStatsOperation,
} from '@/types/generated-operations';
import type { StatsPoint, UserActivityStats } from '@/types/generated-zod';

/**
 * 통계 관리 서비스(Admin) — `/api/v1/admin/system/statistics`
 *
 * [2026-10-20] 시계열 응답은 생성 계약의 `StatsPoint`(`date` yyyy-MM-dd · `value`) 한 모양이다. 서버가 날짜 오름차순으로 내고,
 * 측정하는 계열(성공 로그인·사용자 활동·게시물)은 기간의 빈 날을 0 으로 채운다. 자료 이용은 쓰는 쪽이 없어 채우지 않는다.
 * 종전의 손으로 쓴 `StatsDto`(늘 0 이던 필드 20여 개와 index signature)와 서버가 버리던 `statsKind` 는 걷었다 — 화면은
 * 받은 순서·형식 그대로 그린다. 사용자 활동은 요청 구분 네 계열(`UserActivityStats`)이다.
 */
export type { StatsPoint, UserActivityStats };

type DateRange = { fromDate?: string; toDate?: string };

/** 실린 키만 보낸다 — 기간을 고르지 않으면 서버 기본값(오늘까지 최근 1개월)이다. */
function toDateRange(params?: DateRange): DateRange {
  if (!params) return {};
  return {
    ...(params.fromDate === undefined ? {} : { fromDate: params.fromDate }),
    ...(params.toDate === undefined ? {} : { toDate: params.toDate }),
  };
}

class StatsAdminService extends ApiService {
  /** 요약 통계 조회 */
  async getSummary(config?: AxiosRequestConfig): Promise<Record<string, unknown>> {
    const response = await this.executeGenerated(getSummaryOperation, { config });
    return response as Record<string, unknown>;
  }

  /** 날짜별 성공 로그인 건수. 실패·결과 미상 시도와 화면 조회 요청은 포함하지 않는다. */
  async getConnectStats(params?: DateRange, config?: AxiosRequestConfig): Promise<StatsPoint[]> {
    return this.executeGenerated(getConnectStats_1Operation, { query: toDateRange(params), config });
  }

  /** 날짜별 등록 게시글 수(삭제한 글 제외). */
  async getBbsStats(params?: DateRange, config?: AxiosRequestConfig): Promise<StatsPoint[]> {
    return this.executeGenerated(getBbsStatsOperation, { query: toDateRange(params), config });
  }

  /** 날짜별 사용자 활동 — 조회·등록·수정·삭제 요청 수 네 계열(같은 날짜 축). */
  async getUserStats(params?: DateRange, config?: AxiosRequestConfig): Promise<UserActivityStats> {
    return this.executeGenerated(getUserStatsOperation, { query: toDateRange(params), config });
  }

  // [2026-10-19] 보고서 통계 조회(getReportStats)는 쓰는 쪽이 없는 원장만 읽어 API 와 함께 걷었다.

  /** 자료이용현황 통계 조회. 기록이 있는 날만 온다(빈 날을 채우지 않는다). */
  async getDataUsageStats(params?: DateRange, config?: AxiosRequestConfig): Promise<StatsPoint[]> {
    return this.executeGenerated(getDataUsageStatsOperation, { query: toDateRange(params), config });
  }
}

export const statsAdminService = new StatsAdminService();
