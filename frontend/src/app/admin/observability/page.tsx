import { redirect } from 'next/navigation';

/**
 * `/admin/observability` 는 '시스템 통합 관제' 화면(액추에이터 지표 카드 4개 + `ServiceTopology` 샘플 구성도)을
 * 렌더했다. 그러나 next.config 의 리다이렉트가 이 경로를 이미 감시 허브의 가동 상태 탭으로 보내고 있었다(2026-08 통합,
 * 처분은 DEC-OPS-040 consolidate-to-canonical). next.config 는 화면 파일보다 먼저 적용되므로 이 파일은 실행된 적이 없다.
 * 같은 액추에이터 지표는 그 탭이 `monitoringQueryOptions` 로 보여 준다. 2026-10-18 사용자 결정으로 도달할 수 없던 화면 코드
 * (`ServiceTopology`·이 페이지의 시험)를 지우고 이 스텁만 남긴다.
 *
 * <p>라우트를 지우지 않고 보내는 이유는 `/admin/security/audit` 스텁과 같다 — 문자열 URL 참조는 정적 분석으로 잡히지
 * 않아 물리 삭제에 오삭제 전례가 있다(V2_30). 목적지는 next.config 의 목적지와 쿼리까지 같아야 한다 — 라우트 기능 원장
 * 계약(ui-route-capabilities)이 두 출처가 갈리면 red 로 잡는다.
 */
export default function ObservabilityRedirectPage() {
  redirect('/admin/system/monitoring/hub?tab=observability');
}
