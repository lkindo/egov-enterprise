import { redirect } from 'next/navigation';

/**
 * `/admin/system/monitoring` 은 정본 모니터링 허브(`/admin/system/monitoring/hub`)로 보낸다.
 *
 * [2026-09-06 DEC-OPS-040] 이 라우트는 `hub/page.tsx` 와 같은 `MonitoringHubClient` 를 같은 Suspense 경계로
 * 한 번 더 렌더하고 있었다(overlay 제안 consolidate-to-canonical → owner 승인). `/admin/observability`·
 * `/admin/security/audit`·`/admin/system/audit` 의 config redirect 목적지가 이미 `hub?tab=*` 이므로 정본은
 * 허브다. `?tab=` 은 허브가 URL 에서 읽으며, 이 별칭에 탭을 실어 오는 인바운드 링크는 없다(실측).
 */
export default function MonitoringRedirectPage() {
  redirect('/admin/system/monitoring/hub');
}
