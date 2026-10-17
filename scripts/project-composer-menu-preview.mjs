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

/*
 * [2026-10-17] 해시 입력을 메뉴 inventory(tb_menu_info 행과 그룹별 NAVIGATION 배정)에 닿을 수 있는 SQL 입력으로 좁힌다(형식 v2).
 *   인덱스나 다른 업무 테이블만 바꾸는 마이그레이션마다 일회용 컨테이너로 해시 한 줄만 바꾸던 갱신을 없앤다.
 *   생성기가 빈 DB 에 늘 적용하는 반복 시드 둘(R__seed_demo 는 번들에 태우지 않는다)과 인가 Contract 는 언제나 넣는다.
 *   versioned migration 의 포함은 fail-closed 다 — 의심스러우면 넣는다. 대소문자·따옴표를 가리지 않는 원문에서
 *   ① 메뉴·권한 계열 이름(menu·authrt·grnt·prgrm·role 을 품은 낱말 — 걷힌 옛 권한 테이블과 주석 속 언급도)을 쓰거나,
 *   ② 이름을 원문에 남기지 않고 닿는 수단(동적 SQL·dblink·search_path·TRUNCATE·DROP … CASCADE·함수·프로시저·트리거·규칙 정의)을
 *      쓰거나, ③ SQL 입력이 정의한 함수·프로시저를 부르거나, ④ 감시하는 테이블로 번지는 이름을 쓰면 넣는다. 번지는 이름은 닫힘으로
 *      모은다 — 감시 테이블의 외래 키가 행을 지우거나 바꾸는(CASCADE·SET NULL·SET DEFAULT) 부모, 감시 이름을 쓰는 트리거 함수(본문을
 *      못 찾거나 SQL 입력 밖의 함수이면 쓰는 것으로 본다)나 규칙이 걸린 테이블, 감시 이름을 읽는 뷰(갱신 가능한 뷰로 행을 바꾼다)다.
 *      늘 넣는 입력이 읽는 테이블도 번지는 이름이다 — 반복 시드는 모든 versioned migration 뒤에 다시 돌아(runAuthorizationMigrationStages),
 *      새 마이그레이션이 바꾼 그 테이블의 행으로 메뉴·배정을 쓸 수 있다. 읽는 이름은 SQL 입력이 만든 테이블·뷰만 센다(CTE·주석 낱말 제외).
 *   정적 해시는 이른 신호일 뿐이다. 스냅숏이 실제 적용 결과와 같은지는 DB 번들 생성의 내용 대조(assertProjectComposerMenusMatch)가
 *   마이그레이션을 바꾸는 모든 변경의 CI 에서 본다 — 이 규칙이 놓치는 경우(문자열로 조립한 이름 등)도 병합 전에 거기서 잡힌다.
 */
const MENU_SOURCE_HASH_PREFIX = 'project-composer-menu-snapshot:v2\0';
const ALWAYS_HASHED_SEEDS = ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql'];
const CONTRACT_SQL_PATH = 'api-server/src/main/resources/db/cutover/authorization-contract.sql';
const INVENTORY_WORDS = /menu|authrt|grnt|prgrm|role/;
const INDIRECT_MECHANISMS = new RegExp([String.raw`\bexecute\b`, String.raw`\bformat\s*\(`, String.raw`\bdblink`, String.raw`\bsearch_path\b`,
  String.raw`\btruncate\b`, String.raw`\bdrop\b[^;]*?\bcascade\b`,
  String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?(?:event\s+)?(?:function|procedure|trigger|rule)\b`].join('|'));
const ROUTINE_DEFINITION = /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-z0-9_.]+)/g;
const ROUTINE_BODY = /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-z0-9_.]+)[\s\S]*?(\$[a-z0-9_]*\$)([\s\S]*?)\2/g;
const TRIGGER_DEFINITION = /\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+[a-z0-9_]+[\s\S]*?\bon\s+([a-z0-9_.]+)[\s\S]*?\bexecute\s+(?:function|procedure)\s+([a-z0-9_.]+)/g;
const RULE_DEFINITION = /\bcreate\s+(?:or\s+replace\s+)?rule\s+[a-z0-9_]+\s+as\s+on\s+[a-z]+\s+to\s+([a-z0-9_.]+)/g;
const TABLE_STATEMENT = /\b(?:create\s+(?:(?:global|local)\s+)?(?:temp(?:orary)?\s+|unlogged\s+)?table|alter\s+table)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?([a-z0-9_.]+)/g;
const PROPAGATING_ACTION = /\bon\s+(?:delete|update)\s+(?:cascade|set\s+(?:null|default))\b/;
const REFERENCED_TABLE = /\breferences\s+(?:only\s+)?([a-z0-9_.]+)/g;
const VIEW_DEFINITION = /\bcreate\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:recursive\s+)?view\s+([a-z0-9_.]+)([\s\S]*)/;
const READ_RELATION = /\b(?:from|join|using)\s+(?:only\s+)?([a-z0-9_.]+)/g;
const unqualified = name => name.slice(name.lastIndexOf('.') + 1);
const nameMention = name => new RegExp(String.raw`\b${name}\b`);

/** 메뉴 inventory 에 닿을 수 있는 SQL 입력(이름 → 원문)의 이름. 규칙은 위 주석이다. alwaysHashed 의 이름은 규칙과 상관없이 넣는다. */
export function menuInventorySqlInputs(sources, alwaysHashed = new Set()) {
  const texts = new Map([...sources].map(([name, text]) => [name, text.toLowerCase().replaceAll('"', '')]));
  const all = [...texts.values()].join('\n;\n');
  const routines = new Set([...all.matchAll(ROUTINE_DEFINITION)].map(match => unqualified(match[1])));
  const bodies = new Map();
  for (const [, routine, , body] of all.matchAll(ROUTINE_BODY)) {
    bodies.set(unqualified(routine), `${bodies.get(unqualified(routine)) ?? ''}\n${body}`);
  }
  const spread = new Set();
  const mentionsWatched = text => INVENTORY_WORDS.test(text) || [...spread].some(name => nameMention(name).test(text));
  const watch = name => {
    const table = unqualified(name);
    if (INVENTORY_WORDS.test(table) || spread.has(table)) return false;
    spread.add(table);
    return true;
  };
  const statements = all.split(';');
  const views = statements.map(statement => statement.match(VIEW_DEFINITION)).filter(Boolean);
  const relations = new Set([...[...all.matchAll(TABLE_STATEMENT)], ...views].map(([, name]) => unqualified(name)));
  for (const name of alwaysHashed) {
    for (const [, read] of (texts.get(name) ?? '').matchAll(READ_RELATION)) if (relations.has(unqualified(read))) watch(read);
  }
  for (let grew = true; grew;) {
    grew = false;
    for (const [, view, definition] of views) if (mentionsWatched(definition)) grew = watch(view) || grew;
    for (const statement of statements) {
      if (!PROPAGATING_ACTION.test(statement)) continue;
      if (![...statement.matchAll(TABLE_STATEMENT)].some(([, subject]) => mentionsWatched(unqualified(subject)))) continue;
      for (const [, parent] of statement.matchAll(REFERENCED_TABLE)) grew = watch(parent) || grew;
    }
    for (const [, table, routine] of all.matchAll(TRIGGER_DEFINITION)) {
      const body = bodies.get(unqualified(routine));
      if (body === undefined || mentionsWatched(body)) grew = watch(table) || grew;
    }
    for (const [, table] of all.matchAll(RULE_DEFINITION)) grew = watch(table) || grew;
  }
  return [...texts].filter(([name, text]) => alwaysHashed.has(name) || mentionsWatched(text) || INDIRECT_MECHANISMS.test(text)
    || [...routines].some(routine => nameMention(routine).test(text))).map(([name]) => name);
}

/** 해시에 넣는 SQL 입력(저장소 경로 → 줄 끝을 LF 로 맞춘 원문)과 고른 경로(정렬). 생성기가 빈 DB 의 메뉴 inventory 를 만들 때 실행하는 입력에서 고른다. */
export function menuSourceHashInputs(root) {
  const sources = new Map(readdirSync(join(root, MIGRATION_ROOT))
    .filter(name => /^V[0-9_]+__.*\.sql$/.test(name) || ALWAYS_HASHED_SEEDS.includes(name))
    .map(name => [`${MIGRATION_ROOT}/${name}`, readFileSync(join(root, MIGRATION_ROOT, name), 'utf8').replace(/\r\n/g, '\n')]));
  sources.set(CONTRACT_SQL_PATH, readFileSync(join(root, CONTRACT_SQL_PATH), 'utf8').replace(/\r\n/g, '\n'));
  const always = new Set([...ALWAYS_HASHED_SEEDS.map(name => `${MIGRATION_ROOT}/${name}`), CONTRACT_SQL_PATH]);
  return { sources, paths: menuInventorySqlInputs(sources, always).sort() };
}

export function projectMenuSourceHash(root) {
  const { sources, paths } = menuSourceHashInputs(root);
  const hash = createHash('sha256').update(MENU_SOURCE_HASH_PREFIX);
  for (const path of paths) hash.update(path).update('\0').update(sources.get(path)).update('\0');
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
