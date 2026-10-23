import { COMMUNITY_BOARD_ID, HELP_FAQ_BOARD_ID, QNA_BOARD_ID, WIKI_BOARD_ID } from '@/config/board-ids';
import type { KnowledgeShellTab } from './knowledge-tabs';

/**
 * 지식 허브 탭이 그리는 게시판(ADR-0040 결정 8). 허브 셸과 게시판 운영 화면(메뉴 연결 판정)이 같은 대응을 쓴다.
 *
 * 탭 해석 모듈(`knowledge-tabs.ts`)은 실행 import 를 둘 수 없어(탭 목적지 계약) 게시판 ID 를 이 중립 모듈에 둔다. 이름이
 * `-tabs.ts` 로 끝나지 않는 것도 그 때문이다.
 *
 * ⚠ 같은 'FAQ' 라도 축마다 게시판이 다르다(H4) — 허브 FAQ 탭은 HELP_FAQ_BOARD_ID 이고, knowledgeService 의 FAQ 카테고리는 다른
 *   상수다. 메뉴 연결은 사용자가 보는 허브 탭을 따라야 하므로 이 대응을 쓴다.
 */
export const KNOWLEDGE_SHELL_TAB_BOARDS: Readonly<Record<KnowledgeShellTab, string>> = {
  WIKI: WIKI_BOARD_ID,
  FAQ: HELP_FAQ_BOARD_ID,
  QNA: QNA_BOARD_ID,
};

/**
 * 기여 탭이 그리는 게시판. 커뮤니티 탭의 게시판은 커뮤니티 기능 파일을 import 하지 않고 core 상수로 대응한다(knowledgeService
 * 선례) — 커뮤니티를 뺀 구성에서도 이 모듈이 남는다. 그 구성에서는 허브에 탭이 없으므로 판정이 연결을 찾지 못할 뿐이다.
 */
export const KNOWLEDGE_CONTRIBUTED_TAB_BOARDS: Readonly<Record<string, string>> = {
  COMMUNITY: COMMUNITY_BOARD_ID,
};

/** 허브 탭 값(대소문자 무시)이 그리는 게시판. 모르는 탭이면 null 이다. */
export function knowledgeTabBoard(tab: string | null | undefined): string | null {
  const key = tab?.toUpperCase();
  if (!key) return null;
  return (KNOWLEDGE_SHELL_TAB_BOARDS as Readonly<Record<string, string>>)[key]
    ?? KNOWLEDGE_CONTRIBUTED_TAB_BOARDS[key]
    ?? null;
}

/** 이 게시판을 그리는 허브 탭(셸 탭 다음 기여 탭 순서). 없으면 빈 배열이다 — 사용 안 함으로 바꿀 때 사용처를 알리는 데 쓴다. */
export function knowledgeTabsForBoard(bbsId: string | null | undefined): string[] {
  if (!bbsId) return [];
  return [...Object.entries(KNOWLEDGE_SHELL_TAB_BOARDS), ...Object.entries(KNOWLEDGE_CONTRIBUTED_TAB_BOARDS)]
    .filter(([, board]) => board === bbsId)
    .map(([tab]) => tab);
}
