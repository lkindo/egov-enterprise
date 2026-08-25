import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * G15 빈 상태 구분 census.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3 G15.
 *
 * 조회 조건이 표 밖(조회 조건 영역)으로 올라가면 표는 검색어를 알 수 없다. 그대로 두면
 * "등록된 데이터가 없습니다"가 **검색 결과가 없을 때도** 뜨고, 사용자는 조건을 잘못 넣은
 * 것인지 데이터 자체가 없는 것인지 구분하지 못한다 — 그래서 화면이 현재 검색어를 표에
 * 문구로 내려준다(`emptyResultMessage`).
 *
 * ⚠ 이 게이트는 **공용 조회 조건 컴포넌트를 쓰는 화면**만 센다. 검색이 없는 화면은 단일 문구가
 *   정답이므로 대상이 아니다(강제하면 없는 구분을 만들어 내는 압력이 된다).
 *   자체 입력으로 검색하는 화면은 아래에 명시적으로 나열한다.
 */
const SEARCH_COMPONENTS = [
  'components/patterns/keyword-filter',
  'components/ui/standard-search-filter',
];

/** 공용 컴포넌트를 쓰지 않고 자체 입력으로 검색하는 화면. 발견하면 여기에 추가한다. */
const CUSTOM_SEARCH_SCREENS = [
  'src/app/help/HelpClient.tsx',
];

function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

describe('빈 상태 구분 census', () => {
  it('공용 조회 조건을 쓰는 화면은 결과 없음과 데이터 없음을 구분한다', () => {
    const missing = screenFiles(APP_DIR)
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return SEARCH_COMPONENTS.some((component) => source.includes(component))
          && !source.includes('emptyResultMessage');
      })
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(
      missing,
      `빈 상태 미구분:\n${missing.join('\n')}\n`
        + 'emptyMessage 에 emptyResultMessage(검색어, 기본문구) 를 넘기세요(G15).',
    ).toEqual([]);
  });

  it('자체 입력으로 검색하는 화면도 같은 구분을 한다', () => {
    for (const relativePath of CUSTOM_SEARCH_SCREENS) {
      const source = readFileSync(join(FRONTEND_DIR, relativePath), 'utf8');
      expect(source, `${relativePath}: 빈 상태를 구분하지 않습니다`).toContain('emptyResultMessage');
    }
  });
});
