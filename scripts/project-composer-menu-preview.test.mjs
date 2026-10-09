import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertProjectComposerMenusMatch, COMPOSER_MENU_SNAPSHOT_PATH, loadProjectComposerMenus,
  projectComposerMenuPreview, projectMenuSourceHash, validateProjectComposerMenus,
  writeProjectComposerMenuSnapshot } from './project-composer-menu-preview.mjs';
import { ComposerError } from './project-composer-errors.mjs';

const inventory = {
  menus: [
    { menu_sn: 10, up_menu_sn: null, menu_ordr: 1, menu_nm: '관리 센터', menu_expln: null, modern_route: null, use_yn: 'Y', del_yn: 'N' },
    { menu_sn: 11, up_menu_sn: 10, menu_ordr: 2, menu_nm: '선택한 기능', menu_expln: null, modern_route: '/admin/help?tab=FAQ', use_yn: 'Y', del_yn: 'N' },
    { menu_sn: 12, up_menu_sn: 10, menu_ordr: 3, menu_nm: '제외한 기능', menu_expln: null, modern_route: '/admin/help?tab=COMMUNITY', use_yn: 'Y', del_yn: 'N' },
  ],
  navigation: [{ authrt_cd: 'ROLE_USER', menu_sn: 11 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 10 }],
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'composer-menu-'));
  const migrations = join(root, 'api-server/src/main/resources/db/migration');
  mkdirSync(migrations, { recursive: true });
  mkdirSync(join(root, 'api-server/src/main/resources/db/cutover'), { recursive: true });
  mkdirSync(join(root, 'config'));
  for (const name of ['V1_0__baseline.sql', 'R__seed_framework.sql', 'R__zz_seed_base_admin.sql']) {
    writeFileSync(join(migrations, name), `-- ${name}\nSELECT 1;\n`);
  }
  writeFileSync(join(root, 'api-server/src/main/resources/db/cutover/authorization-contract.sql'), '-- reviewed Contract\nSELECT 1;\n');
  return { root, migrations };
}

test('checked-in menu preview is bound to the current migration, seed and Contract sources', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  assert.doesNotThrow(() => loadProjectComposerMenus(root));
});

test('preview is the exact projected menu hierarchy with labels, not the frontend route inventory', () => {
  const { root } = fixture();
  try {
    writeProjectComposerMenuSnapshot(root, inventory);
    assert.deepEqual(projectComposerMenuPreview(root, { menuRoutes: ['/admin/help', '/screen-without-menu'],
      excludedMenuTabs: ['/admin/help?tab=COMMUNITY'] }), [
      { id: 10, label: '관리 센터', parent: null, path: null, order: 1, kind: 'category' },
      { id: 11, label: '선택한 기능', parent: 10, path: '/admin/help?tab=FAQ', order: 2, kind: 'screen' },
    ]);
    assert.equal(loadProjectComposerMenus(root).menus.length, 3);
    assert.doesNotThrow(() => assertProjectComposerMenusMatch(root, inventory));
    const changed = structuredClone(inventory);
    changed.menus[1].menu_nm = 'Unexpected drift';
    assert.throws(() => assertProjectComposerMenusMatch(root, changed), /differs from the actual/);
    const regranted = structuredClone(inventory);
    regranted.navigation.push({ authrt_cd: 'ROLE_USER', menu_sn: 12 });
    assert.throws(() => assertProjectComposerMenusMatch(root, regranted), /differs from the actual/, 'a navigation grant drift is a snapshot drift');
    assert.deepEqual(loadProjectComposerMenus(root).navigation, [{ authrt_cd: 'ROLE_ADMIN', menu_sn: 10 }, { authrt_cd: 'ROLE_USER', menu_sn: 11 }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/*
 * 메뉴 트리 미리보기(E8): 같은 상위 안의 순서와 종류를 싣는다. 원본에는 화면이 있지만 이 구성에서 그 화면이 빠져
 * 하위 메뉴만 묶는 메뉴는 '목적지 없음'(detached)이고, 원본에도 화면이 없는 메뉴는 분류(category)다.
 * 비교 구성(base)을 주면 그 구성에 없는 메뉴를 added 로 표시하고, 주지 않으면 added 를 싣지 않는다.
 */
test('the preview keeps menu order and kind and marks menus the base composition does not have', () => {
  const row = (menu_sn, up_menu_sn, menu_ordr, menu_nm, modern_route) => ({ menu_sn, up_menu_sn, menu_ordr, menu_nm, menu_expln: null, modern_route, use_yn: 'Y', del_yn: 'N' });
  const snapshot = { menus: [row(1, null, 2, '업무', '/work'), row(2, 1, 1, '일정', '/schedule'), row(3, null, 1, '관리', null), row(4, 3, 1, '사용자', '/admin/users')] };
  const composition = routes => ({ menuRoutes: routes, excludedMenuTabs: [] });
  assert.deepEqual(projectComposerMenuPreview(null, composition(['/schedule', '/admin/users']), snapshot, { base: composition(['/admin/users']) }), [
    { id: 1, label: '업무', parent: null, path: null, order: 2, kind: 'detached', added: true },
    { id: 2, label: '일정', parent: 1, path: '/schedule', order: 1, kind: 'screen', added: true },
    { id: 3, label: '관리', parent: null, path: null, order: 1, kind: 'category', added: false },
    { id: 4, label: '사용자', parent: 3, path: '/admin/users', order: 1, kind: 'screen', added: false },
  ]);
  // 전체 화면이 남으면 '업무' 도 화면이다.
  assert.equal(projectComposerMenuPreview(null, composition(['/work', '/schedule']), snapshot)[0].kind, 'screen');
  assert.ok(projectComposerMenuPreview(null, composition(['/admin/users']), snapshot).every(menu => !('added' in menu)), 'no base, no added flag');
});

test('stale snapshots fail for changed migrations, seeds, or Contract while CRLF is normalized', () => {
  const { root, migrations } = fixture();
  try {
    const snapshot = writeProjectComposerMenuSnapshot(root, inventory);
    const baseline = join(migrations, 'V1_0__baseline.sql');
    const original = readFileSync(baseline, 'utf8');
    writeFileSync(baseline, original.replace(/\n/g, '\r\n'));
    assert.equal(projectMenuSourceHash(root), snapshot.sourceMigrationHash);
    for (const path of [baseline, join(migrations, 'R__zz_seed_base_admin.sql'),
      join(root, 'api-server/src/main/resources/db/cutover/authorization-contract.sql')]) {
      const source = readFileSync(path, 'utf8');
      writeFileSync(path, `${source}\nSELECT 2;\n`);
      assert.throws(() => loadProjectComposerMenus(root), /stale migration hash/);
      writeFileSync(path, source);
    }
    writeFileSync(join(migrations, 'V1_1__new_menu.sql'), 'SELECT 3;');
    assert.throws(() => loadProjectComposerMenus(root), /stale migration hash/);
    assert.equal(JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')).sourceMigrationHash, snapshot.sourceMigrationHash);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('invalid menu identities, missing parents and the retired v1 shape cannot become a trusted preview', () => {
  const hash = 'a'.repeat(64);
  const valid = { schemaVersion: 3, sourceMigrationHash: hash, ...structuredClone(inventory) };
  assert.doesNotThrow(() => validateProjectComposerMenus(valid, hash));
  for (const mutate of [value => value.menus.push(value.menus[0]), value => value.menus.shift(),
    value => { value.menus = []; }, value => { value.menus[0].menu_sn = "10);DROP"; },
    value => { value.menus[1].menu_ordr = '2'; }, value => { value.menus[1].modern_route = 5; },
    // [2026-10-05] v1 은 레거시 연결 프로그램(prgrm_file_nm·programs)을 실었다 — 형식이 바뀌었으므로 거부한다.
    value => { value.schemaVersion = 1; },
    // [2026-10-07] v2 는 그룹별 메뉴 표시 배정이 없었다. 배정은 실재 메뉴를 가리키고 한 번씩만 있어야 한다.
    value => { value.schemaVersion = 2; }, value => { delete value.navigation; },
    value => { value.navigation.push({ authrt_cd: 'ROLE_USER', menu_sn: 99 }); },
    value => { value.navigation.push({ ...value.navigation[0] }); },
    value => { value.navigation[0].authrt_cd = "ROLE_USER');--"; }]) {
    const snapshot = structuredClone(valid);
    mutate(snapshot);
    assert.throws(() => validateProjectComposerMenus(snapshot, hash));
  }
});

/*
 * 스냅숏이 원본 마이그레이션을 따라가지 못한 경우(파일 없음·읽을 수 없음·해시·형식·실제 적용 결과와 다름)는 모두
 * MENU_SNAPSHOT_STALE 이다 — 갱신 명령(npm run project:menus:refresh)으로 풀린다. 원본 SQL 파일을 읽지 못한 것은 갱신으로
 * 풀리지 않으므로 이 코드가 아니다(내부 오류).
 */
test('every stale or unreadable snapshot is MENU_SNAPSHOT_STALE and an unreadable migration source is not', () => {
  const { root, migrations } = fixture();
  const stale = run => assert.throws(run, error => error instanceof ComposerError && error.code === 'MENU_SNAPSHOT_STALE');
  try {
    stale(() => loadProjectComposerMenus(root));
    writeFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), '{ not json');
    stale(() => loadProjectComposerMenus(root));
    writeProjectComposerMenuSnapshot(root, inventory);
    assert.doesNotThrow(() => loadProjectComposerMenus(root));
    const written = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8'));
    stale(() => validateProjectComposerMenus({ ...written, schemaVersion: 2 }, projectMenuSourceHash(root)));
    stale(() => assertProjectComposerMenusMatch(root, { menus: inventory.menus.slice(0, 2), navigation: inventory.navigation }));
    writeFileSync(join(migrations, 'V2_0__new_menu.sql'), 'SELECT 2;\n');
    stale(() => loadProjectComposerMenus(root));
    rmSync(migrations, { recursive: true });
    assert.throws(() => loadProjectComposerMenus(root), error => !(error instanceof ComposerError) && error.code === 'ENOENT');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
