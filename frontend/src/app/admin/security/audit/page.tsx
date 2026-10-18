import { redirect } from 'next/navigation';

/**
 * `/admin/security/audit` 는 `MonitoringHubClient` 를 기본 탭으로 렌더하기만 하는 6줄 래퍼였다.
 * 같은 화면을 `9040310 '보안 감사 로그'` 가 `monitoring/hub?tab=security` 로 이미 가리키고 있어
 * 중복 진입점이며, 이 경로를 가리키는 메뉴는 없다(실측 2026-08-06).
 *
 * <p>라우트를 지우지 않고 보내는 이유는 형제 `/admin/survey/*` 스텁들과 같다 —
 * 문자열 URL 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30).
 *
 * <p>이름이 비슷한 `/admin/system/audit` 도 이제 같은 형태의 스텁이다(목적지는 `?tab=system`). 종전 이 자리의
 * 경고는 그쪽을 메뉴가 있는 실기능(`AuditTimelineClient`, V2_48 메뉴 부여)으로 적었지만, next.config 리다이렉트가 그
 * 화면을 처음부터 가리고 있었고 메뉴는 V2_100(ADR-0017)이 걷었다. 2026-10-18 그 화면 코드를 지웠다.
 */
export default function SecurityAuditRedirectPage() {
  redirect('/admin/system/monitoring/hub?tab=security');
}
