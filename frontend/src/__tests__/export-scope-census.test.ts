import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * 내보내기 범위 census.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A6 —
 * **금지: 현재 페이지만 내보내면서 `전체 내보내기`로 라벨링.**
 *
 * `DataExportExcel` 은 넘겨받은 배열을 그대로 파일로 만든다(서버측 전량 반출이 아니다).
 * 그래서 범위를 아는 것은 호출부뿐이고, 2026-08-26 이전에는 모든 화면이 서버 페이징의
 * **현재 페이지만** 내보내면서 라벨은 `엑셀 내보내기` 라고만 적었다 — 사용자가 조회 결과
 * 전체를 받았다고 오해할 수 있는 상태였다(정렬 범위 고지와 같은 종류의 불일치).
 *
 * 이제 `scope` 가 필수 prop 이라 선언 자체는 타입이 강제한다. 이 census 가 막는 것은
 * **거짓 선언**이다 — 서버 페이징 화면이 `loaded` 를 주장하는 경우.
 */
function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

function exportConsumers() {
  return screenFiles(APP_DIR)
    .map((path) => ({
      path: relative(FRONTEND_DIR, path).split(sep).join('/'),
      source: readFileSync(path, 'utf8'),
    }))
    .filter((entry) => entry.source.includes('<DataExportExcel'));
}

describe('내보내기 범위 census', () => {
  it('모든 소비 화면이 범위를 선언한다', () => {
    const undeclared = exportConsumers()
      .filter((entry) => !/scope="(page|loaded)"/.test(entry.source))
      .map((entry) => entry.path);

    expect(undeclared, `범위 미선언:\n${undeclared.join('\n')}`).toEqual([]);
  });

  it('서버 페이징 화면은 전량 반출을 주장하지 않는다', () => {
    // 서버가 총 페이지를 내려주는 화면은 정의상 현재 페이지 배열만 손에 쥐고 있다.
    const lying = exportConsumers()
      .filter((entry) => entry.source.includes('totalPages:') && /scope="loaded"/.test(entry.source))
      .map((entry) => entry.path);

    expect(
      lying,
      `서버 페이징인데 전량 반출을 주장합니다:\n${lying.join('\n')}\n`
        + '현재 페이지만 내보낸다면 scope="page" 로 선언하세요(A6 금지 항목).',
    ).toEqual([]);
  });

  it('버튼 문구가 선언한 범위를 따른다', () => {
    const component = readFileSync(
      join(FRONTEND_DIR, 'src', 'app', 'components', 'ui', 'data-export-excel.tsx'),
      'utf8',
    );

    // 라벨이 범위와 분리되면 선언만 정직하고 화면은 그대로인 상태가 된다.
    expect(component).toMatch(/scope === 'page' \? '현재 페이지 엑셀 내보내기' : '엑셀 내보내기'/);
    // 범위를 선택 사항으로 되돌리면 기본값이 생겨 거짓 라벨이 다시 가능해진다.
    expect(component, 'scope 가 선택 prop 이 되었습니다').toMatch(/ scope: ExportScope;/);
    expect(component).not.toMatch(/scope\?: ExportScope/);
  });
});
