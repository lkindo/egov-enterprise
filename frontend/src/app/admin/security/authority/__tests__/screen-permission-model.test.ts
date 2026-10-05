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
  isBulkEntryScreen,
  menuRowKey,
  navigationCodesUnder,
  preferredEntryCode,
  rowChanged,
  rowHasProblem,
  rowsUnder,
  screenEntryOf,
  screenRowStatus,
  sectionStatus,
  toggleNavigationSubtree,
  UNMATCHED_GROUP_KEY,
  visibleScreenRows,
} from '../components/screen-permission-model';
import { planEntryFixes } from '../components/operation-permission-matrix-model';
import { menusMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
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
      '/admin/system/codes/administ',
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

  /*
   * [2026-10-05 H3 정합 — 동작 변경] 종전(main) 이 시험은 '투표 관리'(ALL: POLL_READ + POLL_READ_ALL)까지 묶음 칸 한 번으로 열어
   * 타인 자료 권한 POLL_READ_ALL 을 더하고, 끌 때도 함께 끄는 것을 고정했다. 같은 줄의 섹션 '진입 권한 추가'·표 위 '진입 권한
   * 모두 추가'와 카탈로그 A5·DEC-OPS-209 ③의 묶음 칸 규칙(보호·…_ALL 은 일괄 선택에서 뺀다)과 어긋났다. 이제 그런 화면은 묶음 칸이
   * 다루지 않고(manual) 화면 줄에서 직접 고른다 — 권한을 좁히는 방향이다(DEC-OPS-225 보강).
   */
  it('묶음의 화면 진입은 들어갈 수 없는 화면에 필요한 만큼만 더한다 — ANY 는 조회 하나, ALL 은 모두, 보호·타인 자료 권한이 필요한 화면은 뺀다', () => {
    const built = model();
    const under = rowsUnder(built, built.byKey.get(menuRowKey('AREA'))!);
    const entry = aggregateCell(under, 'entry', new Set([key('MENU_READ')]), true)!;
    // 메뉴 관리(충족)·사용자 관리·권한 그룹 관리(ANY) — 화면 3개 중 1개 충족. 투표 관리(ALL, 타인 자료 권한 필요)는 직접 고른다.
    expect(entry).toMatchObject({ total: 3, selected: 1 });
    expect(entry.manual.map((row) => row.menuCode)).toEqual(['POLLS']);
    expect(new Set(entry.plan.keys)).toEqual(new Set(['USER_READ', 'AUTHRT_READ'].map(key)));
    expect(entry.plan.keys).not.toContain(key('POLL_READ'));
    expect(entry.plan.keys).not.toContain(key('POLL_READ_ALL'));
    expect(entry.plan.mode).toBe('select');
    // 모두 들어갈 수 있으면 묶음 칸이 다루는 화면의 진입 권한만 끈다 — 투표 관리의 두 권한은 그대로 둔다.
    const satisfied = new Set(['MENU_READ', 'USER_READ', 'POLL_READ', 'POLL_READ_ALL', 'AUTHRT_AUDIT'].map(key));
    const cleared = aggregateCell(under, 'entry', satisfied, true)!.plan;
    expect(cleared.mode).toBe('clear');
    expect(new Set(cleared.keys)).toEqual(new Set(['MENU_READ', 'USER_READ', 'AUTHRT_AUDIT'].map(key)));
    // 투표 관리에 들어갈 수 없어도 묶음 칸은 '모두 들어갈 수 있음'으로 본다 — 그 화면은 묶음 칸의 수에 없다.
    expect(aggregateCell(under, 'entry', new Set(['MENU_READ', 'USER_READ', 'AUTHRT_READ'].map(key)), true))
      .toMatchObject({ total: 3, selected: 3, plan: { mode: 'clear' } });
  });

  it('묶음의 화면 진입은 타인 자료 권한 하나로만 열리는 화면을 더하지 않고, 그런 화면만 있으면 다룰 화면이 없다', () => {
    // 실제 진입 원장: 타인 댓글 관리 ANY[COMMENT_READ_ALL], 설문 허브 ANY[SURVEY_READ_ALL, SURVEY_RSP_READ].
    const navigation2 = [
      { code: 'AREA2', name: '운영', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'COMMENTS', name: '댓글 관리', parentCode: 'AREA2', route: '/admin/system/comments', useYn: 'Y' as const },
      { code: 'SURVEYS', name: '설문 허브', parentCode: 'AREA2', route: '/admin/survey/hub', useYn: 'Y' as const },
      { code: 'ONLY_ALL', name: '타인 자료만', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'COMMENTS2', name: '댓글 관리 2', parentCode: 'ONLY_ALL', route: '/admin/system/comments', useYn: 'Y' as const },
    ];
    const codes = ['COMMENT_READ_ALL', 'SURVEY_READ_ALL', 'SURVEY_RSP_READ'];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(navigation2), codes);
    const comments = built.byKey.get(menuRowKey('COMMENTS'))!;
    expect(comments.entry).toEqual({ state: 'gated', codes: ['COMMENT_READ_ALL'], mode: 'ANY' });
    const area = aggregateCell(rowsUnder(built, built.byKey.get(menuRowKey('AREA2'))!), 'entry', new Set(), true)!;
    // 설문 허브는 타인 자료 권한이 아닌 후보(SURVEY_RSP_READ)로 열 수 있어 묶음 칸이 다룬다 — 조회를 권한다.
    expect(area).toMatchObject({ total: 1, selected: 0, plan: { mode: 'select', keys: [key('SURVEY_RSP_READ')] } });
    expect(area.manual.map((row) => row.menuCode)).toEqual(['COMMENTS']);
    // 타인 자료 권한으로 이미 들어갈 수 있는 화면에는 본인 권한을 덧붙이지 않고, 끌 때도 타인 자료 권한은 남긴다.
    const viaAll = aggregateCell(rowsUnder(built, built.byKey.get(menuRowKey('AREA2'))!), 'entry', new Set([key('SURVEY_READ_ALL')]), true)!;
    expect(viaAll).toMatchObject({ total: 1, selected: 1, plan: { mode: null, keys: [] } });
    // 타인 자료 권한이 필요한 화면만 있으면 다룰 화면이 0개다 — 칸은 '직접 고르기'만 말한다.
    const onlyAll = aggregateCell(rowsUnder(built, built.byKey.get(menuRowKey('ONLY_ALL'))!), 'entry', new Set(), true)!;
    expect(onlyAll).toMatchObject({ total: 0, selected: 0, plan: { mode: null, keys: [] } });
    expect(onlyAll.manual.map((row) => row.menuCode)).toEqual(['COMMENTS2']);
  });

  it('하나만 있으면 열리는 화면의 묶음 진입은 조회가 없어도 타인 자료 권한을 권하지 않는다', () => {
    // 실제 원장에는 아직 이런 화면이 없어 줄을 직접 만든다 — 조회(*_READ) 후보가 없을 때 첫 후보가 타인 자료 권한이면 그것을 고르던 경로.
    const synthetic = {
      ...row('MENUS'), key: 'menu:SYNTH', menuCode: 'SYNTH', name: '가상 화면',
      entry: { state: 'gated' as const, codes: ['POLL_READ_ALL', 'POLL_CREATE'], mode: 'ANY' as const },
    };
    const cell = aggregateCell([synthetic], 'entry', new Set(), true)!;
    expect(cell).toMatchObject({ total: 1, selected: 0, plan: { mode: 'select', keys: [key('POLL_CREATE')] } });
    expect(cell.manual).toEqual([]);
  });

  it('묶음 칸의 화면 진입으로 다룰 수 있는 화면은 일괄 대상 진입 권한으로 열 수 있는 화면이다', () => {
    expect(isBulkEntryScreen({ state: 'gated', codes: ['MENU_READ'], mode: 'ANY' })).toBe(true);
    expect(isBulkEntryScreen({ state: 'gated', codes: ['SURVEY_READ_ALL', 'SURVEY_RSP_READ'], mode: 'ANY' })).toBe(true);
    expect(isBulkEntryScreen({ state: 'gated', codes: ['COMMENT_READ_ALL'], mode: 'ANY' })).toBe(false);
    expect(isBulkEntryScreen({ state: 'gated', codes: ['POLL_READ', 'POLL_READ_ALL'], mode: 'ALL' })).toBe(false);
    // 보호 권한도 같다.
    expect(isBulkEntryScreen({ state: 'gated', codes: ['AUTHRT_GRANT'], mode: 'ANY' })).toBe(false);
    expect(isBulkEntryScreen({ state: 'gated', codes: ['USER_READ', 'USER_PASSWORD'], mode: 'ALL' })).toBe(false);
    expect(isBulkEntryScreen({ state: 'open', codes: [], mode: 'ANY' })).toBe(false);
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
    const programs = built.rows.find((entry) => entry.route === '/admin/system/codes/administ')!;
    expect(screenRowStatus(programs, preview, selection)).toEqual({ label: '진입 권한 없음', tone: 'info' });
    expect(screenRowStatus(programs, preview, new Set([key('ADMCODE_READ')]))).toEqual({ label: '메뉴 없이 주소로만 열림', tone: 'info' });
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
    expect(visibleScreenRows(built, new Set(), '/admin/system/codes/administ').map((entry) => entry.route)).toEqual([null, '/admin/system/codes/administ']);
  });

  /* ── 2026-10-05 한 화면 압축: 영역·섹션 줄의 메뉴 표시 일괄, 섹션 상태, 줄 거르기 ───────────────────────────── */

  it('영역·섹션 줄의 메뉴 표시는 그 아래 메뉴 전체를 켜되 상위도 함께 켜고, 끌 때는 아래 전체를 끈다 — 기능권한은 그대로다', () => {
    const tree = buildNavigationPermissionTree(navigation);
    const built = model();
    const section = row('SECTION');
    expect(navigationCodesUnder(built, section)).toEqual(['SECTION', 'MENUS', 'USERS']);
    const on = toggleNavigationSubtree(tree, new Set([key('MENU_READ')]), 'SECTION', navigationCodesUnder(built, section), true);
    // 섹션을 켜면 상위(관리)도 켜진다 — 상위 누락(저장을 막는다)을 만들지 않는다.
    expect([...on].sort()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:MENUS', 'NAVIGATION:SECTION', 'NAVIGATION:USERS', key('MENU_READ')]);
    // 보이는 메뉴만 주면 그 메뉴만(과 상위) 켠다.
    const visible = new Set([menuRowKey('AREA'), menuRowKey('SECTION'), menuRowKey('USERS')]);
    expect(navigationCodesUnder(built, section, visible)).toEqual(['SECTION', 'USERS']);
    const narrowed = toggleNavigationSubtree(tree, new Set(), 'SECTION', navigationCodesUnder(built, section, visible), true);
    expect([...narrowed].sort()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:USERS']);
    // 끌 때는 보이지 않는 하위도 함께 끈다(상위가 꺼진 하위는 보이지 않고 저장도 막힌다). 상위·다른 메뉴·기능권한은 그대로다.
    const off = toggleNavigationSubtree(tree, new Set([...on, 'NAVIGATION:AUTHORITY']), 'SECTION', ['SECTION'], false);
    expect([...off].sort()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:AUTHORITY', key('MENU_READ')]);
  });

  it('줄의 변경은 그 줄 자신의 칸(메뉴 표시·진입·등록·수정·삭제·그 밖의 기능)만 본다', () => {
    const baseline = new Set<string>();
    expect(rowChanged(row('MENUS'), new Set([key('MENU_READ')]), baseline)).toBe(true);
    expect(rowChanged(row('MENUS'), new Set(['NAVIGATION:MENUS']), baseline)).toBe(true);
    expect(rowChanged(row('MENUS'), new Set([key('USER_READ')]), baseline)).toBe(false);
    // 묶음 줄은 자기 메뉴 표시만 — 아래 화면의 변경은 그 화면 줄이 말한다.
    expect(rowChanged(row('SECTION'), new Set([key('MENU_READ')]), baseline)).toBe(false);
    expect(rowChanged(row('SECTION'), new Set(['NAVIGATION:SECTION']), baseline)).toBe(true);
  });

  it('섹션 상태는 경로가 있는 메뉴의 보임 n/m · 경고 n 과 정해진 권한으로 고칠 수 있는 메뉴만 센다', () => {
    const built = model();
    const selection = new Set(['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS', 'NAVIGATION:USERS', 'NAVIGATION:AUTHORITY']);
    const preview = previewMenuVisibility({ menus: menuPreviewMenusFromCatalog(navigation), navigation: ['AREA', 'SECTION', 'MENUS', 'USERS', 'AUTHORITY'], operations: [] });
    const fixes = planEntryFixes(menusMissingEntryPermission(navigation, selection), new Set(operationCodes));
    const fixByMenu = new Map(fixes.map((fix) => [fix.menu.code, fix]));
    const section = sectionStatus(rowsUnder(built, row('SECTION')), preview, selection, fixByMenu);
    expect(section).toEqual({ total: 2, visible: 0, warnings: 2, autoMenus: ['MENUS', 'USERS'], autoCodes: ['MENU_READ', 'USER_READ'], manualMenus: [] });
    // 영역 — 권한 그룹 관리는 후보가 여럿(AUTHRT_READ·AUTHRT_AUDIT)이라 경고로는 세되 자동 추가에서 빠진다. 사용 안 함 메뉴는 경고가 아니다.
    const area = sectionStatus(rowsUnder(built, row('AREA')), preview, selection, fixByMenu);
    expect(area).toMatchObject({ total: 4, visible: 0, warnings: 3, autoMenus: ['MENUS', 'USERS'], manualMenus: ['AUTHORITY'] });
    expect(rowHasProblem(row('AUTHORITY'), preview, selection, new Set(fixByMenu.keys()))).toBe(true);
    expect(rowHasProblem(row('POLLS'), preview, selection, new Set(fixByMenu.keys()))).toBe(false);
    expect(rowHasProblem(built.byKey.get(UNMATCHED_GROUP_KEY)!, preview, selection, new Set(fixByMenu.keys()))).toBe(false);
  });

  /*
   * [2026-10-05 반박 리뷰 반영, H3] 섹션 단위 '진입 권한 추가'는 영역·섹션 줄 묶음 칸과 같은 제외 규칙을 따른다. 종전에는 정해진
   * 권한(auto)이면 모두 모아, 영역 줄 한 번이 '모두 있어야 열림' 투표 관리의 POLL_READ_ALL 과 댓글 관리의 COMMENT_READ_ALL 을 초안에
   * 넣었다. 이제 그런 메뉴는 직접 고를 메뉴(manualMenus)로 센다.
   */
  it('섹션 단위 진입 권한 추가는 타인 자료·보호 권한이 필요한 메뉴를 빼고 직접 고를 메뉴로 센다', () => {
    const allNavigation = [
      { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'MENUS', name: '메뉴 관리', parentCode: 'AREA', route: '/admin/system/menus', useYn: 'Y' as const },
      { code: 'POLLS', name: '투표 관리', parentCode: 'AREA', route: '/admin/survey/polls', useYn: 'Y' as const },
      { code: 'COMMENTS', name: '댓글 관리', parentCode: 'AREA', route: '/admin/system/comments', useYn: 'Y' as const },
    ];
    const codes = [...operationCodes, 'COMMENT_READ_ALL'];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(allNavigation), codes);
    const selection = new Set(allNavigation.map((menu) => `NAVIGATION:${menu.code}`));
    const preview = previewMenuVisibility({ menus: menuPreviewMenusFromCatalog(allNavigation), navigation: allNavigation.map((menu) => menu.code), operations: [] });
    const fixes = planEntryFixes(menusMissingEntryPermission(allNavigation, selection), new Set(codes));
    // 셋 다 정해진 권한(auto)이다 — 투표 관리는 '모두 있어야 열림'(POLL_READ + POLL_READ_ALL), 댓글 관리는 COMMENT_READ_ALL 하나.
    expect(Object.fromEntries(fixes.map((fix) => [fix.menu.code, fix.kind]))).toEqual({ MENUS: 'auto', POLLS: 'auto', COMMENTS: 'auto' });
    const status = sectionStatus(rowsUnder(built, built.byKey.get(menuRowKey('AREA'))!), preview, selection, new Map(fixes.map((fix) => [fix.menu.code, fix])));
    expect(status).toMatchObject({ total: 3, warnings: 3, autoMenus: ['MENUS'], autoCodes: ['MENU_READ'] });
    expect([...status.manualMenus].sort()).toEqual(['COMMENTS', 'POLLS']);
  });

  it('줄 거르기(include)는 검색과 함께 적용하고 맞는 줄의 상위를 접힘과 무관하게 보인다', () => {
    const built = model();
    const include = new Set([menuRowKey('USERS'), menuRowKey('POLLS')]);
    expect(visibleScreenRows(built, new Set(), '', include).map((entry) => entry.key))
      .toEqual([menuRowKey('AREA'), menuRowKey('SECTION'), menuRowKey('USERS'), menuRowKey('POLLS')]);
    // 검색과 거르기는 둘 다 맞아야 한다.
    expect(visibleScreenRows(built, new Set(), 'USER_STATUS', include).map((entry) => entry.key))
      .toEqual([menuRowKey('AREA'), menuRowKey('SECTION'), menuRowKey('USERS')]);
    // 빈 거르기는 아무 줄도 보이지 않는다(거르기가 꺼진 null 과 다르다).
    expect(visibleScreenRows(built, new Set(), '', new Set())).toEqual([]);
  });
});
