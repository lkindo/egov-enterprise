
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


export interface SummaryStats {
  /** 숫자로 읽을 수 없는 값은 null 이다 — 0 으로 바꾸지 않는다(모르는 값은 0 이 아니다). */
  totalUsers: number | null;
  totalPosts: number | null;
  todayConnects: number | null;
}


