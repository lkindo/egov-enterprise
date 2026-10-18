import { redirect } from 'next/navigation';

/**
 * `/admin/system/audit` 는 '보안 감사 타임라인' 화면(`AuditTimelineClient` + `TimelineItem`)을 렌더했다. 그러나
 * next.config 의 리다이렉트가 이 경로를 이미 감시 허브의 시스템 로그 탭으로 보내고 있었다(2026-08 통합, 처분은
 * DEC-OPS-040 consolidate-to-canonical). next.config 는 화면 파일보다 먼저 적용되므로 이 파일은 실행된 적이 없다 —
 * V2_48 이 이 경로에 메뉴(9040400)를 주었을 때도 그 메뉴는 허브에 닿았고, 그 메뉴는 V2_100(ADR-0017)이 9040320 으로
 * 합쳐 걷었다. 같은 시스템 감사 로그는 그 탭이 보여 준다. 2026-10-18 사용자 결정으로 도달할 수 없던 화면 코드를 지우고
 * 이 스텁만 남긴다.
 *
 * <p>라우트를 지우지 않고 보내는 이유: 관리자 홈 링크·e2e 가 이 문자열 URL 을 가리키고, 문자열 URL 참조는 정적 분석으로
 * 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30). 목적지는 next.config 의 목적지와 쿼리까지 같아야 한다 — 라우트 기능
 * 원장 계약(ui-route-capabilities)이 두 출처가 갈리면 red 로 잡는다.
 */
export default function SystemAuditRedirectPage() {
  redirect('/admin/system/monitoring/hub?tab=system');
}
