import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(FRONTEND_DIR, '..');
const GLOBALS_PATH = join(FRONTEND_DIR, 'src', 'app', 'globals.css');
const CATALOG_PATH = join(REPO_DIR, 'docs', '02-architecture', 'work-screen-grammar-catalog.md');

const GLOBALS_CSS = readFileSync(GLOBALS_PATH, 'utf8');
const CATALOG_MD = readFileSync(CATALOG_PATH, 'utf8');

/**
 * 업무 화면 문법 카탈로그 ↔ 밀도 토큰 계약.
 *
 * 카탈로그(docs/02-architecture/work-screen-grammar-catalog.md) §4 는 `compact` 밀도의
 * 합격선을 토큰 값에서 산출한다(행 높이 = 2×--cell-py + 본문 줄 높이 …). 그래서 표의 값이
 * globals.css 와 어긋나는 순간 문서가 조용히 거짓이 되고, 그 위에 세운 파일럿 합격 판정도
 * 함께 무의미해진다. 여기서 막는 것은 "문서가 코드보다 오래된 상태"다.
 *
 * 이 계약이 지키는 것:
 *   ① `:root[data-density="compact"]` 토큰 블록과 카탈로그 §4 표가 **양방향 exact 일치**
 *      (CSS 에만 있는 토큰 = 문서 누락 / 문서에만 있는 토큰 = 유령 계약, 둘 다 red)
 *   ② 값 문자열까지 일치 (2rem → 2.25rem 같은 조용한 밀도 변경 차단)
 *   ③ 카탈로그가 이 테스트 파일을 정본 결속 근거로 명시 (테스트 이름 변경 시 문서도 함께 갱신)
 *
 * 정본은 CSS 다. 값이 바뀌면 CSS 를 먼저 고치고 카탈로그 표를 같은 변경에서 갱신한다.
 */

/** `/* … *\/` 주석을 제거한다 — 주석 안의 예시 값이 선언으로 오인되지 않게 한다. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 셀렉터 바로 뒤에 오는 블록 본문을 돌려준다.
 * `:root[data-density="compact"] .standard-data-table-responsive thead th` 처럼
 * 같은 접두사를 가진 후행 블록과 섞이지 않도록 여는 중괄호가 붙어 있는 것만 고른다.
 */
function densityBlockBody(css: string): string {
  const match = /:root\[data-density="compact"\]\s*\{/.exec(css);
  if (!match) return '';
  const start = match.index + match[0].length;
  const end = css.indexOf('}', start);
  return end === -1 ? '' : css.slice(start, end);
}

/** `--key: value;` 선언을 key → value 맵으로 뽑는다. */
function declarations(cssBlock: string): Map<string, string> {
  const entries = [...stripComments(cssBlock).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)];
  return new Map(entries.map(([, key, value]) => [key, value.trim()]));
}

/** 카탈로그 §4 의 `<!-- density-contract:start -->` ~ `end` 구간 표를 맵으로 뽑는다. */
function catalogDensityTable(markdown: string): Map<string, string> {
  const section = /<!-- density-contract:start -->([\s\S]*?)<!-- density-contract:end -->/.exec(markdown);
  if (!section) return new Map();
  const rows = [...section[1].matchAll(/^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)];
  return new Map(rows.map(([, token, value]) => [token, value.trim()]));
}

describe('Work screen grammar catalog ↔ density token contract', () => {
  const cssTokens = declarations(densityBlockBody(GLOBALS_CSS));
  const docTokens = catalogDensityTable(CATALOG_MD);

  it('finds the compact density block and the catalog density table', () => {
    expect(cssTokens.size).toBeGreaterThan(0);
    expect(docTokens.size).toBeGreaterThan(0);
  });

  it('keeps the catalog token list exactly equal to the compact block', () => {
    expect([...docTokens.keys()].sort()).toEqual([...cssTokens.keys()].sort());
  });

  it('keeps every catalog value identical to its CSS declaration', () => {
    for (const [token, cssValue] of cssTokens) {
      expect(docTokens.get(token), token).toBe(cssValue);
    }
  });

  it('binds the catalog to this contract file by name', () => {
    expect(CATALOG_MD).toContain('work-screen-grammar-contract.test.ts');
  });
});
