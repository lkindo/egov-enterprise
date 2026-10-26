/**
 * 게시판 선택지 출처 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 게시판 선택지를 화면마다 하드코딩하던 시절, 그 목록에 **시드에 없는 게시판**이 섞여 있었다.
 * `BBSMSTR_BBBBBBBBBBBB`('자유게시판')는 Flyway 시드 `R__seed_demo.sql` 의 VALUES 에 없고
 * 주석에만 "앱이 참조하는 … 은 라이브에도 존재하지 않는다 — 선택지에 죽은 게시판이 노출되는
 * 별도 결함으로 기록"이라고 적혀 있었다. 고르는 순간 목록 조회가 실패하고, 그 게시판으로 글을
 * 쓰면 등록이 거부된다.
 *
 * 라벨도 함께 어긋나 있었다 — 같은 `BBSMSTR_CCCCCCCCCCCC`(시드 제목 '업무게시판')를 한 화면은
 * '갤러리 게시판'이라고 불렀다. 하드코딩은 ID 와 이름 두 축 모두에서 원본과 어긋난다.
 *
 * 이 계약은 **출처**를 고정한다. 사용자에게 게시판을 고르게 하는 화면은 목록을 서버에서 받고,
 * 시드에 없는 상수를 선택지·기본값으로 쓰지 않는다. 값 하나를 지우는 것으로는 재발을 막지
 * 못한다 — 다음 화면이 같은 상수를 다시 하드코딩하면 그만이기 때문이다.
 *
 * 값 자체(`board-ids.ts`)는 데모 시드의 정의이므로 여기서 바꾸지 않는다. BBBB 를 만드는 시드·스크립트는
 * 없다 — 옛 선택형 스크립트 `sql/seed_knowledge_boards.sql` 은 존재하지 않는 테이블에 INSERT 해
 * 어떤 설치에서도 성공할 수 없었다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { inProjection, keepInProjection } from '@/test-utils/projection';

const SRC = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(SRC, relative), 'utf8');
// 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
const present = <T extends string>(files: readonly T[]) => keepInProjection(files, file => path.join(SRC, file));
const BOARD_OPTIONS_HOOK = 'hooks/api/use-board-options.ts';
const hookInProjection = inProjection(path.join(SRC, BOARD_OPTIONS_HOOK));

/** Flyway 시드가 실제로 INSERT 하는 게시판 ID 를 쓰지 않는 상수들. */
const UNSEEDED_CONSTANTS = [
  'FREE_BOARD_ID',
  'KNOWLEDGE_FALLBACK_BOARD_ID',
  'LEGACY_DEFAULT_BOARD_ID',
] as const;

/** 사용자가 게시판을 고르거나, 게시판 없이 진입하면 기본값이 필요한 화면들. */
const BOARD_CHOICE_SCREENS = [
  'app/admin/community/board/CommunityBoardClient.tsx',
  'app/admin/community/boards/select-board-list/page.tsx',
  'app/admin/help/KnowledgeHubClient.tsx',
  // 지식 허브 커뮤니티 탭의 게시판 ID 를 정하는 기여 뷰(허브 분해 H2)
  'components/business/community/knowledge-community-tab.tsx',
  // [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 들어온 작성 화면이 쓸 게시판을 고르는 화면
  'app/admin/community/boards/insert-board-article/BoardWritePicker.tsx',
] as const;

/** 주석 안의 이름을 참조로 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

describe('게시판 선택지는 서버 목록에서 온다', () => {
  it('선택지를 제공하는 화면은 시드에 없는 게시판 상수를 코드에서 쓰지 않는다', () => {
    const violations: string[] = [];

    for (const screen of present(BOARD_CHOICE_SCREENS)) {
      const code = stripComments(read(screen));
      for (const constant of UNSEEDED_CONSTANTS) {
        if (new RegExp(`\\b${constant}\\b`).test(code)) {
          violations.push(`${screen} — ${constant}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('게시판을 고르게 하는 화면은 useBoardOptions 로 목록을 받는다', () => {
    // [2026-09-05 DEC-OPS-034] 종전 세 화면 중 boards/[id] 작성 폼은 정본 작성 화면으로 수렴돼 삭제됐다.
    // [2026-09-25 DEC-OPS-130] /admin/community/[id] 도 정본 커뮤니티 상세로의 redirect 가 되어 선택 화면이
    //   하나 남는다. 목록 위치로 자르지 않고 이름으로 적는다 — 앞 항목이 빠지면 서버 기본값 화면이 끌려온다.
    const selectScreens = [
      'app/admin/community/board/CommunityBoardClient.tsx',
      'app/admin/community/boards/insert-board-article/BoardWritePicker.tsx',
    ] as const;
    for (const screen of present(selectScreens)) {
      const code = stripComments(read(screen));
      expect(code, `${screen} 가 게시판 목록을 서버에서 받지 않는다`).toContain('useBoardOptions');
    }
  });

  if (inProjection(path.join(SRC, 'app/admin/community/boards/select-board-list/page.tsx'))) it('bbsId 없이 들어오는 목록 화면은 상수가 아니라 실재 목록에서 기본값을 고른다', () => {
    const code = stripComments(read('app/admin/community/boards/select-board-list/page.tsx'));
    expect(code).toContain('resolveDefaultBoardId');
  });

  /*
   * [2026-10-23 ADR-0040 결정 11] 선택지의 출처는 서버의 사용자 선택지 API 하나다. 종전 단언 넷(화면의 사용 여부 필터, 관리자에게만
   * 관리 API, 시드 폴백의 내용, 폴백의 존재)은 그 구조가 사라져 아래 두 단언으로 바꿨다 — 같은 위험(죽은·닫힌 게시판이 선택지에
   * 오른다, 일반 사용자가 403 으로 아무것도 못 고른다)을 더 강하게 막는다.
   * '사용 안 함 제외'와 '커뮤니티 회원 거르기'는 이제 서버가 소유한다: BoardCommunityAccessTest$Options(회원·포트 없음·조회 대행
   * 권한)와 BoardMasterRepositoryTest#activeBoardOptionsExcludeClosedBoards(사용 중만).
   */
  if (hookInProjection) it('훅은 사용자 선택지 API 를 쓰고 관리 목록 API·관리 권한 분기를 쓰지 않는다', () => {
    const code = stripComments(read(BOARD_OPTIONS_HOOK));
    expect(code, '사용자 선택지 query option 을 쓰지 않는다').toContain('boardMasterQueryOptions.options()');
    for (const adminBoundary of ['boardAdminService', 'completeList', 'getBoardMasterList', 'BBS_MST_READ', 'canPermission']) {
      expect(code, `훅이 관리 경계(${adminBoundary})를 다시 쓴다`).not.toContain(adminBoundary);
    }
  });

  if (hookInProjection) it('훅은 시드 게시판 폴백을 두지 않는다 — 빈 결과·실패는 화면이 사실대로 알린다', () => {
    const code = stripComments(read(BOARD_OPTIONS_HOOK));
    for (const seed of ['SEEDED_FALLBACK', 'board-ids', 'NOTICE_BOARD_ID', 'TASK_BOARD_ID', 'QNA_BOARD_ID', 'WIKI_BOARD_ID',
      ...UNSEEDED_CONSTANTS]) {
      expect(code, `훅에 시드 폴백 흔적(${seed})이 있다`).not.toContain(seed);
    }
    for (const screen of present(['app/admin/community/board/CommunityBoardClient.tsx'] as const)) {
      expect(stripComments(read(screen)), `${screen} 가 빈 선택지를 알리지 않는다`).toContain('지금 이용할 수 있는 게시판이 없습니다.');
    }
  });

  it('시드에 없는 상수는 board-ids.ts 에서 경고와 함께 남는다 — 조용히 되살아나지 않도록', () => {
    // 값은 데모 데이터 정의라 지우지 않는다. 대신 다음 사람이 다시 배선하지 않도록 표시한다.
    const raw = read('config/board-ids.ts');
    for (const constant of UNSEEDED_CONSTANTS) {
      const declaration = raw.indexOf(`export const ${constant}`);
      expect(declaration, `${constant} 선언을 찾지 못했다`).toBeGreaterThan(-1);
      const preceding = raw.slice(Math.max(0, declaration - 900), declaration);
      expect(preceding, `${constant} 에 시드 부재 경고가 없다`).toContain('⚠');
    }
  });
});
