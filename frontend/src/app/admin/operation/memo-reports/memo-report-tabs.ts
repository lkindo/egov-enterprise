/**
 * 메모 보고(/admin/operation/memo-reports)의 탭과 `?tab=` 해석. 서버 알림이 여는 탭(MY)은 탭 목적지 계약이 이 해석과
 * 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`). 전체 탭(ALL)은 해석은 하지만 권한이 없으면 화면이
 * 받은 보고로 돌린다 — 계약은 탭 이름이 맞는지만 보고, 그 탭이 누구에게 보이는지는 보지 않는다.
 */
export const MEMO_REPORT_TABS = ['RECEIVED', 'MY', 'ALL'] as const;
export type MemoReportTab = (typeof MEMO_REPORT_TABS)[number];

/** `?tab=` 값을 탭으로(대소문자를 가린다). 모르는 값이면 null 이다 — 화면은 받은 보고를 연다. */
export function parseMemoReportTab(raw: string | null | undefined): MemoReportTab | null {
  return MEMO_REPORT_TABS.find((tab) => tab === raw) ?? null;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로. */
export const TAB_HUB = { routes: ['/admin/operation/memo-reports'], parse: parseMemoReportTab } as const;
