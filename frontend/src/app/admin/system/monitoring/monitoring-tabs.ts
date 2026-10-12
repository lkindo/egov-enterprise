/**
 * 감시 허브(/admin/system/monitoring/hub)의 탭과 `?tab=` 해석. 메뉴·별칭·알림이 `?tab=` 으로 여는 값은 탭 목적지 계약이
 * 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * 셸 고유 탭은 로그 셋·가동 상태다. 하네스 아틀라스 탭은 시연 기능의 hub-tabs 기여다(허브 분해 H3) — 이 목록에 없고, 화면이
 * 지금 보이는 기여 탭 값을 해석에 넘긴다. 댓글 탭은 없다 — 댓글 관리는 댓글 기능의 독립 화면(/admin/system/comments)이다(허브 분해 H6).
 * 그래서 `?tab=comments` 는 어떤 탭에도 맞지 않아 기본 탭을 연다.
 */
export type MonitoringTab = 'SECURITY' | 'SYSTEM' | 'LOGIN' | 'OBSERVABILITY';

export const MONITORING_TABS: readonly MonitoringTab[] = ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY'];

/**
 * `?tab=` 값을 탭으로. 대소문자를 가리지 않고 HEALTH 는 OBSERVABILITY 의 옛 이름이다. 셸 고유 탭이거나 지금 보이는 기여 탭
 * (contributed)일 때만 받는다. 이 구성에 없는 탭이면 null 이다 — 화면은 기본 탭을 연다.
 */
export function parseMonitoringTab(raw: string | null | undefined, contributed: readonly string[] = []): string | null {
  const tab = raw?.toUpperCase();
  const normalized = tab === 'HEALTH' ? 'OBSERVABILITY' : tab;
  return normalized && ((MONITORING_TABS as readonly string[]).includes(normalized) || contributed.includes(normalized)) ? normalized : null;
}

/** 탭 목적지 계약·경계 계약이 모으는 선언 — 이 해석이 받는 화면 경로, 기여를 받는 허브, 기여할 수 있는 탭. */
export const TAB_HUB = {
  routes: ['/admin/system/monitoring/hub'],
  parse: parseMonitoringTab,
  /** hub-tabs 기여의 hub 값(slots.ts 의 HubTabViews 키). */
  slotHub: 'monitoring',
  contributable: {
    HARNESS: 'frontend/src/extensions/showcase/hub-tabs.ts',
  },
} as const;
