/**
 * 지식 허브(/admin/help·/admin/help/faq·/admin/help/qna)의 탭과 `?tab=` 해석. 메뉴·별칭·알림이 `?tab=` 으로 여는 값은
 * 탭 목적지 계약이 이 해석과 대조한다(`src/__tests__/cross-stack/tab-destination-contract.test.ts`).
 *
 * 메뉴(tb_menu_info)가 위키·FAQ·Q&A 를 모두 /admin/help/faq?tab=* 로 보낸다. 값은 대소문자를 가리지 않는다.
 */
export const KNOWLEDGE_TABS = ['WIKI', 'FAQ', 'QNA', 'COMMUNITY'] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_TABS)[number];

/** `?tab=` 값을 탭으로. 모르는 값이면 null 이다 — 화면은 페이지 기본 탭(없으면 위키)을 연다. */
export function parseKnowledgeTab(raw: string | null | undefined): KnowledgeCategory | null {
  const tab = raw?.toUpperCase();
  return tab && (KNOWLEDGE_TABS as readonly string[]).includes(tab) ? (tab as KnowledgeCategory) : null;
}

/** 탭 목적지 계약이 모으는 선언 — 이 해석이 받는 화면 경로(세 화면이 같은 허브를 그린다). */
export const TAB_HUB = { routes: ['/admin/help', '/admin/help/faq', '/admin/help/qna'], parse: parseKnowledgeTab } as const;
