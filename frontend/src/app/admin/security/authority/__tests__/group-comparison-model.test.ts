import { describe, expect, it, vi } from 'vitest';
import { compareGroups, shownOperationCategories, shownScreenRows, type ScreenCompareCell } from '../components/group-comparison-model';
import { menuRowKey } from '../components/screen-permission-model';

// 화면별 줄의 칸 내용은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 계약이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * '그룹 비교'의 순수 모델(2026-10-02, 관리 콘솔 UX 3단계 G3). 화면별은 2단계 화면별 권한 모델, 기능별은 1단계 기능별 권한
 * 모델을 그대로 쓰고, 칸마다 A·B 를 글자로 비교한다.
 */
type Navigation = { code: string; name: string; parentCode: string | null; route: string | null; useYn: 'Y' | 'N' };

const NAVIGATION: readonly Navigation[] = [
  { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' },
  { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' },
  { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus', useYn: 'Y' },
  { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: 'AREA', route: '/admin/security/authority', useYn: 'Y' },
  { code: 'OTHER', name: '다른 영역', parentCode: null, route: null, useYn: 'Y' },
];
const OPERATIONS = [
  { code: 'MENU_READ', domain: 'MENU', action: 'READ', name: '메뉴 조회' },
  { code: 'MENU_CREATE', domain: 'MENU', action: 'CREATE', name: '메뉴 등록' },
  { code: 'MENU_UPDATE', domain: 'MENU', action: 'UPDATE', name: '메뉴 수정' },
  { code: 'MENU_DELETE', domain: 'MENU', action: 'DELETE', name: '메뉴 삭제' },
  { code: 'AUTHRT_READ', domain: 'AUTHRT', action: 'READ', name: '권한 조회' },
  { code: 'AUTHRT_AUDIT', domain: 'AUTHRT', action: 'AUDIT', name: '권한 감사' },
];
const A = new Set(['OPERATION:MENU_READ', 'OPERATION:MENU_UPDATE', 'OPERATION:AUTHRT_READ', 'NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS']);
const B = new Set(['OPERATION:MENU_READ', 'OPERATION:MENU_CREATE', 'NAVIGATION:AREA']);

const rowOf = (comparison: ReturnType<typeof compareGroups>, menuCode: string) =>
  comparison.screenRows.find((entry) => entry.row.key === menuRowKey(menuCode))!;
const sides = (cell: ScreenCompareCell | null) => (cell?.kind === 'grant' ? [cell.a.text, cell.b.text, cell.differs] : cell);

describe('compareGroups — 차이 수', () => {
  it('A에만·B에만 있는 권한(기능권한과 메뉴 표시)을 센다', () => {
    const comparison = compareGroups(A, B, NAVIGATION, OPERATIONS);
    // A에만: MENU_UPDATE·AUTHRT_READ·SECTION·MENUS, B에만: MENU_CREATE.
    expect([comparison.onlyA, comparison.onlyB]).toEqual([4, 1]);
    expect(compareGroups(B, A, NAVIGATION, OPERATIONS)).toMatchObject({ onlyA: 1, onlyB: 4 });
  });

  it('차이가 없으면 0·0 이고, 차이만 보기에서는 아무 줄도 남지 않는다', () => {
    const comparison = compareGroups(A, new Set(A), NAVIGATION, OPERATIONS);
    expect([comparison.onlyA, comparison.onlyB]).toEqual([0, 0]);
    expect(comparison.screenRows.some((entry) => entry.differs)).toBe(false);
    expect(shownScreenRows(comparison, true)).toEqual([]);
    expect(shownOperationCategories(comparison, true)).toEqual([]);
    // 끄면 모든 줄이다.
    expect(shownScreenRows(comparison, false)).toHaveLength(comparison.screenRows.length);
  });

  it('현재 기능·메뉴 목록에 없는 권한은 차이 수에서 빼고 따로 센다', () => {
    const comparison = compareGroups(new Set([...A, 'OPERATION:GHOST', 'NAVIGATION:GONE']), new Set([...B, 'OPERATION:GHOST']), NAVIGATION, OPERATIONS);
    expect([comparison.onlyA, comparison.onlyB, comparison.unknown]).toEqual([4, 1, 2]);
  });
});

describe('compareGroups — 화면별', () => {
  it('칸마다 A·B 각각 있음/없음을 글자로 내고 다른 칸을 표시한다(2단계 표와 같은 열·모델)', () => {
    const menus = rowOf(compareGroups(A, B, NAVIGATION, OPERATIONS), 'MENUS');
    expect(sides(menus.cells.navigation)).toEqual(['있음', '없음', true]);
    expect(sides(menus.cells.entry)).toEqual(['있음', '있음', false]);
    expect(sides(menus.cells.create)).toEqual(['없음', '있음', true]);
    expect(sides(menus.cells.update)).toEqual(['있음', '없음', true]);
    expect(sides(menus.cells.delete)).toEqual(['없음', '없음', false]);
    // 화면 목록에 그 밖의 기능이 없는 화면은 칸을 비운다.
    expect(menus.cells.other).toBeNull();
    expect(menus.differs).toBe(true);
  });

  it('진입 권한이 여럿(ANY)이면 들어갈 수 있는지와 수를 함께 쓰고, 고른 권한이 다르면 다름이다', () => {
    const authority = rowOf(compareGroups(A, B, NAVIGATION, OPERATIONS), 'AUTHORITY');
    expect(sides(authority.cells.entry)).toEqual(['있음 1/2', '없음 0/2', true]);
    expect(sides(authority.cells.navigation)).toEqual(['없음', '없음', false]);
  });

  it('권한이 여럿인 칸에서 서로 다른 권한을 같은 수만큼 가지면 글자는 같아도 다름이고, 한쪽에만 있는 권한 이름을 낸다', () => {
    // 권한 그룹 관리의 진입은 ANY[AUTHRT_READ, AUTHRT_AUDIT] — 두 그룹 모두 들어갈 수 있고 수도 같다.
    const authority = rowOf(compareGroups(new Set(['OPERATION:AUTHRT_READ']), new Set(['OPERATION:AUTHRT_AUDIT']), NAVIGATION, OPERATIONS), 'AUTHORITY');
    expect(sides(authority.cells.entry)).toEqual(['있음 1/2', '있음 1/2', true]);
    expect(authority.cells.entry).toMatchObject({ onlyA: ['권한 조회'], onlyB: ['권한 감사'] });
    // 같은 권한이면 한쪽에만 있는 이름이 없다.
    const same = rowOf(compareGroups(new Set(['OPERATION:AUTHRT_READ']), new Set(['OPERATION:AUTHRT_READ']), NAVIGATION, OPERATIONS), 'AUTHORITY');
    expect(same.cells.entry).toMatchObject({ differs: false, onlyA: [], onlyB: [] });
    // 메뉴 표시 칸은 메뉴 이름을 쓴다.
    const menus = rowOf(compareGroups(A, B, NAVIGATION, OPERATIONS), 'MENUS');
    expect(menus.cells.navigation).toMatchObject({ onlyA: ['메뉴 관리'], onlyB: [] });
  });

  it('경로 없는 영역 줄은 메뉴 표시만 비교한다', () => {
    const area = rowOf(compareGroups(A, B, NAVIGATION, OPERATIONS), 'AREA');
    expect(sides(area.cells.navigation)).toEqual(['있음', '있음', false]);
    expect([area.cells.entry, area.cells.create, area.cells.update, area.cells.delete, area.cells.other]).toEqual([null, null, null, null, null]);
  });

  it('로그인만 하면 열리는 화면은 비교 대신 사실을 쓴다', () => {
    // 예시는 모든 생성물에 남는 통합 검색이다(로그인만 하면 열리는 정적 화면).
    const navigation = [...NAVIGATION, { code: 'SEARCH', name: '통합 검색', parentCode: 'OTHER', route: '/search', useYn: 'Y' as const }];
    const search = rowOf(compareGroups(A, B, navigation, OPERATIONS), 'SEARCH');
    expect(search.cells.entry).toEqual({ kind: 'note', text: '로그인만 하면 열림' });
  });

  it('차이만 보기는 다른 줄과 그 상위 줄을 남긴다', () => {
    const shown = shownScreenRows(compareGroups(A, B, NAVIGATION, OPERATIONS), true).map((entry) => entry.row.key);
    expect(shown).toContain(menuRowKey('MENUS'));
    expect(shown).toContain(menuRowKey('SECTION'));
    expect(shown).toContain(menuRowKey('AREA'));
    expect(shown).not.toContain(menuRowKey('OTHER'));
  });

  it('메뉴 계층을 확인하지 못하면 화면별 줄 없이 이유를 낸다', () => {
    const comparison = compareGroups(A, B, [...NAVIGATION, { code: 'AREA', name: '중복', parentCode: null, route: null, useYn: 'Y' }], OPERATIONS);
    expect(comparison.navigationError).toMatch(/중복된 메뉴/);
    expect(comparison.screenRows).toEqual([]);
  });
});

describe('compareGroups — 기능별', () => {
  it('업무 영역 × 행위 칸을 A만·B만·둘 다·빈칸으로 낸다(1단계 표와 같은 열)', () => {
    const comparison = compareGroups(A, B, NAVIGATION, OPERATIONS);
    const menu = comparison.operationCategories.flatMap((category) => category.rows).find((entry) => entry.row.domain === 'MENU')!;
    // 조회·등록·수정·삭제·타인 자료 조회·수정·삭제 순서.
    expect(menu.columns.map((cell) => cell?.presence ?? (cell ? 'none' : 'absent'))).toEqual(['둘 다', 'B만', 'A만', 'none', 'absent', 'absent', 'absent']);
    expect(menu.differs).toBe(true);
    const authority = comparison.operationCategories.flatMap((category) => category.rows).find((entry) => entry.row.domain === 'AUTHRT')!;
    expect(authority.columns[0]?.presence).toBe('A만');
    expect(authority.others.map((cell) => [cell.operation.code, cell.presence])).toEqual([['AUTHRT_AUDIT', null]]);
  });

  it('차이만 보기는 다른 칸이 있는 업무 영역만 남긴다', () => {
    const same = new Set(['OPERATION:AUTHRT_READ']);
    const comparison = compareGroups(new Set([...same, 'OPERATION:MENU_READ']), same, NAVIGATION, OPERATIONS);
    const domains = shownOperationCategories(comparison, true).flatMap((category) => category.rows.map((entry) => entry.row.domain));
    expect(domains).toEqual(['MENU']);
  });
});
