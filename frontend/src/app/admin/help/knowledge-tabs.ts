/**
 * 지식 허브(/admin/help·/admin/help/faq·/admin/help/qna)의 탭과 `?tab=` 해석. 메뉴·별칭·알림이 `?tab=` 으로 여는 값은
 * 탭 목적지 계약이 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * 셸은 게시판 소유이고 위키·FAQ·Q&A 는 셸 고유 탭이다(모두 게시판 데이터). 커뮤니티 탭은 커뮤니티 기능의 hub-tabs-knowledge 기여다(허브 분해 H2).
 * 메뉴(tb_menu_info)가 위키·FAQ·Q&A 를 모두 /admin/help/faq?tab=* 로 보낸다. 값은 대소문자를 가리지 않는다.
 */
export const KNOWLEDGE_TABS = ['WIKI', 'FAQ', 'QNA'] as const;
export type KnowledgeShellTab = (typeof KNOWLEDGE_TABS)[number];

/**
 * `?tab=` 값을 탭으로. 셸 고유 탭이거나 지금 보이는 기여 탭(contributed)일 때만 받는다. 모르는 값이면 null 이다 — 화면은
 * 페이지 기본 탭(없으면 위키)을 연다.
 */
export function parseKnowledgeTab(raw: string | null | undefined, contributed: readonly string[] = []): string | null {
  const tab = raw?.toUpperCase();
  return tab && ((KNOWLEDGE_TABS as readonly string[]).includes(tab) || contributed.includes(tab)) ? tab : null;
}

/** 탭 목적지 계약·경계 계약이 모으는 선언 — 이 해석이 받는 화면 경로(세 화면이 같은 허브를 그린다), 기여를 받는 허브, 기여할 수 있는 탭. */
export const TAB_HUB = {
  routes: ['/admin/help', '/admin/help/faq', '/admin/help/qna'],
  parse: parseKnowledgeTab,
  /** 허브(slots.ts 의 HubTabViews 키). 기여 슬롯은 hub-tabs-<slotHub> 다(GAP-SLOT-001). */
  slotHub: 'knowledge',
  contributable: {
    COMMUNITY: 'frontend/src/extensions/community/hub-tabs-knowledge.ts',
  },
} as const;
