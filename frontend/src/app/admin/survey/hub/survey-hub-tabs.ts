/**
 * 설문 허브의 탭과 `?tab=` 해석. 메뉴·별칭·알림이 `?tab=` 으로 여는 값은 탭 목적지 계약이 이 해석과 대조한다
 * (`src/__tests__/cross-stack/tab-destination-contract.test.ts`). 탭을 걷거나 이름을 바꾸면 그 값을 쓰는 메뉴도 함께 고친다.
 *
 * [2026-09-08 PD-SRVY-001] 응답자 탭은 걷었다. items('항목관리')는 탭으로 둔 적이 없다 — 항목은 문항 하위 자원이다.
 */
export const SURVEY_TABS = ['manage', 'questions', 'templates', 'stats'] as const;
export type SurveyTab = (typeof SURVEY_TABS)[number];

export const DEFAULT_SURVEY_TAB: SurveyTab = 'manage';

/** `?tab=` 값을 탭으로. 모르는 값(오타·구메뉴·걷은 탭)이면 null 이다 — 화면은 기본 탭을 연다. */
export function parseSurveyTab(raw: string | null | undefined): SurveyTab | null {
  return raw && (SURVEY_TABS as readonly string[]).includes(raw) ? (raw as SurveyTab) : null;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로. */
export const TAB_HUB = { routes: ['/admin/survey/hub'], parse: parseSurveyTab } as const;
