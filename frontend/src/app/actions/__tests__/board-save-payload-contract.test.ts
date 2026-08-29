/**
 * 게시글 저장 요청 본문은 서버 계약 밖의 키를 싣지 않는다.
 *
 * ── 왜 이 계약이 필요한가 ──────────────────────────────────────────────────────
 * 백엔드는 `fail-on-unknown-properties: true` 다. 즉 요청 본문에 `BoardSaveRequest` 가 모르는
 * 키가 **하나라도** 들어가면 저장 전체가 400 으로 죽는다. 그런데 화면에서는 "게시글을 저장하지
 * 못했습니다. 잠시 후 다시 시도해 주세요" 라는 재시도 안내만 보이므로, 몇 번을 눌러도 절대
 * 성공하지 않는 상태와 일시적 장애가 사용자에게 똑같이 보인다.
 *
 * 실제로 이 축에서 두 번 사고가 났다.
 * - 2026-08-27: `noticeAt`·`secretAt` 이 zod strip 을 통과해 등록이 **항상** 400.
 * - 2026-08-28: 상세의 '답글' 버튼이 `parnts`·`replyYn` 을 실어 보내 답글 등록이 **항상** 400.
 *
 * 그래서 문자열 하나를 금지하는 대신 **결함의 부류**를 고정한다 — 요청 본문에 들어가는 키
 * 전체가 생성 계약의 키 집합에 속하는지 검사한다. 새 필드를 서버 계약 없이 추가하면 red 다.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { BoardSaveRequestSchema } from '@/types/generated-zod';

const SOURCE = readFileSync(path.resolve(__dirname, '..', 'boardActions.ts'), 'utf8');

/** 서버가 받아들이는 키 집합(생성 계약 원본). */
const SERVER_KEYS = new Set(Object.keys(BoardSaveRequestSchema.shape));

/**
 * 요청 본문에 실리는 키를 소스에서 뽑는다.
 *
 * 두 경로를 모두 본다 — 객체 리터럴 초기화와 사후 프로퍼티 대입. 후자를 빠뜨리면 '답글'
 * 결함(`articleData.replyYn = 'Y'`)이 그대로 통과한다.
 */
function payloadKeys(): string[] {
  const literal = SOURCE.match(/const articleData: BoardArticle = \{([\s\S]*?)\n {4}\};/);
  expect(literal, 'articleData 리터럴을 찾지 못했다 — 계약이 vacuous 하게 통과한다').not.toBeNull();

  const fromLiteral = [...literal![1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm)].map((m) => m[1]);
  const fromAssign = [...SOURCE.matchAll(/articleData\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]);
  return [...new Set([...fromLiteral, ...fromAssign])];
}

describe('게시글 저장 요청 본문 계약', () => {
  it('본문 키가 전부 서버 계약(BoardSaveRequest)에 있다', () => {
    const keys = payloadKeys();

    // 스캔이 조용히 0 에 수렴하면 이 게이트는 없는 것과 같다.
    expect(keys.length).toBeGreaterThanOrEqual(8);

    const unknown = keys.filter((key) => !SERVER_KEYS.has(key));
    expect(
      unknown,
      `서버가 모르는 키는 fail-on-unknown-properties 때문에 저장 전체를 400 으로 죽인다: ${unknown.join(', ')}`,
    ).toEqual([]);
  });

  it('답글 전용 키를 다시 싣지 않는다', () => {
    // 이 두 키는 BoardSaveRequest 에 대응 필드가 없다 — 되살리려면 서버 계약이 먼저다.
    for (const key of ['replyYn', 'parnts']) {
      expect(SERVER_KEYS.has(key), `${key} 가 서버 계약에 생겼다면 이 검사를 갱신하라`).toBe(false);
      expect(payloadKeys(), `${key} 가 요청 본문에 다시 실렸다`).not.toContain(key);
    }
  });
});
