/**
 * MSW 응답 고정물 계약 도우미와 그 래칫(2026-11-27, 품질 평가 A안 4번).
 *
 * 손으로 쓴 성공 JSON 고정물은 서버 계약이 바뀌어도 조용히 남아 화면 시험을 존재하지 않는 응답 모양으로 초록이 되게 한다.
 * contractJson 은 운영 코드와 같은 판정(parseGeneratedOperationResponse)으로 고정물을 먼저 읽어 보고, 래칫은 MSW 의 손으로 쓴 성공
 * JSON 이 늘지 않게 한다.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertContractFixture, contractJson } from './contract-response';
import { getHeadMenuOperation, getMyBookmarkStatusOperation, removeBookmarkOperation } from '@/types/generated-operations';

describe('contractJson', () => {
  it('생성 응답 계약을 지키는 고정물은 성공 envelope 로 돌려준다', async () => {
    const response = contractJson(getMyBookmarkStatusOperation, { bookmarks: [], unavailableCount: 0 });
    expect(await response.json()).toEqual({
      success: true, code: 'S000', message: '성공', data: { bookmarks: [], unavailableCount: 0 },
    });
  });

  it('계약과 어긋난 고정물은 operation 과 어긋난 필드 경로를 밝혀 던진다', () => {
    expect(() => contractJson(getMyBookmarkStatusOperation, { bookmarks: [], unavailableCount: '0' }))
      .toThrow(/getMyBookmarkStatus.*unavailableCount/);
    expect(() => contractJson(getHeadMenuOperation, { list: 'not-a-list' })).toThrow(/getHeadMenu.*list/);
  });

  it('void 응답은 data 없이 돌려주고, data 를 실으면 계약 위반이다', async () => {
    expect(await contractJson(removeBookmarkOperation).json()).toEqual({ success: true, code: 'S000', message: '성공' });
    expect(() => contractJson(removeBookmarkOperation, { removed: true })).toThrow(/removeBookmark/);
  });

  it('실패 envelope 는 성공 계약이 아니다 — 실패 응답은 이 도우미 밖에서 만든다', () => {
    expect(() => assertContractFixture(getMyBookmarkStatusOperation, { success: false, code: 'E400', message: '실패' }))
      .toThrow(/getMyBookmarkStatus/);
  });
});

const SOURCE_ROOT = join(__dirname, '..');
const HELPER_FILES = new Set(['test-utils/contract-response.ts', 'test-utils/contract-response.test.ts']);

/**
 * MSW 를 쓰는 파일에서 손으로 쓴 성공 JSON 응답(`HttpResponse.json(` 의 인자에 `success: true` 가 있는 것)의 수. 실패 응답
 * (`success: false`·오류 상태)과 `passthrough()` 는 세지 않는다.
 */
function countRawSuccessJson(source: string): number {
  let count = 0;
  const marker = 'HttpResponse.json(';
  for (let index = source.indexOf(marker); index >= 0; index = source.indexOf(marker, index + marker.length)) {
    let depth = 0;
    let end = index + marker.length - 1;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (/\bsuccess\s*:\s*true\b/.test(source.slice(index, end))) count += 1;
  }
  return count;
}

function mswSources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : mswSources(path);
    return /\.(?:ts|tsx)$/.test(name) && /from ['"]msw['"]/.test(readFileSync(path, 'utf8')) ? [path] : [];
  });
}

describe('MSW 성공 응답 래칫', () => {
  it('손으로 쓴 성공 JSON 세기는 성공 응답만 센다', () => {
    expect(countRawSuccessJson("HttpResponse.json({ success: true, code: 'S000', message: '성공', data: { list: [] } })")).toBe(1);
    expect(countRawSuccessJson("HttpResponse.json({ success: false, code: 'E400' }, { status: 400 })")).toBe(0);
    expect(countRawSuccessJson("contractJson(getHeadMenuOperation, { list: [] })")).toBe(0);
    expect(countRawSuccessJson("HttpResponse.json({\n  success: true,\n  data: { nested: (1) },\n})")).toBe(1);
  });

  /**
   * 허용 목록 — 게시판 고정물 2개는 게시판을 뺀 생성물에 operation 이 없어 공용 처리기가 contractJson 으로 import 할 수 없다. 대신
   * 게시판 소유 시험(src/lib/board/__tests__/msw-board-list-fixture.test.ts)이 생성 응답 계약으로 대조한다. 이 목록을 줄였으면 함께
   * 고친다(늘리지 않는다 — 새 성공 고정물은 contractJson 으로 쓴다).
   */
  const ALLOWED_RAW_SUCCESS_JSON: Record<string, number> = {
    'mocks/handlers.ts': 2,
  };

  it('MSW 의 성공 응답은 contractJson 을 거친다 — 손으로 쓴 성공 JSON 은 허용 목록보다 늘지 않는다', () => {
    const actual: Record<string, number> = {};
    for (const file of mswSources(SOURCE_ROOT)) {
      const key = relative(SOURCE_ROOT, file).replaceAll('\\', '/');
      if (HELPER_FILES.has(key)) continue;
      const count = countRawSuccessJson(readFileSync(file, 'utf8'));
      if (count > 0) actual[key] = count;
    }
    expect(actual, '새 MSW 성공 고정물은 contractJson(operation, data) 로 쓴다(src/test-utils/contract-response.ts)')
      .toEqual(ALLOWED_RAW_SUCCESS_JSON);
  });
});
