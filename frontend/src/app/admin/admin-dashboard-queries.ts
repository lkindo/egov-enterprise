/**
 * 관리자 홈(/admin)의 조회 키와 권한 — 서버 page(미리 채우기)와 클라이언트(AdminDashboardClient)가 함께 쓴다. 'use client' 가 없는
 * 모듈이라 서버와 브라우저가 같은 값을 읽는다.
 *
 * [2026-10-20] 조회마다 그 API 의 권한을 둔다. 서버는 그 권한이 있을 때만 미리 채우고 화면은 그 권한이 있을 때만 부르고 그린다 —
 * 관리자 홈 권한(DASHBOARD_ADMIN_READ)만으로 사용자·권한·시스템 로그 조회를 부르지 않는다(H3, DEC-OPS-152·185).
 */
export const ADMIN_DASHBOARD_QUERY_KEYS = {
  recentFailedRequests: ['admin-dashboard-recent-failed-requests'],
  users: ['admin-dashboard-users'],
  authors: ['admin-dashboard-authors'],
  operationalSignals: ['admin-dashboard-operational-signals'],
} as const;

/** 조회 → 그 API 의 서버 권한(operation-bindings). */
export const ADMIN_DASHBOARD_QUERY_PERMISSIONS = {
  recentFailedRequests: 'SYS_LOG_READ',
  users: 'USER_READ',
  authors: 'AUTHRT_READ',
  operationalSignals: 'DASHBOARD_ADMIN_READ',
} as const satisfies Record<keyof typeof ADMIN_DASHBOARD_QUERY_KEYS, string>;

/** 실패 요청(tb_sys_log, 4xx 이상)을 보는 실제 화면. 리다이렉트 스텁(/admin/system/audit)이 아니다. */
export const SYSTEM_LOG_ROUTE = '/admin/system/logs/system';
