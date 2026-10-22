/**
 * 게시판 운영 화면(/admin/community/boards/master/[id])의 탭과 `?tab=` 해석(ADR-0040 결정 2). 탭 목적지 계약이 이 해석과
 * 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * 탭: posts(게시물 — 게시물 조회 대행 권한이 있을 때만), settings(설정, 기본), access(메뉴·접근). 대소문자를 가린다.
 * 운영 화면 주소는 `boardOperationsHref` 로만 만든다 — 탭 값을 타입으로 묶기 위해서다(탭 목적지 계약은 경로에 식 자리가 든
 * 템플릿 리터럴을 세지 않는다). 메뉴·별칭에 구체 ID 가 든 운영 화면 주소를 등록하지 않는다. 이 모듈은 실행 import 를 두지 않는다.
 */
export const BOARD_OPERATIONS_TABS = ['posts', 'settings', 'access'] as const;
export type BoardOperationsTab = (typeof BOARD_OPERATIONS_TABS)[number];

export const DEFAULT_BOARD_OPERATIONS_TAB: BoardOperationsTab = 'settings';

/** 운영 화면이 받는 게시판 ID 형식 — `BBSMSTR_` 뒤 대문자·숫자 12자(생성기·이관 도구·시드가 만드는 ID). 아니면 없는 화면이다. */
export const BOARD_OPERATIONS_ID_PATTERN = /^BBSMSTR_[A-Z0-9]{12}$/;

export function isBoardOperationsId(id: string | null | undefined): id is string {
  return typeof id === 'string' && BOARD_OPERATIONS_ID_PATTERN.test(id);
}

/** `?tab=` 값을 탭으로. 모르는 값이면 null 이다 — 화면은 기본 탭(설정)을 연다. */
export function parseBoardOperationsTab(raw: string | null | undefined): BoardOperationsTab | null {
  return raw && (BOARD_OPERATIONS_TABS as readonly string[]).includes(raw) ? (raw as BoardOperationsTab) : null;
}

/** 운영 화면 주소. 기본 탭이면 `tab` 을 싣지 않는다. 게시판 ID 는 경로에만 있다(`?bbsId=` 를 싣지 않는다 — 결정 2). */
export function boardOperationsHref(bbsId: string, tab: BoardOperationsTab = DEFAULT_BOARD_OPERATIONS_TAB): string {
  const path = `/admin/community/boards/master/${encodeURIComponent(bbsId)}`;
  return tab === DEFAULT_BOARD_OPERATIONS_TAB ? path : `${path}?tab=${tab}`;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로. */
export const TAB_HUB = { routes: ['/admin/community/boards/master/[id]'], parse: parseBoardOperationsTab } as const;
