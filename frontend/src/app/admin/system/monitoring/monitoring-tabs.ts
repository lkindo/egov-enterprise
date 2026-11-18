/** 모니터링 허브가 지원하는 탭. HEALTH 는 가동 상태 탭의 기존 주소다. */
export const MONITORING_TABS = ['SECURITY', 'SYSTEM', 'LOGIN', 'OBSERVABILITY'] as const;
export type MonitoringTab = typeof MONITORING_TABS[number];

export function parseMonitoringTab(raw: string | null | undefined): MonitoringTab | null {
  const tab = raw?.toUpperCase();
  return tab === 'HEALTH' ? 'OBSERVABILITY' : MONITORING_TABS.find((value) => value === tab) ?? null;
}

export const TAB_HUB = {
  routes: ['/admin/system/monitoring/hub'],
  parse: parseMonitoringTab,
} as const;
