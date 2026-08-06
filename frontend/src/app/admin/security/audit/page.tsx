import { redirect } from 'next/navigation';

/**
 * `/admin/security/audit` 는 `MonitoringHubClient` 를 기본 탭으로 렌더하기만 하는 6줄 래퍼였다.
 * 같은 화면을 `9040310 '보안 감사 로그'` 가 `monitoring/hub?tab=security` 로 이미 가리키고 있어
 * 중복 진입점이며, 이 경로를 가리키는 메뉴는 없다(실측 2026-08-06).
 *
 * <p>라우트를 지우지 않고 보내는 이유는 형제 `/admin/survey/*` 스텁들과 같다 —
 * 문자열 URL 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30).
 *
 * <p>⚠ 이름이 비슷한 `/admin/system/audit` 는 <b>다른 화면</b>이다(`AuditTimelineClient` 405줄 —
 * 보안 감사 타임라인). 그쪽은 실기능인데 메뉴가 없어 V2_48 로 메뉴를 부여했다. 혼동하지 말 것.
 */
export default function SecurityAuditRedirectPage() {
  redirect('/admin/system/monitoring/hub?tab=security');
}
