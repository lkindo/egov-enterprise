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

/**
 * 자유게시판 / 지식 허브 시드의 FAQ 게시판.
 *
 * ⚠ **Flyway 시드(R__seed_demo.sql)의 VALUES 에 없다** — 그 파일 주석이 "라이브에도 존재하지
 *   않는다"고 직접 적어 두었다. 선택형 스크립트 sql/seed_knowledge_boards.sql 을 실행한 설치에만
 *   존재한다. 사용자에게 보이는 **게시판 선택지에 이 상수를 쓰지 말 것** — 고르는 순간 목록 조회가
 *   실패하고 그 게시판으로 글을 쓰면 등록이 거부된다(2026-08-28 실측으로 세 화면에서 제거).
 *   선택지는 useBoardOptions()로 게시판 마스터에서 채운다.
 */
export const FREE_BOARD_ID = 'BBSMSTR_BBBBBBBBBBBB';

/** 업무게시판 (시드 '업무게시판') — 지식 허브에서는 COMMUNITY 카테고리로 쓰인다. */
export const TASK_BOARD_ID = 'BBSMSTR_CCCCCCCCCCCC';

/** Q&A 게시판 (시드 'Q&A 게시판'). */
export const QNA_BOARD_ID = 'BBSMSTR_DDDDDDDDDDDD';

/** 위키/일정 게시판 — 지식 허브 WIKI 카테고리. */
export const WIKI_BOARD_ID = 'BBSMSTR_EEEEEEEEEEEE';

/**
 * ⚠ **어떤 시드에도 없다** — Flyway·sql/ 전량 grep 에서 등장처가 테스트 목뿐이다(2026-08-28 실측).
 * 종전 KnowledgeHubClient 의 DEFAULT/NOTICE 폴백이었고, 그래서 그 경로는 늘 빈 화면이었다.
 * 지금은 NOTICE_BOARD_ID 를 쓴다. 새로 배선하지 말 것.
 */
export const KNOWLEDGE_FALLBACK_BOARD_ID = 'BBSMSTR_NNNNNNNNNNNN';

/**
 * ⚠ **어떤 시드에도 없다** — Flyway·sql/ 전량 grep 에서 등장처가 테스트 목뿐이다(2026-08-28 실측).
 * 종전 /admin/community/boards/select-board-list 의 무인자 진입 기본값이었고, 그래서 bbsId 없이
 * 들어오면 늘 빈 목록이었다. 지금은 resolveDefaultBoardId()가 실재 목록에서 고른다. 새로 배선하지 말 것.
 */
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
