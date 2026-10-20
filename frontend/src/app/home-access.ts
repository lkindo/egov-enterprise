import { canPermission } from '@/lib/auth/permissions';

/**
 * 업무 홈 진입 판정(Phase 2 9단계). 서버 자식(home-data-boundary.tsx)과 셸(UnifiedDashboardClient.tsx)이 같은 함수로 판정한다.
 *
 * 업무 홈에 기능이 기여한 자리(home-sections)가 하나라도 등록돼 있으면 DASHBOARD_READ 가 있어야 업무 데이터를 보인다 — 없으면 셸이
 * 종전 문구로 접근 불가를 알리고 서버는 미리 채우지 않는다. '보이는 기여' 가 아니라 '등록된 기여' 로 판정한다: 보이는 기여로 판정하면
 * DASHBOARD_READ 도 쪽지 권한도 없는 사용자가 접근 불가 대신 빈 홈을 본다. 등록된 기여가 없는 구성(core 프리셋)은 판정 없이 제목·
 * 인사와 core 셸의 카드(부서 업무 — 그 API 권한으로 보인다)만 보인다.
 */
export function homeAccessDenied(subject: Parameters<typeof canPermission>[0], registered: boolean): boolean {
  return registered && !canPermission(subject, 'DASHBOARD_READ');
}
