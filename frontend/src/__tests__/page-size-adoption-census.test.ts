import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * 페이지당 건수 선택 채택 census.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1 — **필수** 항목이다.
 *
 * 기능은 `StandardDataTable` 이 처음부터 갖고 있었는데(`pagination.onPageSizeChange`),
 * 2026-08-25 실측에서 서버 페이징이 있는 A1 화면 15개가 그 컨트롤을 전달하지 않고 있었다.
 * 업무 화면에서 "한 화면에 몇 건"은 스캔 비용을 직접 좌우하므로, 셸을 경유한다는 사실만으로는
 * 문법이 전달되지 않는다는 것을 보여 준 축이다.
 *
 * 이 게이트는 **서버 페이징이 있는 A1 소비 화면은 페이지당 건수를 제공한다**를 고정한다.
 * 페이징이 없는 화면(전량 조회)은 대상이 아니다 — 그때는 선택지 자체가 의미가 없다.
 */
function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

describe('페이지당 건수 채택 census', () => {
  it('서버 페이징이 있는 A1 화면은 페이지당 건수를 제공한다', () => {
    const missing = screenFiles(APP_DIR)
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        return source.includes('components/patterns/work-list-page')
          && source.includes('totalPages:')
          && !source.includes('onPageSizeChange');
      })
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(
      missing,
      missing.length > 0
        ? `페이지당 건수 미제공:\n${missing.join('\n')}\n`
          + 'pagination 에 onPageSizeChange 를 넘기고, 변경 시 페이지를 1로 되돌린 뒤 queryKey 에 포함하세요.'
        : '',
    ).toEqual([]);
  });

  it('페이지 크기를 바꿔도 재조회되지 않는 화면이 없다(queryKey 결속)', () => {
    // 크기만 바꾸고 queryKey 에 넣지 않으면 React Query 가 캐시를 그대로 돌려줘
    // **컨트롤이 조용히 죽는다**(과거 설문 관리에서 같은 방식으로 죽은 새로고침 버튼이 있었다).
    const unbound = screenFiles(APP_DIR)
      .filter((path) => {
        const source = readFileSync(path, 'utf8');
        if (!source.includes('onPageSizeChange') || !source.includes('queryKey:')) return false;
        // 수동 fetch(useState + 함수 호출) 화면은 queryKey 자체가 없으므로 대상이 아니다.
        if (!source.includes('useQuery')) return false;
        // 화면마다 상태 이름이 다르다(`pageSize`·`pageUnit`·`size`). 이름을 열거하는 대신
        // **표에 실제로 넘긴 값**의 식별자를 뽑아 그 식별자가 queryKey 에 있는지 본다
        // (2026-08-25 실측: 이름을 열거했더니 `size` 를 쓰는 포상 화면이 오탐으로 걸렸다).
        // 값이 단일 식별자가 아닐 수 있다(`pagination?.recordCountPerPage ?? pageSize` 같은 대체식).
        // 그래서 값 표현식의 식별자를 모두 모아 **하나라도** queryKey 에 있으면 결속된 것으로 본다.
        const expression = source.match(/pageSize:\s*([^,\n]+)/)?.[1]
          ?? (/(^|[\s,{])pageSize\s*,/.test(source) ? 'pageSize' : '');
        const identifiers = expression.match(/[A-Za-z_$][\w$]*/g) ?? [];
        if (identifiers.length === 0) return false;
        return !identifiers.some((identifier) => (
          new RegExp(`queryKey: \\[[^\\]]*\\b${identifier}\\b[^\\]]*\\]`).test(source)
        ));
      })
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(unbound, `queryKey 에 페이지 크기가 없습니다:\n${unbound.join('\n')}`).toEqual([]);
  });
});
