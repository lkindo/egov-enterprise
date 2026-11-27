/**
 * MSW 응답 고정물 계약 도우미와 그 래칫(2026-11-27, 품질 평가 A안 4번).
 *
 * 손으로 쓴 성공 JSON 고정물은 서버 계약이 바뀌어도 조용히 남아 화면 시험을 존재하지 않는 응답 모양으로 초록이 되게 한다.
 * contractJson 은 운영 코드와 같은 판정(parseGeneratedOperationResponse)으로 고정물을 먼저 읽어 보고, 래칫은 MSW 의 손으로 쓴 JSON
 * 응답이 늘지 않게 한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertContractFixture,
  assertNoContractViolations,
  contractJson,
  takeContractViolations,
} from './contract-response';
import { getHeadMenuOperation, getMyBookmarkStatusOperation, removeBookmarkOperation } from '@/types/generated-operations/menu';

/** 일부러 위반을 일으킨 뒤 기록을 비운다(비우지 않으면 시험 끝 검사가 그 위반으로 이 시험을 붉힌다). */
function expectViolation(run: () => unknown, pattern: RegExp) {
  expect(run).toThrow(pattern);
  const recorded = takeContractViolations();
  expect(recorded).toHaveLength(1);
  expect(recorded[0]).toMatch(pattern);
}

describe('contractJson', () => {
  it('생성 응답 계약을 지키는 고정물은 성공 envelope 로 돌려준다', async () => {
    const response = contractJson(getMyBookmarkStatusOperation, { bookmarks: [], unavailableCount: 0 });
    expect(await response.json()).toEqual({
      success: true, code: 'S000', message: '성공', data: { bookmarks: [], unavailableCount: 0 },
    });
    expect(takeContractViolations()).toEqual([]);
  });

  it('계약과 어긋난 고정물은 operation 과 어긋난 필드 경로를 밝혀 던지고 기록한다', () => {
    expectViolation(() => contractJson(getMyBookmarkStatusOperation, { bookmarks: [], unavailableCount: '0' }),
      /getMyBookmarkStatus.*unavailableCount/);
    expectViolation(() => contractJson(getHeadMenuOperation, { list: 'not-a-list' }), /getHeadMenu.*list/);
  });

  it('계약에 없는 키(선택 필드의 오타·옛 키)도 어긋남이다 — 운영 zod 는 그런 키를 조용히 버린다', () => {
    expectViolation(() => contractJson(getMyBookmarkStatusOperation, { bookmarks: [], unavailableCount: 0, legacyCount: 1 }),
      /getMyBookmarkStatus.*계약에 없는 키: legacyCount/);
  });

  it('void 응답은 data 없이 돌려주고, data 를 실으면 계약 위반이다', async () => {
    expect(await contractJson(removeBookmarkOperation).json()).toEqual({ success: true, code: 'S000', message: '성공' });
    expectViolation(() => contractJson(removeBookmarkOperation, { removed: true }), /removeBookmark/);
  });

  it('실패 envelope 는 성공 계약이 아니다 — 원인을 envelope 로 밝힌다', () => {
    expectViolation(() => assertContractFixture(getMyBookmarkStatusOperation, { success: false, code: 'E400', message: '실패' }),
      /getMyBookmarkStatus.*envelope/);
  });

  it('기록된 위반은 시험 끝 검사가 실패로 올린다 — 처리기가 던진 오류를 MSW 가 500 으로 바꿔 삼켜도 붉어진다', () => {
    expect(() => contractJson(getHeadMenuOperation, { list: 'x' })).toThrow();
    expect(() => assertNoContractViolations()).toThrow(/MSW 고정물 계약 위반: .*getHeadMenu/);
    expect(() => assertNoContractViolations()).not.toThrow();
  });
});

describe('공용 처리기(src/mocks/handlers.ts)의 core 고정물', () => {
  // 화면 시험이 그 경로를 부를 때만 검사되면, 아무도 부르지 않는 고정물은 계약과 어긋난 채 남는다 — 여기서 직접 부른다.
  it.each([
    ['GET', '/api/v1/menus/head'],
    ['GET', '/api/v1/menus/bookmarks'],
    ['GET', '/api/v1/menus/bookmarks/status'],
    ['GET', '/api/v1/users/me'],
    ['POST', '/api/v1/auth/login'],
  ])('%s %s 는 생성 응답 계약을 통과한다', async (method, path) => {
    const response = await fetch(`http://localhost:8080${path}`, { method });
    expect(response.status).toBe(200);
    expect(takeContractViolations()).toEqual([]);
  });
});

const FRONTEND_ROOT = join(__dirname, '..', '..');
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'coverage', 'dist', 'playwright-report', 'test-results']);
const HELPER_FILES = new Set(['src/test-utils/contract-response.ts', 'src/test-utils/contract-response.test.ts']);

/** 주석을 공백으로, 문자열·템플릿의 내용을 공백으로 바꾼다(따옴표와 위치는 그대로) — 주석·문자열 속 글자를 코드로 세지 않는다. */
function blankCommentsAndStrings(source: string): string {
  const out = source.split('');
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') out[index++] = ' ';
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end < 0 ? source.length : end + 2;
      for (; index < stop; index += 1) if (source[index] !== '\n') out[index] = ' ';
    } else if (char === '\'' || char === '"' || char === '`') {
      index += 1;
      while (index < source.length && source[index] !== char) {
        if (source[index] === '\\') out[index++] = ' ';
        if (source[index] !== '\n') out[index] = ' ';
        index += 1;
      }
      index += 1;
    } else {
      index += 1;
    }
  }
  return out.join('');
}

interface RawJsonResponse { route: string }

const SUCCESS_KEYS = ['success', '"success"', '\'success\''];

/**
 * 첫 인자가 최상위 키 `success: false`(따옴표 키 포함)를 가진 객체 리터럴인가 — 중첩 객체 속 `success: false`(예: `data.success`)나
 * 삼항식 `cond ? success : false` 는 실패 응답 표지가 아니다. 깊이·키 자리·값은 주석과 문자열을 비운 code 로 보고(주석 속 글자는 키가
 * 아니고, 키와 값 사이 주석은 공백이다), 비워진 따옴표 키의 글자만 원문에서 읽는다.
 */
function literalFailureBody(source: string, code: string, open: number): boolean {
  let index = open + 1;
  while (/\s/.test(code[index] ?? '')) index += 1;
  if (code[index] !== '{') return false;
  let depth = 0;
  for (; index < code.length; index += 1) {
    const char = code[index];
    if (char === '{' || char === '[' || char === '(') {
      depth += 1;
    } else if (char === '}' || char === ']' || char === ')') {
      depth -= 1;
      if (depth === 0) return false;
    } else if (depth === 1) {
      const key = SUCCESS_KEYS.find((candidate) => code[index] === candidate[0] && source.startsWith(candidate, index));
      if (key === undefined) continue;
      let before = index - 1;
      while (before > 0 && /\s/.test(code[before] ?? '')) before -= 1;
      if ((code[before] === '{' || code[before] === ',') && /^\s*:\s*false\b/.test(code.slice(index + key.length))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * MSW 쪽 파일에서 손으로 만든 JSON 응답 — `HttpResponse.json(`·그 별칭·기본 `Response.json(` 호출이다. 첫 인자가 최상위 `success: false`
 * 객체 리터럴인 실패 응답만 뺀다(변수로 넘긴 본문은 모양을 모르므로 센다). 각 응답은 앞의 가장 가까운 `http.<메서드>('<경로>'` 에 묶는다.
 */
function rawJsonResponses(source: string): RawJsonResponse[] {
  const code = blankCommentsAndStrings(source);
  const aliases = [...source.matchAll(/\bHttpResponse\s+as\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  const callee = new RegExp(`\\b(?:HttpResponse|Response${aliases.map((alias) => `|${alias}`).join('')})\\s*\\.\\s*json\\s*\\(`, 'g');
  const routes = [...code.matchAll(/\bhttp\s*\.\s*(get|post|put|patch|delete|all|head|options)\s*\(\s*(['"`])/g)]
    .map((match) => {
      const [whole, method = '', quote = '\''] = match;
      const quoteAt = (match.index ?? 0) + whole.length - 1;
      const close = source.indexOf(quote, quoteAt + 1);
      return { at: match.index ?? 0, route: `${method.toUpperCase()} ${source.slice(quoteAt + 1, close)}` };
    });
  const responses: RawJsonResponse[] = [];
  for (const match of code.matchAll(callee)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    if (literalFailureBody(source, code, open)) continue;
    const owner = routes.filter((route) => route.at < (match.index ?? 0)).at(-1);
    responses.push({ route: owner?.route ?? '(경로 없음)' });
  }
  return responses;
}

function mswSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const { name } = entry;
    const path = join(directory, name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(name) ? [] : mswSources(path);
    if (!entry.isFile() || !/\.(?:ts|tsx|mts|js|jsx)$/.test(name)) return [];
    const text = readFileSync(path, 'utf8');
    return /from\s+['"]msw(?:\/[\w-]+)?['"]|\bHttpResponse\b/.test(text) ? [path] : [];
  });
}

describe('MSW 손으로 쓴 JSON 응답 래칫', () => {
  it('성공·변수 본문·별칭·기본 Response 는 세고, 리터럴 실패 응답과 주석·문자열은 세지 않는다', () => {
    const routesOf = (source: string) => rawJsonResponses(source).map(({ route }) => route);
    expect(routesOf("http.get('*/a', () => HttpResponse.json({ success: true, data: { list: [] } }))")).toEqual(['GET */a']);
    expect(routesOf("http.get('*/a', () => HttpResponse.json(body))")).toEqual(['GET */a']);
    expect(routesOf("import { HttpResponse as Mock } from 'msw';\nhttp.post('*/b', () => Mock.json({ success: true }))")).toEqual(['POST */b']);
    expect(routesOf("http.get('*/c', () => Response.json({ success: true }))")).toEqual(['GET */c']);
    expect(routesOf("http.get('*/d', () => HttpResponse.json({ success: false, code: 'E400' }, { status: 400 }))")).toEqual([]);
    expect(routesOf("// HttpResponse.json({ success: true })\nconst note = 'HttpResponse.json({ success: true })';")).toEqual([]);
    expect(routesOf("http.get('*/e', () => contractJson(op, { list: [] }))")).toEqual([]);
    expect(routesOf("http.get('*/f', () => HttpResponse.json({\n  success: true,\n  data: { nested: (1) },\n}))")).toEqual(['GET */f']);
  });

  it('실패 표지는 첫 인자의 최상위 키만 본다 — 따옴표 키는 실패, 중첩 data.success·삼항식은 성공 응답으로 센다', () => {
    const routesOf = (source: string) => rawJsonResponses(source).map(({ route }) => route);
    expect(routesOf("http.get('*/g', () => HttpResponse.json({ \"success\": false, \"code\": 'E400' }, { status: 400 }))")).toEqual([]);
    expect(routesOf("http.get('*/g', () => HttpResponse.json({ 'success': false }, { status: 400 }))")).toEqual([]);
    expect(routesOf("http.get('*/g', () => HttpResponse.json({ ...base, success: false }))")).toEqual([]);
    expect(routesOf("http.get('*/h', () => HttpResponse.json({ success: true, data: { success: false } }))")).toEqual(['GET */h']);
    expect(routesOf("http.get('*/h', () => HttpResponse.json({ success: true, data: [{ success: false }] }))")).toEqual(['GET */h']);
    expect(routesOf("http.get('*/h', () => HttpResponse.json({ success: ok ? success : false }))")).toEqual(['GET */h']);
    expect(routesOf("http.get('*/h', () => HttpResponse.json(body, { success: false }))")).toEqual(['GET */h']);
    expect(routesOf("http.get('*/h', () => HttpResponse.json({ /* success: false */ success: true }))")).toEqual(['GET */h']);
    expect(routesOf("http.get('*/g', () => HttpResponse.json({ success: /* 설명 */ false }))")).toEqual([]);
  });

  /**
   * 허용 목록 — 게시판 고정물 2개는 게시판을 뺀 생성물에 operation 이 없어 공용 처리기가 contractJson 으로 import 할 수 없다. 대신
   * 게시판 소유 시험(src/lib/board/__tests__/msw-board-list-fixture.test.ts)이 이 두 경로를 생성 응답 계약으로 대조한다. 경로 단위로
   * 묶어 다른 응답이 이 자리를 차지하지 못하게 한다. 목록은 줄이기만 한다(새 성공 고정물은 contractJson 으로 쓴다).
   */
  const ALLOWED_RAW_JSON: Record<string, number> = {
    'src/mocks/handlers.ts#GET */api/v1/boards/options': 1,
    'src/mocks/handlers.ts#GET */api/v1/boards/*': 1,
  };

  it('MSW 의 JSON 응답은 contractJson 을 거친다 — 손으로 쓴 응답은 허용 목록(파일·경로)을 넘지 않는다', () => {
    const actual: Record<string, number> = {};
    for (const file of mswSources(FRONTEND_ROOT)) {
      const key = relative(FRONTEND_ROOT, file).replaceAll('\\', '/');
      if (HELPER_FILES.has(key)) continue;
      for (const { route } of rawJsonResponses(readFileSync(file, 'utf8'))) {
        actual[`${key}#${route}`] = (actual[`${key}#${route}`] ?? 0) + 1;
      }
    }
    expect(actual, '새 MSW 성공 고정물은 contractJson(operation, data) 로 쓴다(src/test-utils/contract-response.ts)')
      .toEqual(ALLOWED_RAW_JSON);
  });
});
