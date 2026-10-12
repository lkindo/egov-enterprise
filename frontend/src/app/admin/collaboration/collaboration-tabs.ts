/**
 * 협업 허브(/admin/collaboration)의 탭과 `?tab=` 해석. 허브는 core 셸이고 탭은 모두 기능의 hub-tabs 기여다(쪽지·스크랩).
 * 메뉴·별칭·알림이 `?tab=` 으로 여는 값은 탭 목적지 계약이 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * contributable 은 이 허브에 탭을 기여할 수 있는 기여 파일의 지도다(탭 값 → 저장소 기준 경로). 경계 계약이 원본에서 실제 hub-tabs
 * 기여와 양방향으로 대조하고, 탭 목적지 계약은 생성물에서 그 파일이 투영으로 빠진 탭을 '빠진 기여' 로 가른다(오타와 구분한다).
 * 스크랩 화면(/admin/collaboration/scraps)은 스크랩 소유라 routes 에 넣지 않는다 — 쪽지만 고른 생성물에는 그 화면이 없다.
 */

/** 셸 고유 탭. 협업 허브는 고유 탭이 없다 — 탭은 모두 기여다. */
export const COLLABORATION_CORE_TABS: readonly string[] = [];

/**
 * `?tab=` 값을 탭으로. 대소문자를 가리지 않는다. 고유 탭이거나 지금 보이는 기여 탭(contributed)일 때만 받는다 — 이 구성에 없는
 * 탭이면 null 이고 화면은 기본 탭을 연다.
 */
export function parseCollaborationTab(raw: string | null | undefined, contributed: readonly string[] = []): string | null {
  const tab = raw?.toUpperCase();
  return tab && (COLLABORATION_CORE_TABS.includes(tab) || contributed.includes(tab)) ? tab : null;
}

/** 탭 목적지 계약·경계 계약이 모으는 선언 — 이 해석이 받는 화면 경로, 기여를 받는 허브, 기여할 수 있는 탭과 그 기여 파일. */
export const TAB_HUB = {
  routes: ['/admin/collaboration'],
  parse: parseCollaborationTab,
  /** hub-tabs 기여의 hub 값(slots.ts 의 HubTabViews 키). */
  slotHub: 'collaboration',
  contributable: {
    MESSAGES: 'frontend/src/extensions/note/hub-tabs.ts',
    SCRAPS: 'frontend/src/extensions/scrap/hub-tabs.ts',
  },
} as const;
