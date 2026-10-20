
/*
 * NOTE: 접속 통계 화면용 `ConnectPoint`(저장 형식 일자·축 라벨·건수)는 2026-10-20 걷었다. 서버가 모든 시계열을 생성 계약의
 * `StatsPoint`(`date` yyyy-MM-dd 오름차순 · `value`) 한 모양으로 내므로 화면이 날짜를 다시 가공하지 않는다
 * (`@/services/foundation/system/StatsAdminService` 가 그 타입을 다시 내보낸다).
 *
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


