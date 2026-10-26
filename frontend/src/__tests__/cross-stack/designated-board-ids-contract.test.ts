import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as boardIds from '@/config/board-ids';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(SRC_DIR, '..', '..');

/**
 * 지정 게시판의 화면 상수와 서버 설정 기본값의 대조. 서버 원본(application.yml·BoardIdProperties)을 읽으므로 cross-stack 에 둔다 —
 * 백엔드만 바꾼 PR 에서도 이 대조가 돈다.
 */
describe('지정 게시판 화면 상수 ↔ 서버 설정', () => {
  /*
   * [2026-10-26 ADR-0043 결정 4] 지정 게시판의 정본은 서버 설정(nuri.boards.*)이다 — 서버가 지정 게시판의 영구 삭제를 거부하고
   * 지정 용도(designations)를 계산한다. 그런데 화면은 아직 같은 대응을 상수로 들고 있다(업무 홈·공개 FAQ·도움말 1:1 문의·지식 허브 탭).
   * 기관이 한쪽만 바꾸면 서버가 보호하는 게시판과 화면이 쓰는 게시판이 갈라진다(ATTR-04). 이 단언은 그 과도기 가드다 — 기본값만
   * 대조하므로 환경별로 재정의한 값은 잡지 못한다. 서버 기본값은 application.yml 과 BoardIdProperties 의 필드 기본값 두 곳이다.
   */
  it('지정 게시판 다섯 용도의 화면 상수가 서버 설정 nuri.boards 의 기본값과 같다', () => {
    const yml = readFileSync(join(REPO_DIR, 'api-server/src/main/resources/application.yml'), 'utf8');
    const block = yml.match(/^ {2}boards:\r?\n((?: {4}[a-z-]+: *\S+\r?\n?)+)/m);
    expect(block, 'application.yml 에서 nuri.boards 블록을 찾지 못했다').not.toBeNull();
    const ymlIds = Object.fromEntries([...block![1].matchAll(/^ {4}([a-z-]+): *(\S+)/gm)].map((m) => [m[1], m[2]]));

    const properties = readFileSync(join(REPO_DIR, 'business-core/src/main/java/nuri/business/core/config/BoardIdProperties.java'), 'utf8');
    const javaDefault = (field: string) => properties.match(new RegExp(`private String ${field} = "([^"]+)";`))?.[1];

    // 화면 상수 → 서버 설정 키·필드. HELP_FAQ_BOARD_ID 는 도움말·지식 허브 FAQ 탭이 쓰는 FAQ 축이다(KNOWLEDGE_FAQ_BOARD_ID 는 다른 축).
    const pairs = [
      ['NOTICE_BOARD_ID', 'notice-id', 'noticeId'],
      ['TASK_BOARD_ID', 'task-id', 'taskId'],
      ['HELP_FAQ_BOARD_ID', 'faq-id', 'faqId'],
      ['QNA_BOARD_ID', 'qna-id', 'qnaId'],
      ['WIKI_BOARD_ID', 'wiki-id', 'wikiId'],
    ] as const;
    const constants = boardIds as Record<string, unknown>;
    for (const [constant, key, field] of pairs) {
      expect(constants[constant], `board-ids.ts 에 ${constant} 가 없다`).toEqual(expect.any(String));
      expect(ymlIds[key], `application.yml nuri.boards.${key} 가 화면 상수 ${constant} 와 다르다`).toBe(constants[constant]);
      expect(javaDefault(field), `BoardIdProperties.${field} 기본값이 화면 상수 ${constant} 와 다르다`).toBe(constants[constant]);
    }
    // 서버에만 있는 지정 용도가 생기면 화면 대응도 함께 정한다 — 모르는 키가 끼면 붉어진다.
    expect(Object.keys(ymlIds).sort()).toEqual(pairs.map(([, key]) => key).sort());
  });
});
