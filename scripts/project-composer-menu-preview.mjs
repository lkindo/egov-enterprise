import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectCompositionMenus } from './project-composer-db.mjs';

export const COMPOSER_MENU_SNAPSHOT_PATH = 'config/project-composer-menus.json';
const MIGRATION_ROOT = 'api-server/src/main/resources/db/migration';
const MENU_FIELDS = ['menu_sn', 'up_menu_sn', 'menu_ordr', 'menu_nm', 'prgrm_file_nm', 'menu_expln', 'modern_route', 'use_yn', 'del_yn'];
const PROGRAM_FIELDS = ['prgrm_file_nm', 'prgrm_korn_nm', 'url', 'prgrm_strg_path', 'prgrm_expln'];
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

function normalizeInventory({ menus, programs }) {
  if (!Array.isArray(menus) || !Array.isArray(programs) || !menus.length) fail('menu/program inventory is missing');
  const normalizedMenus = menus.map(row => {
    if (!row || !MENU_FIELDS.every(field => Object.hasOwn(row, field)) || !Number.isSafeInteger(row.menu_sn) || row.menu_sn <= 0
      || (row.up_menu_sn !== null && (!Number.isSafeInteger(row.up_menu_sn) || row.up_menu_sn < 0))
      || !Number.isSafeInteger(row.menu_ordr) || typeof row.menu_nm !== 'string' || !row.menu_nm.trim()
      || !['Y', 'N'].includes(row.use_yn) || !['Y', 'N'].includes(row.del_yn)
      || ['prgrm_file_nm', 'menu_expln', 'modern_route'].some(field => row[field] !== null && typeof row[field] !== 'string')) {
      fail('invalid menu definition');
    }
    return Object.fromEntries(MENU_FIELDS.map(field => [field, row[field]]));
  }).sort((left, right) => left.menu_sn - right.menu_sn);
  const normalizedPrograms = programs.map(row => {
    if (!row || !PROGRAM_FIELDS.every(field => Object.hasOwn(row, field))
      || typeof row.prgrm_file_nm !== 'string' || !row.prgrm_file_nm
      || PROGRAM_FIELDS.some(field => row[field] !== null && typeof row[field] !== 'string')) fail('invalid program definition');
    return Object.fromEntries(PROGRAM_FIELDS.map(field => [field, row[field]]));
  }).sort((left, right) => left.prgrm_file_nm.localeCompare(right.prgrm_file_nm));
  const menuIds = new Set(normalizedMenus.map(row => row.menu_sn));
  const programNames = new Set(normalizedPrograms.map(row => row.prgrm_file_nm));
  if (menuIds.size !== normalizedMenus.length || programNames.size !== normalizedPrograms.length) fail('duplicate menu/program identity');
  for (const menu of normalizedMenus) {
    if (menu.up_menu_sn && !menuIds.has(menu.up_menu_sn)) fail(`missing parent for menu ${menu.menu_sn}`);
    if (menu.prgrm_file_nm && !programNames.has(menu.prgrm_file_nm)) fail(`missing program for menu ${menu.menu_sn}`);
  }
  return { menus: normalizedMenus, programs: normalizedPrograms };
}

export function validateProjectComposerMenus(snapshot, expectedSourceHash) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(expectedSourceHash)
    || snapshot.sourceMigrationHash !== expectedSourceHash) fail('stale migration hash; refresh from an owned migrated database');
  const inventory = normalizeInventory(snapshot);
  return { schemaVersion: 1, sourceMigrationHash: expectedSourceHash, ...inventory };
}

export function loadProjectComposerMenus(root) {
  return validateProjectComposerMenus(JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')), projectMenuSourceHash(root));
}

export function assertProjectComposerMenusMatch(root, inventory) {
  const snapshot = loadProjectComposerMenus(root);
  const actual = normalizeInventory(inventory);
  if (JSON.stringify({ menus: snapshot.menus, programs: snapshot.programs }) !== JSON.stringify(actual)) {
    fail('checked-in preview differs from the actual migrated menu/program inventory');
  }
  return snapshot;
}

/** Only the generator's owned, migrated database supplies inventory to this explicit refresh. */
export function writeProjectComposerMenuSnapshot(root, inventory) {
  const snapshot = { schemaVersion: 1, sourceMigrationHash: projectMenuSourceHash(root), ...normalizeInventory(inventory) };
  writeFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

export function projectComposerMenuPreview(root, composition) {
  const snapshot = loadProjectComposerMenus(root);
  return projectCompositionMenus({ ...snapshot, menuRoutes: composition.menuRoutes }).menus.map(menu => ({
    id: menu.menu_sn, label: menu.menu_nm, parent: menu.up_menu_sn || null, path: menu.modern_route,
  }));
}
