/**
 * 데모 게시판 인스턴스 ID 상수 (Frontend SSOT)
 * - 데모 시드(api-server R__seed_demo.sql, sql/seed_knowledge_boards.sql)가 정의하는
 *   BBSMSTR_* 인스턴스 ID의 프론트엔드 단일 정의처다. 백엔드 설정 nuri.boards.*
 *   (api-server application.yml)의 데모 값과 동일하다.
 * - 값 자체는 데모 데이터의 정의이므로 여기서 바꾸지 않는다. 다른 제품은 이 모듈만
 *   자기 게시판 ID로 교체한다.
 * - 주의(H4): 같은 인스턴스 ID라도 사용처(축)마다 의미가 다르다. 아래 별칭 상수는
 *   기존 코드가 실제로 쓰던 대응을 값 변경 없이 그대로 보존한 것이다.
 */

/** 공지사항 게시판 (시드 '공지사항'). 커뮤니티 관리 화면들의 기본 게시판이기도 하다. */
export const NOTICE_BOARD_ID = 'BBSMSTR_AAAAAAAAAAAA';

/** 자유게시판 (커뮤니티 관리 화면 옵션 축) / 지식 허브 시드에서는 FAQ 게시판. */
export const FREE_BOARD_ID = 'BBSMSTR_BBBBBBBBBBBB';

/** 업무게시판 (시드 '업무게시판') — 지식 허브에서는 COMMUNITY 카테고리로 쓰인다. */
export const TASK_BOARD_ID = 'BBSMSTR_CCCCCCCCCCCC';

/** Q&A 게시판 (시드 'Q&A 게시판'). */
export const QNA_BOARD_ID = 'BBSMSTR_DDDDDDDDDDDD';

/** 위키/일정 게시판 — 지식 허브 WIKI 카테고리. */
export const WIKI_BOARD_ID = 'BBSMSTR_EEEEEEEEEEEE';

/** 지식 허브 카테고리 미매칭 시 폴백 게시판 (KnowledgeHubClient DEFAULT/NOTICE 축). */
export const KNOWLEDGE_FALLBACK_BOARD_ID = 'BBSMSTR_NNNNNNNNNNNN';

/** 레거시 커뮤니티 목록 화면의 기본 게시판 ID. */
export const LEGACY_DEFAULT_BOARD_ID = 'BBSMSTR_000000000001';

/**
 * help/user 축 FAQ 게시판 — 데모 시드에서 FAQ는 공지 게시판(AAAA)으로 통합돼 있다
 * (HelpUserService·KnowledgeHubClient가 쓰던 기존 대응 보존).
 */
export const HELP_FAQ_BOARD_ID = NOTICE_BOARD_ID;

/**
 * knowledgeService 축 FAQ 게시판 — sql/seed_knowledge_boards.sql 의 FAQ 게시판(BBBB).
 * help 축(AAAA)과 인스턴스가 다르다는 기존 불일치를 값 그대로 보존한다(H4).
 */
export const KNOWLEDGE_FAQ_BOARD_ID = FREE_BOARD_ID;

/** 지식 허브 COMMUNITY 카테고리 게시판 — 업무게시판(CCCC)과 같은 인스턴스다. */
export const COMMUNITY_BOARD_ID = TASK_BOARD_ID;
