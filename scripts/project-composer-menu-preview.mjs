import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectCompositionMenus } from './project-composer-db.mjs';

export const COMPOSER_MENU_SNAPSHOT_PATH = 'config/project-composer-menus.json';
const MIGRATION_ROOT = 'api-server/src/main/resources/db/migration';
// [2026-10-05] 레거시 연결 프로그램(prgrm_file_nm)과 프로그램 원장(tb_prgrm_lst)은 앱이 읽지 않아 snapshot 에서 뺐다
//   (GAP-PROGRAM-001). 형식이 바뀌었으므로 schemaVersion 은 2 다.
const SNAPSHOT_SCHEMA_VERSION = 2;
const MENU_FIELDS = ['menu_sn', 'up_menu_sn', 'menu_ordr', 'menu_nm', 'menu_expln', 'modern_route', 'use_yn', 'del_yn'];
const fail = message => { throw new Error(`Composer menu snapshot: ${message}`); };

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

function normalizeInventory({ menus }) {
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
  return { menus: normalizedMenus };
}

export function validateProjectComposerMenus(snapshot, expectedSourceHash) {
  if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || !/^[a-f0-9]{64}$/.test(expectedSourceHash)
    || snapshot.sourceMigrationHash !== expectedSourceHash) fail('stale migration hash; refresh from an owned migrated database');
  const inventory = normalizeInventory(snapshot);
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, sourceMigrationHash: expectedSourceHash, ...inventory };
}

export function loadProjectComposerMenus(root) {
  return validateProjectComposerMenus(JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')), projectMenuSourceHash(root));
}

export function assertProjectComposerMenusMatch(root, inventory) {
  const snapshot = loadProjectComposerMenus(root);
  const actual = normalizeInventory(inventory);
  if (JSON.stringify({ menus: snapshot.menus }) !== JSON.stringify(actual)) {
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

export function projectComposerMenuPreview(root, composition) {
  const snapshot = loadProjectComposerMenus(root);
  return projectCompositionMenus({ menus: snapshot.menus, menuRoutes: composition.menuRoutes }).menus.map(menu => ({
    id: menu.menu_sn, label: menu.menu_nm, parent: menu.up_menu_sn || null, path: menu.modern_route,
  }));
}
