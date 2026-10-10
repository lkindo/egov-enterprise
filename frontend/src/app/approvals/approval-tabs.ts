import type { ApprovalTab } from '@/queries/approval-query-options';

/**
 * 결재함(/approvals)이 알림 주소에서 읽는 탭(2026-10-03 D1). 서버 알림이 `?tab=PENDING&doc=N` 처럼 보내며, 형식이 틀리면
 * 기본 화면으로 연다. 참조자 지정·최종 결과 알림은 `?tab=REFERENCED&doc=N` 이다(D4) — 빠뜨리면 참조 문서가 대기함 아래에
 * 열린다. 서버 알림이 여는 탭은 탭 목적지 계약이 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 */
export function linkedTab(value: string | null | undefined): ApprovalTab | null {
  return value === 'PENDING' || value === 'SUBMITTED' || value === 'PROCESSED' || value === 'REFERENCED' ? value : null;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로. */
export const TAB_HUB = { routes: ['/approvals'], parse: linkedTab } as const;
