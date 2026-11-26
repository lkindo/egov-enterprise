/**
 * 지식 허브(관리자 > 도움말·지식)의 조회 키 — 문서 목록, 인기 문서, 분류별 통계. 지식 허브가 조회하고, 게시글 상세가 글을 지운 뒤
 * 세 뿌리를 무효화한다(뒤로 가기가 남은 캐시로 지운 글을 다시 보이지 않게). 화면은 뿌리 뒤에 분류·검색 조건을 배열로 직접 펼친다.
 *
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */
export const knowledgeKeys = {
  articlesRoot: ['knowledge-articles'] as const,
  hotRoot: ['hot-articles'] as const,
  statsRoot: ['knowledge-stats'] as const,
};
