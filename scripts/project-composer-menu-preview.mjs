import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectCompositionMenus } from './project-composer-db.mjs';
import { ComposerError } from './project-composer-errors.mjs';

export const COMPOSER_MENU_SNAPSHOT_PATH = 'config/project-composer-menus.json';
const MIGRATION_ROOT = 'api-server/src/main/resources/db/migration';
// [2026-10-05] 레거시 연결 프로그램(prgrm_file_nm)과 프로그램 원장(tb_prgrm_lst)은 앱이 읽지 않아 snapshot 에서 뺐다
//   (GAP-PROGRAM-001). 형식이 바뀌었으므로 schemaVersion 은 2 다.
// [2026-10-07] 그룹별 메뉴 표시(NAVIGATION) 배정을 함께 싣는다. 생성기 시드가 선택 메뉴만큼 투영해 일반 사용자
//   사이드바가 원본과 같은 구성으로 시작하게 한다. 형식이 바뀌었으므로 schemaVersion 은 3 이다.
const SNAPSHOT_SCHEMA_VERSION = 3;
const MENU_FIELDS = ['menu_sn', 'up_menu_sn', 'menu_ordr', 'menu_nm', 'menu_expln', 'modern_route', 'use_yn', 'del_yn'];
// 스냅숏이 원본 마이그레이션을 따라가지 못한 경우(해시·형식·실제 적용 결과와 다름)는 모두 갱신으로 풀린다.
const fail = message => { throw new ComposerError('MENU_SNAPSHOT_STALE', {}, `Composer menu snapshot: ${message}`); };

/** Include every SQL input executed to construct the empty-DB menu inventory. */
export function projectMenuSourceHash(root) {
  const files = readdirSync(join(root, MIGRATION_ROOT))
    .filter(name => /^V[0-9_]+__.*\.sql$/.test(name) || ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql'].includes(name))
    .map(name => `${MIGRATION_ROOT}/${name}`);
  files.push('api-server/src/main/resources/db/cutover/authorization-contract.sql');
  const hash = createHash('sha256').update('project-composer-menu-snapshot:v1\0');
  for (const path of files.sort()) hash.update(path).update('\0').update(readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')).update('\0');
  return hash.digest('hex');
}

function normalizeNavigation(navigation, menuIds) {
  if (!Array.isArray(navigation)) fail('navigation grant inventory is missing');
  const rows = navigation.map(row => {
    if (!row || Object.keys(row).sort().join() !== 'authrt_cd,menu_sn' || typeof row.authrt_cd !== 'string'
      || !/^[A-Z][A-Z0-9_]{0,49}$/.test(row.authrt_cd) || !menuIds.has(row.menu_sn)) fail('invalid navigation grant');
    return { authrt_cd: row.authrt_cd, menu_sn: row.menu_sn };
  }).sort((left, right) => left.authrt_cd.localeCompare(right.authrt_cd) || left.menu_sn - right.menu_sn);
  if (new Set(rows.map(row => `${row.authrt_cd}:${row.menu_sn}`)).size !== rows.length) fail('duplicate navigation grant');
  return rows;
}

function normalizeInventory({ menus, navigation }) {
  if (!Array.isArray(menus) || !menus.length) fail('menu inventory is missing');
  const normalizedMenus = menus.map(row => {
    if (!row || !MENU_FIELDS.every(field => Object.hasOwn(row, field)) || !Number.isSafeInteger(row.menu_sn) || row.menu_sn <= 0
      || (row.up_menu_sn !== null && (!Number.isSafeInteger(row.up_menu_sn) || row.up_menu_sn < 0))
      || !Number.isSafeInteger(row.menu_ordr) || typeof row.menu_nm !== 'string' || !row.menu_nm.trim()
      || !['Y', 'N'].includes(row.use_yn) || !['Y', 'N'].includes(row.del_yn)
      || ['menu_expln', 'modern_route'].some(field => row[field] !== null && typeof row[field] !== 'string')) {
      fail('invalid menu definition');
    }
    return Object.fromEntries(MENU_FIELDS.map(field => [field, row[field]]));
  }).sort((left, right) => left.menu_sn - right.menu_sn);
  const menuIds = new Set(normalizedMenus.map(row => row.menu_sn));
  if (menuIds.size !== normalizedMenus.length) fail('duplicate menu identity');
  for (const menu of normalizedMenus) {
    if (menu.up_menu_sn && !menuIds.has(menu.up_menu_sn)) fail(`missing parent for menu ${menu.menu_sn}`);
  }
  return { menus: normalizedMenus, navigation: normalizeNavigation(navigation, menuIds) };
}

export function validateProjectComposerMenus(snapshot, expectedSourceHash) {
  if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || !/^[a-f0-9]{64}$/.test(expectedSourceHash)
    || snapshot.sourceMigrationHash !== expectedSourceHash) fail('stale migration hash; refresh from an owned migrated database');
  const inventory = normalizeInventory(snapshot);
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, sourceMigrationHash: expectedSourceHash, ...inventory };
}

export function loadProjectComposerMenus(root) {
  // 스냅숏 파일만 갱신으로 풀리는 자료다. 원본 SQL 파일을 읽지 못한 것(projectMenuSourceHash)은 내부 오류로 남긴다.
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')); }
  catch { fail('snapshot file is missing or unreadable'); }
  return validateProjectComposerMenus(snapshot, projectMenuSourceHash(root));
}

export function assertProjectComposerMenusMatch(root, inventory) {
  const snapshot = loadProjectComposerMenus(root);
  const actual = normalizeInventory(inventory);
  if (JSON.stringify({ menus: snapshot.menus, navigation: snapshot.navigation }) !== JSON.stringify(actual)) {
    fail('checked-in preview differs from the actual migrated menu inventory');
  }
  return snapshot;
}

/** Only the generator's owned, migrated database supplies inventory to this explicit refresh. */
export function writeProjectComposerMenuSnapshot(root, inventory) {
  const snapshot = { schemaVersion: SNAPSHOT_SCHEMA_VERSION, sourceMigrationHash: projectMenuSourceHash(root), ...normalizeInventory(inventory) };
  writeFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

// 호출자가 이미 적재한 스냅숏을 넘길 수 있다(계획이 적재한 스냅숏을 미리보기가 다시 쓰도록).
// 메뉴마다 같은 상위 안의 순서(order)와 종류(kind)를 싣는다(설계서 E8).
// - screen: 이 구성에서 화면으로 가는 메뉴.
// - category: 원본에도 화면 없이 하위 메뉴만 묶는 메뉴.
// - detached(목적지 없음): 원본에는 화면이 있지만 이 구성에서 그 화면이 빠져, 남은 하위 메뉴를 묶기만 하는 메뉴.
// base 구성을 주면 이 구성이 더하는 메뉴를 added 로 표시한다(공통 기반 대비 추가). 메뉴 행이 base 에 없거나,
// 행은 있지만 base 에서는 화면이 없던 메뉴가 이 구성에서 화면이 되면 더한 것이다('나의 업무' 처럼 화면이 생긴 경우).
export function projectComposerMenuPreview(root, composition, snapshot = loadProjectComposerMenus(root), { base } = {}) {
  const project = value => projectCompositionMenus({ menus: snapshot.menus, menuRoutes: value.menuRoutes, excludedMenuTabs: value.excludedMenuTabs }).menus;
  const original = new Map(snapshot.menus.map(menu => [menu.menu_sn, menu]));
  const baseScreens = base ? new Map(project(base).map(menu => [menu.menu_sn, Boolean(menu.modern_route)])) : null;
  return project(composition).map(menu => ({
    id: menu.menu_sn, label: menu.menu_nm, parent: menu.up_menu_sn || null, path: menu.modern_route, order: menu.menu_ordr,
    kind: menu.modern_route ? 'screen' : original.get(menu.menu_sn).modern_route ? 'detached' : 'category',
    ...(baseScreens ? { added: !baseScreens.has(menu.menu_sn) || (Boolean(menu.modern_route) && !baseScreens.get(menu.menu_sn)) } : {}),
  }));
}
