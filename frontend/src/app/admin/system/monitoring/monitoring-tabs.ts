/**
 * 감시 허브(/admin/system/monitoring/hub)의 탭과 `?tab=` 해석. 메뉴·별칭·알림이 `?tab=` 으로 여는 값은 탭 목적지 계약이
 * 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * 댓글 탭은 협업 팩, 하네스 아틀라스 탭은 시연 팩이라 축소 구성에서는 아래 목록에서 함께 빠진다.
 */
export type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY' | 'COMMENTS' | 'HARNESS';

export const MONITORING_TABS: readonly MonitoringTab[] = ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY',
  /* reusable-base:collaboration:start */
  'COMMENTS',
  /* reusable-base:collaboration:end */
  /* reusable-base:demo:start */
  'HARNESS',
  /* reusable-base:demo:end */
];

/**
 * `?tab=` 값을 탭으로. 대소문자를 가리지 않고 HEALTH 는 OBSERVABILITY 의 옛 이름이다. 이 구성에 없는 탭이면 null 이다 —
 * 화면은 기본 탭을 연다.
 */
export function parseMonitoringTab(raw: string | null | undefined): MonitoringTab | null {
  const tab = raw?.toUpperCase();
  const normalized = (tab === 'HEALTH' ? 'OBSERVABILITY' : tab) as MonitoringTab | undefined;
  return normalized && MONITORING_TABS.includes(normalized) ? normalized : null;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로. */
export const TAB_HUB = { routes: ['/admin/system/monitoring/hub'], parse: parseMonitoringTab } as const;
