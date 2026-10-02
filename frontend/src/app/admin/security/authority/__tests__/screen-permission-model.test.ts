import { describe, expect, it, vi } from 'vitest';
import { buildNavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { menuPreviewMenusFromCatalog, previewMenuVisibility } from '@/lib/navigation/menu-visibility-preview';
import {
  aggregateCell,
  ancestorKeys,
  buildScreenPermissionModel,
  cellCodes,
  entrySatisfied,
  initialExpandedKeys,
  menuRowKey,
  preferredEntryCode,
  rowsUnder,
  screenEntryOf,
  screenRowStatus,
  UNMATCHED_GROUP_KEY,
  visibleScreenRows,
} from '../components/screen-permission-model';
import { FIXTURE_SCREENS } from './screen-registry-fixture';

// 칸의 내용은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 이 시험이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * '화면별 권한' 표의 순수 모델(2026-10-02, 관리 콘솔 UX 2단계 D4). 화면 진입은 라우트 게이트와 같은 원장을, 나머지 칸은
 * 화면 목록을 읽는다. 화면 목록은 고정 목록(screen-registry-fixture)이고, 메뉴 → 화면 판정은 화면 관리와 같은 공용 판정
 * (menu-screen-resolution)이 그 목록 위에서 돈다. 실제 생성물과의 정합은 screen-permission-model.registry.test.ts 가 본다.
 */
const navigation = [
  { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' as const },
  { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' as const },
  { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus?tab=TREE', useYn: 'Y' as const },
  { code: 'USERS', name: '사용자 관리', parentCode: 'SECTION', route: '/admin/user/manage', useYn: 'Y' as const },
  { code: 'POLLS', name: '투표 관리', parentCode: 'AREA', route: '/admin/survey/polls', useYn: 'N' as const },
  { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: 'AREA', route: '/admin/security/authority', useYn: 'Y' as const },
  { code: 'GHOST', name: '없는 화면', parentCode: null, route: '/admin/unregistered-only-in-test/page', useYn: 'Y' as const },
  { code: 'LEGACY', name: '옛 화면', parentCode: null, route: '/legacy/menu.do', useYn: 'Y' as const },
];
const operationCodes = [
  'MENU_READ', 'MENU_CREATE', 'MENU_UPDATE', 'MENU_DELETE',
  'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_STATUS', 'USER_DEPT', 'USER_PASSWORD',
  'DEPT_CREATE', 'DEPT_UPDATE', 'DEPT_DELETE', 'ABSENCE_UPDATE', 'MFA_RECOVER',
  'POLL_READ', 'POLL_READ_ALL', 'POLL_CREATE',
  'AUTHRT_READ', 'AUTHRT_AUDIT', 'AUTHRT_CREATE', 'AUTHRT_UPDATE', 'AUTHRT_DELETE', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN',
  'ADBK_CREATE', 'ADBK_DELETE', 'BOARD_CREATE', 'BOARD_UPDATE', 'BOARD_UPDATE_ALL',
];
const key = (code: string) => `OPERATION:${code}`;
const model = () => buildScreenPermissionModel(buildNavigationPermissionTree(navigation), operationCodes);
const row = (code: string) => model().byKey.get(menuRowKey(code))!;

describe('화면별 권한 표 모델', () => {
  it('메뉴 트리를 앞선 순회로 두고, 사용 중인 메뉴로 열리지 않는 동적이 아닌 화면을 마지막 묶음에 모은다', () => {
    const built = model();
    const menuRows = built.rows.filter((entry) => entry.kind === 'menu');
    expect(menuRows.map((entry) => [entry.menuCode, entry.depth])).toEqual([
      ['AREA', 0], ['SECTION', 1], ['MENUS', 2], ['USERS', 2], ['POLLS', 1], ['AUTHORITY', 1], ['GHOST', 0], ['LEGACY', 0],
    ]);
    // 메뉴 경로는 쿼리를 떼고 본다. 사용 안 함 메뉴도 줄로 남고 그 화면의 칸을 보인다.
    expect(row('MENUS').route).toBe('/admin/system/menus');
    expect(row('POLLS').unused).toBe(true);
    expect(row('POLLS').screen?.route).toBe('/admin/survey/polls');
    const group = built.byKey.get(UNMATCHED_GROUP_KEY)!;
    expect(group.kind).toBe('unmatched-group');
    const unmatched = group.childKeys.map((childKey) => built.byKey.get(childKey)!.route);
    // 사용 중인 메뉴가 여는 화면은 묶음에 없다. 사용 안 함 메뉴만 가리키는 화면(투표 관리)은 런타임에 어떤 메뉴로도 열리지
    // 않으므로 묶음에 있다(화면 관리와 같은 공용 판정). 동적 화면은 메뉴에 둘 수 없어 세지 않는다.
    expect(unmatched).toEqual([
      '/admin/collaboration/address-book/select-address-book-list',
      '/admin/community/boards/insert-board-article',
      '/admin/survey/polls',
      '/admin/system/programs',
      '/note',
    ]);
    expect(unmatched.length).toBe(FIXTURE_SCREENS.filter((screen) => !screen.dynamic).length - 3);
  });

  it('메뉴 경로가 정적 별칭이면 넘기는 화면의 칸을 보이고, 동적 별칭은 따라가지 않는다(공용 판정)', () => {
    const aliasNavigation = [
      { code: 'ADBK', name: '주소록', parentCode: null, route: '/admin/collaboration/address-book', useYn: 'Y' as const },
      { code: 'BOARD_OLD', name: '옛 게시판', parentCode: null, route: '/admin/community/boards/123', useYn: 'Y' as const },
    ];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(aliasNavigation), operationCodes);
    const addressBook = built.byKey.get(menuRowKey('ADBK'))!;
    // 줄의 경로는 메뉴 경로 그대로이고(화면 진입은 게이트처럼 그 경로로 본다), 칸은 목적지 화면의 권한이다.
    expect(addressBook.route).toBe('/admin/collaboration/address-book');
    expect(addressBook.screen?.route).toBe('/admin/collaboration/address-book/select-address-book-list');
    expect(addressBook.codes).toEqual({ create: ['ADBK_CREATE'], update: [], delete: ['ADBK_DELETE'], other: [] });
    // 받은 값에 따라 넘기는 동적 별칭은 판정할 수 없다 — 엉뚱한 화면을 붙이지 않는다.
    expect(built.byKey.get(menuRowKey('BOARD_OLD'))!.screen).toBeNull();
    const unmatched = built.byKey.get(UNMATCHED_GROUP_KEY)!.childKeys.map((childKey) => built.byKey.get(childKey)!.route);
    expect(unmatched).not.toContain('/admin/collaboration/address-book/select-address-book-list');
    expect(unmatched).toContain('/admin/community/boards/insert-board-article');
  });

  it('화면 진입은 라우트 게이트와 같은 원장을 읽는다 — ANY·ALL·로그인만·미등록·목록 밖', () => {
    const codes = new Set(operationCodes);
    expect(screenEntryOf('/admin/security/authority', codes)).toEqual({ state: 'gated', codes: ['AUTHRT_READ', 'AUTHRT_AUDIT'], mode: 'ANY' });
    expect(screenEntryOf('/admin/survey/polls', codes)).toEqual({ state: 'gated', codes: ['POLL_READ', 'POLL_READ_ALL'], mode: 'ALL' });
    expect(screenEntryOf('/note', codes).state).toBe('open');
    expect(screenEntryOf('/admin/unregistered-only-in-test/page', codes).state).toBe('unregistered');
    expect(screenEntryOf('/legacy/menu.do', codes).state).toBe('unlisted');
    // ALL 의 일부가 기능 목록에 없으면 일부만 켤 수 있는 것처럼 보이게 하지 않는다.
    expect(screenEntryOf('/admin/survey/polls', new Set(['POLL_READ'])).state).toBe('unknown');
    expect(screenEntryOf('/admin/system/menus', new Set(['USER_READ'])).state).toBe('unknown');
  });

  it('화면 권한을 등록·수정·삭제·그 밖의 기능으로 나누고 진입 권한과 목록 밖 코드는 뺀다', () => {
    const users = row('USERS');
    expect(users.entry).toEqual({ state: 'gated', codes: ['USER_READ'], mode: 'ANY' });
    expect(users.codes.create).toEqual(['DEPT_CREATE', 'USER_CREATE']);
    expect(users.codes.update).toEqual(['ABSENCE_UPDATE', 'DEPT_UPDATE', 'USER_UPDATE']);
    expect(users.codes.delete).toEqual(['DEPT_DELETE', 'USER_DELETE']);
    // 표시 판정(display)의 조회 권한과 등록·수정·삭제가 아닌 쓰기(상태 변경·비밀번호 등)는 '그 밖의 기능'이다.
    expect(users.codes.other).toEqual(['AUTHRT_AUDIT', 'AUTHRT_READ', 'MFA_RECOVER', 'USER_DEPT', 'USER_PASSWORD', 'USER_STATUS']);
    const reduced = buildScreenPermissionModel(buildNavigationPermissionTree(navigation), ['USER_READ', 'USER_CREATE']);
    expect(reduced.byKey.get(menuRowKey('USERS'))!.codes).toEqual({ create: ['USER_CREATE'], update: [], delete: [], other: [] });
    expect(cellCodes(users, 'entry')).toEqual(['USER_READ']);
    expect(cellCodes(row('AREA'), 'entry')).toEqual([]);
  });

  it('일괄 코드는 칸 코드에서 보호 권한·타인 자료 권한·다른 화면의 진입 권한을 뺀다(H3)', () => {
    const users = row('USERS');
    // 권한 조회·감사 조회는 권한 그룹 관리 화면의 진입 권한이다. 비밀번호 초기화·추가 인증 복구는 보호 권한이다.
    expect(users.bulkCodes.other).toEqual(['USER_DEPT', 'USER_STATUS']);
    expect(users.bulkCodes.create).toEqual(users.codes.create);
    const boardNavigation = [
      { code: 'CONTENT', name: '게시', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'WRITE', name: '게시글 작성', parentCode: 'CONTENT', route: '/admin/community/boards/insert-board-article', useYn: 'Y' as const },
    ];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(boardNavigation), operationCodes);
    const write = built.byKey.get(menuRowKey('WRITE'))!;
    // 화면 줄의 칸은 타인 자료 수정도 보인다 — 그 칸에서 따로 고른다.
    expect(write.codes.update).toEqual(['BOARD_UPDATE', 'BOARD_UPDATE_ALL']);
    expect(write.bulkCodes.update).toEqual(['BOARD_UPDATE']);
    // 섹션의 '수정' 한 번은 본인 자료 수정만 켠다.
    const section = aggregateCell(rowsUnder(built, built.byKey.get(menuRowKey('CONTENT'))!), 'update', new Set(), true)!;
    expect(section).toMatchObject({ total: 1, selected: 0, plan: { mode: 'select', keys: [key('BOARD_UPDATE')] } });
    // 타인 자료 수정이 이미 켜져 있어도 일괄 해제가 끄지 않는다.
    expect(aggregateCell(rowsUnder(built, built.byKey.get(menuRowKey('CONTENT'))!), 'update', new Set([key('BOARD_UPDATE'), key('BOARD_UPDATE_ALL')]), true)!.plan)
      .toEqual({ mode: 'clear', keys: [key('BOARD_UPDATE')] });
  });

  it('메뉴 계층이 손상돼 있으면 줄을 만들지 않는다', () => {
    const broken = buildScreenPermissionModel(buildNavigationPermissionTree([{ code: 'A', name: '순환', parentCode: 'A', route: null, useYn: 'Y' }]), operationCodes);
    expect(broken.rows).toEqual([]);
  });

  it('진입 충족은 ANY 는 하나, ALL 은 모두다', () => {
    expect(entrySatisfied(row('AUTHORITY').entry!, new Set([key('AUTHRT_AUDIT')]))).toBe(true);
    expect(entrySatisfied(row('POLLS').entry!, new Set([key('POLL_READ')]))).toBe(false);
    expect(entrySatisfied(row('POLLS').entry!, new Set([key('POLL_READ'), key('POLL_READ_ALL')]))).toBe(true);
    expect(preferredEntryCode(['AUTHRT_AUDIT', 'AUTHRT_READ'])).toBe('AUTHRT_READ');
    expect(preferredEntryCode(['AUTHRT_GRANT'])).toBeNull();
  });

  it('묶음 칸은 아래 화면 전체를 다루고, 일괄 코드만 켜고 끈다', () => {
    const built = model();
    const under = rowsUnder(built, built.byKey.get(menuRowKey('SECTION'))!);
    expect(under.map((entry) => entry.menuCode)).toEqual(['SECTION', 'MENUS', 'USERS']);
    const other = aggregateCell(under, 'other', new Set(), true)!;
    // 보호 권한(MFA_RECOVER·USER_PASSWORD)과 다른 화면의 진입 권한(AUTHRT_READ·AUTHRT_AUDIT)은 빠진다.
    expect(other.total).toBe(2);
    expect(other.plan.mode).toBe('select');
    // 키 순서는 줄 순회 순서에서 나오는 구현 세부라 집합으로 본다.
    expect(new Set(other.plan.keys)).toEqual(new Set(['USER_DEPT', 'USER_STATUS'].map(key)));
    const all = new Set(['USER_DEPT', 'USER_STATUS'].map(key));
    expect(aggregateCell(under, 'other', all, true)!.plan.mode).toBe('clear');
    // 추가가 막힌 그룹은 끌 수만 있다.
    expect(aggregateCell(under, 'other', new Set(), false)!.plan.mode).toBeNull();
    expect(aggregateCell(under, 'other', new Set([key('USER_DEPT')]), false)!.plan).toEqual({ mode: 'clear', keys: [key('USER_DEPT')] });
  });

  it('묶음의 화면 진입은 들어갈 수 없는 화면에 필요한 만큼만 더한다 — ANY 는 조회 하나, ALL 은 모두', () => {
    const built = model();
    const under = rowsUnder(built, built.byKey.get(menuRowKey('AREA'))!);
    const entry = aggregateCell(under, 'entry', new Set([key('MENU_READ')]), true)!;
    // 메뉴 관리(충족)·사용자 관리·투표 관리(ALL)·권한 그룹 관리(ANY) — 화면 4개 중 1개 충족.
    expect(entry).toMatchObject({ total: 4, selected: 1 });
    expect(new Set(entry.plan.keys)).toEqual(new Set(['USER_READ', 'POLL_READ', 'POLL_READ_ALL', 'AUTHRT_READ'].map(key)));
    expect(entry.plan.mode).toBe('select');
    const satisfied = new Set(['MENU_READ', 'USER_READ', 'POLL_READ', 'POLL_READ_ALL', 'AUTHRT_AUDIT'].map(key));
    const cleared = aggregateCell(under, 'entry', satisfied, true)!.plan;
    expect(cleared.mode).toBe('clear');
    expect(new Set(cleared.keys)).toEqual(satisfied);
  });

  it('상태는 이 그룹의 초안으로 돌린 사이드바 판정이다', () => {
    const built = model();
    const menus = menuPreviewMenusFromCatalog(navigation);
    const selection = new Set(['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS', 'NAVIGATION:AUTHORITY', 'NAVIGATION:POLLS', key('MENU_READ')]);
    const preview = previewMenuVisibility({ menus, navigation: ['AREA', 'SECTION', 'MENUS', 'AUTHORITY', 'POLLS'], operations: ['MENU_READ', 'USER_READ'] });
    const status = (code: string) => screenRowStatus(built.byKey.get(menuRowKey(code))!, preview, selection);
    expect(status('MENUS')).toEqual({ label: '보임', tone: 'ok' });
    expect(status('AUTHORITY')).toEqual({ label: '진입 권한 없음', tone: 'problem' });
    expect(status('POLLS')).toEqual({ label: '사용 안 함', tone: 'info' });
    // 메뉴 표시가 없는데 기능권한으로 들어갈 수 있으면 주소로만 열린다.
    expect(status('USERS')).toEqual({ label: '메뉴 없이 주소로만 열림', tone: 'info' });
    expect(status('GHOST')).toEqual({ label: '메뉴 표시 없음', tone: 'info' });
    const programs = built.rows.find((entry) => entry.route === '/admin/system/programs')!;
    expect(screenRowStatus(programs, preview, selection)).toEqual({ label: '진입 권한 없음', tone: 'info' });
    expect(screenRowStatus(programs, preview, new Set([key('PROGRAM_READ')]))).toEqual({ label: '메뉴 없이 주소로만 열림', tone: 'info' });
    expect(screenRowStatus(built.byKey.get(UNMATCHED_GROUP_KEY)!, preview, selection)).toBeNull();
  });

  it('처음에는 영역만 펼치고, 문제가 있는 메뉴는 그 상위까지 펼친다. 메뉴에 없는 화면은 접는다', () => {
    const built = model();
    expect([...initialExpandedKeys(built, [])]).toEqual([menuRowKey('AREA')]);
    expect(new Set(initialExpandedKeys(built, ['USERS']))).toEqual(new Set([menuRowKey('AREA'), menuRowKey('SECTION')]));
    expect(ancestorKeys(built, menuRowKey('USERS'))).toEqual([menuRowKey('SECTION'), menuRowKey('AREA')]);
    const shown = visibleScreenRows(built, initialExpandedKeys(built, []), '').map((entry) => entry.key);
    expect(shown).toEqual([menuRowKey('AREA'), menuRowKey('SECTION'), menuRowKey('POLLS'), menuRowKey('AUTHORITY'), menuRowKey('GHOST'), menuRowKey('LEGACY'), UNMATCHED_GROUP_KEY]);
  });

  it('화면 검색은 맞는 줄과 그 상위를 접힘과 무관하게 보인다', () => {
    const built = model();
    const shown = visibleScreenRows(built, new Set(), 'USER_STATUS').map((entry) => entry.key);
    // 접힌 섹션 아래의 줄도 상위와 함께 보이고, 맞지 않는 형제(메뉴 관리)는 숨는다. 메뉴에 없는 화면도 같은 규칙이다.
    expect(shown.slice(0, 3)).toEqual([menuRowKey('AREA'), menuRowKey('SECTION'), menuRowKey('USERS')]);
    expect(shown).not.toContain(menuRowKey('MENUS'));
    expect(shown).not.toContain(menuRowKey('GHOST'));
    for (const shownKey of shown.slice(3)) expect([UNMATCHED_GROUP_KEY, ...built.byKey.get(UNMATCHED_GROUP_KEY)!.childKeys]).toContain(shownKey);
    expect(visibleScreenRows(built, new Set(), '/admin/system/programs').map((entry) => entry.route)).toEqual([null, '/admin/system/programs']);
  });
});
