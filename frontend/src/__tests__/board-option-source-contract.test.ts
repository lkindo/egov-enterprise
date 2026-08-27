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
 * 값 자체(`board-ids.ts`)는 데모 시드의 정의이므로 여기서 바꾸지 않는다. 선택형 스크립트
 * `sql/seed_knowledge_boards.sql` 을 실행한 설치에는 BBBB 가 실제로 존재한다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(SRC, relative), 'utf8');

/** Flyway 시드가 실제로 INSERT 하는 게시판 ID 를 쓰지 않는 상수들. */
const UNSEEDED_CONSTANTS = [
  'FREE_BOARD_ID',
  'KNOWLEDGE_FALLBACK_BOARD_ID',
  'LEGACY_DEFAULT_BOARD_ID',
] as const;

/** 사용자가 게시판을 고르거나, 게시판 없이 진입하면 기본값이 필요한 화면들. */
const BOARD_CHOICE_SCREENS = [
  'app/admin/community/board/CommunityBoardClient.tsx',
  'app/admin/community/boards/[id]/CommunityBoardsDetailClient.tsx',
  'app/admin/community/[id]/CommunityDetailClient.tsx',
  'app/admin/community/boards/select-board-list/page.tsx',
  'app/admin/help/KnowledgeHubClient.tsx',
] as const;

/** 주석 안의 이름을 참조로 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

describe('게시판 선택지는 서버 목록에서 온다', () => {
  it('선택지를 제공하는 화면은 시드에 없는 게시판 상수를 코드에서 쓰지 않는다', () => {
    const violations: string[] = [];

    for (const screen of BOARD_CHOICE_SCREENS) {
      const code = stripComments(read(screen));
      for (const constant of UNSEEDED_CONSTANTS) {
        if (new RegExp(`\\b${constant}\\b`).test(code)) {
          violations.push(`${screen} — ${constant}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('게시판을 고르게 하는 세 화면은 useBoardOptions 로 목록을 받는다', () => {
    const selectScreens = BOARD_CHOICE_SCREENS.slice(0, 3);
    for (const screen of selectScreens) {
      const code = stripComments(read(screen));
      expect(code, `${screen} 가 게시판 목록을 서버에서 받지 않는다`).toContain('useBoardOptions');
    }
  });

  it('bbsId 없이 들어오는 목록 화면은 상수가 아니라 실재 목록에서 기본값을 고른다', () => {
    const code = stripComments(read('app/admin/community/boards/select-board-list/page.tsx'));
    expect(code).toContain('resolveDefaultBoardId');
  });

  it('훅은 비활성(useYn=N) 게시판을 선택지에서 제외한다', () => {
    // 구현이 필터를 잃으면 폐지된 게시판이 다시 선택지에 오른다.
    const code = stripComments(read('hooks/api/use-board-options.ts'));
    expect(code).toContain("useYn !== 'N'");
  });

  it('훅은 관리자에게만 관리자 전용 API 를 호출한다 — 일반 사용자에게 403 으로 선택지를 비우지 않는다', () => {
    /*
     * 이 훅을 쓰는 세 화면은 proxy.ts 의 USER_ACCESSIBLE_ADMIN_PATHS('/admin/community')로
     * **일반 사용자에게 열려 있다.** 그런데 게시판 마스터 목록은 /api/v1/admin/** 아래에 있고
     * ApiSecurityConfig 가 그 경로를 ROLE_ADMIN·ROLE_SYSTEM 으로 강제한다. 역할을 보지 않고
     * 조회하면 일반 사용자에게 403 이 떨어져 선택지가 통째로 비고, "죽은 게시판이 섞여 있다"가
     * "아무 게시판도 못 고른다"로 악화된다.
     */
    const code = stripComments(read('hooks/api/use-board-options.ts'));
    expect(code, '관리자 판정 SSOT 를 쓰지 않는다').toContain('isAdministrativeRole');
    expect(code, '역할과 무관하게 조회한다').toMatch(/enabled:\s*isAdmin/);
  });

  it('폴백 목록에는 시드가 실제로 INSERT 하는 게시판만 들어간다', () => {
    // 폴백에 죽은 ID 를 넣으면 고치려던 결함이 비관리자에게 그대로 돌아온다.
    const code = stripComments(read('hooks/api/use-board-options.ts'));
    for (const constant of UNSEEDED_CONSTANTS) {
      expect(code, `폴백에 시드에 없는 ${constant} 가 들어 있다`).not.toContain(constant);
    }
    expect(code).toContain('NOTICE_BOARD_ID');
  });

  it('선택지가 비어 사용자가 아무것도 고르지 못하는 상태를 만들지 않는다', () => {
    // 빈 배열을 그대로 돌려주면 select 가 비어 "게시판이 하나도 없다"고 거짓말한다.
    const code = stripComments(read('hooks/api/use-board-options.ts'));
    expect(code).toContain('SEEDED_FALLBACK_OPTIONS');
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
