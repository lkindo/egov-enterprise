interface ConnectStats {
  statsDate: string; // Aligned with backend statsDate
  statsCo: number; // Aligned with backend statsCo
}

/**
 * 접속 통계 차트/표에서 사용하는 정규화 포인트.
 * (`/admin/system/statistics/connect` 응답을 화면용으로 가공한 형태)
 */
export interface ConnectPoint {
  /** 원본 집계 일자(yyyyMMdd) */
  statsDate: string;
  /** 축 라벨(MM/DD) */
  name: string;
  /** 집계 건수 */
  statsCo: number;
}

/*
 * NOTE: `MenuStats` 는 제거되었다. 이를 채우던 `/statistics/menu` 엔드포인트가
 * 백엔드에 존재하지 않아(2026-07-22 감사 P0-22) 항상 404 → 빈 배열이었다.
 * 메뉴별 통계가 필요해지면 백엔드 집계 API 신설과 함께 재도입할 것.
 */

interface UserActivityStats {
  userId: string;
  userNm: string;
  postCount: number;
  commentCount: number;
}

export interface SummaryStats {
  totalUsers: number;
  totalPosts: number;
  todayConnects: number;
}

interface StatsVO {
  statsId: string;
  statsSe: string;
  statsCn: string;
  crtDt: string;
}

interface StatsSearchParams {
  statsSe?: string;
  searchPeriod?: string;
  statsKind?: string;
  fromDate?: string;
  toDate?: string;
  pageNo?: number;
  pageIndex?: number;
  page?: number;
  size?: number;
}
