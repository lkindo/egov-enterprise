#!/usr/bin/env node
/**
 * 릴리스 태그의 reusable-base DB 번들을 생성한다.
 *
 * 운영/공유 DB에는 DDL을 실행하지 않는다. 현재 저장소의 versioned migration을 이름이
 * test_reusable_base_* 인 disposable DB에 적용한 뒤 축소하고, 두 번째 disposable DB에서 재검증한다.
 *
 * 공식 사용:
 *   node scripts/generate-reusable-base-db.mjs --profile core
 * 로컬 검증:
 *   node scripts/generate-reusable-base-db.mjs --profile core --allow-dirty --allow-non-release-ref
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBackendLayout } from './reusable-layout.mjs';
import { runReportingChild } from './project-composer-child-failure.mjs';
import { assertSchemaPreserved, buildCompositionAdminSeed, projectCompositionMenus, schemaSnapshotHash,
  schemaSnapshotSql, selectSchemaSnapshot, assertDeclaredCrossDomainForeignKeys,
  assertNavigationEnterable, projectCompositionNavigation } from './project-composer-db.mjs';
import { assertProjectComposerMenusMatch, writeProjectComposerMenuSnapshot } from './project-composer-menu-preview.mjs';
import { TEMP_DB_PREFIX, assertContainerName, assertIdentifier, createDatabase, dropTemporaryDatabase, dump, git, inspectContainer, listObjects, listSequenceDetails, psql,
  quoteSqlIdentifier, restore, sanitizePgDump } from './reusable-db-postgres.mjs';
import { buildIsolatedContractSql, readReviewedAuthorizationCatalogVersion, runAuthorizationMigrationStages, versionedMigrations } from './reusable-db-migrations.mjs';
import { BOARD_MASTER_SEED, REFERENCE_SEED_NAME, boardMasterIds, omitCodeGroupsSql, referenceDataPlan } from './reusable-reference-data.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base');

/** 생성기 엔진이 이 자식을 부르는 단계 이름. 실패 보고는 이 단계에 허용된 코드만 쓴다. */
export const CHILD_STAGE = 'database';

function fail(message) {
  throw new Error(message);
}
export function parseDbGenerationArgs(argv) {
  const args = {
    profile: undefined,
    composition: undefined,
    layout: undefined,
    container: 'egov-e2e-postgres',
    output: undefined,
    allowDirty: false,
    allowNonReleaseRef: false,
    writeMenuSnapshot: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile') args.profile = argv[++index];
    else if (arg === '--composition') {
      if (args.composition !== undefined) fail('--composition may only be supplied once.');
      args.composition = argv[++index];
      if (!args.composition || args.composition.startsWith('--')) fail('--composition requires a resolved JSON path.');
    }
    else if (arg === '--layout') {
      if (args.layout !== undefined) fail('--layout may only be supplied once.');
      const value = argv[++index];
      if (!value || value.startsWith('--')) fail('--layout requires multi-module or single-module.');
      args.layout = normalizeBackendLayout(value);
    }
    else if (arg === '--container') args.container = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else if (arg === '--write-menu-snapshot') args.writeMenuSnapshot = true;
    else if (arg === '--failure-report') {
      // 생성기 엔진이 넘기는 실패 보고 경로(코드가 붙은 실패만 쓴다). 경로 검증은 시작할 때 따로 한다.
      if ('failureReport' in args) fail('--failure-report may only be supplied once.');
      args.failureReport = argv[++index];
      if (!args.failureReport || args.failureReport.startsWith('--')) fail('--failure-report requires a path.');
    }
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if (args.writeMenuSnapshot) {
    // 스냅숏 갱신은 원본 마이그레이션을 적용해 메뉴·그룹 배정만 읽는다. 카탈로그는 이 스냅숏으로 탭 메뉴를
    // 검증하므로, 번들 생성과 묶으면 새 메뉴 행과 그 선언을 함께 넣는 변경에서 갱신 명령이 스스로 막힌다.
    if (args.profile || args.composition || args.output || args.layout || 'failureReport' in args) {
      fail('--write-menu-snapshot은 단독으로 쓴다(--profile·--composition·--output·--layout·--failure-report 없이).');
    }
    return args;
  }
  if (args.profile && args.composition) fail('--profile and --composition are mutually exclusive.');
  if (!args.profile && !args.composition) fail('--profile core|collaboration|demo 또는 --composition PATH가 필요하다.');
  return args;
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function assertSameSet(actual, expected, label) {
  const missing = difference(expected, actual);
  const extra = difference(actual, expected);
  if (missing.length || extra.length) {
    fail(`${label} 불일치 — 누락=[${missing.join(', ')}], 초과=[${extra.join(', ')}]`);
  }
}

/** Available capabilities do not imply a grant: preserve each selected permission's approved default groups. */
export function assertCompositionOperationGrants(actual, permissionCodes, permissionCatalog) {
  const selected = new Set(permissionCodes);
  const permissions = permissionCatalog.permissions.filter(permission => selected.has(permission.code));
  if (permissions.length !== selected.size) fail('Composition references an unknown OPERATION code.');
  const expected = permissions.flatMap(permission => permission.defaultGroups.map(group => {
    if (!['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER'].includes(group)) fail(`Unknown default permission group: ${group}`);
    return JSON.stringify([group, permission.code]);
  }));
  if (!Array.isArray(actual) || actual.some(row => !Array.isArray(row) || row.length !== 2
    || row.some(value => typeof value !== 'string'))) fail('Invalid reapplied OPERATION grant rows.');
  const rows = actual.map(row => JSON.stringify(row));
  if (new Set(rows).size !== rows.length) fail('Duplicate reapplied OPERATION grant rows.');
  assertSameSet(rows, expected, '재적용 DB selected OPERATION group/code grants');
}

export function generatedMigrationSessionSql({ baseline, metaSeed, frameworkSeed, referenceSeed, adminSeed }) {
  return [baseline, metaSeed, frameworkSeed, referenceSeed, adminSeed].map(sql => {
    if ((!Buffer.isBuffer(sql) && typeof sql !== 'string') || !sql.length) fail('Generated migration session requires every baseline and seed.');
    return sql.toString();
  }).join('\n');
}

/**
 * 임시 DB 를 각각 지운다. 하나를 지우다 실패해도 나머지를 지운다. 원래 실패가 있으면(completed=false) 정리 실패는 한 줄로 남기고
 * 원래 실패(코드가 붙은 실패 포함)를 가리지 않는다. 생성이 끝났으면 첫 정리 실패를 다시 던진다(성공 경로의 종전 의미).
 */
export function dropTemporaryDatabases(drop, databases, { completed, report = message => console.error(message) }) {
  let cleanupError;
  for (const database of databases) {
    try { drop(database); } catch (error) { cleanupError ??= error; }
  }
  if (cleanupError && completed) throw cleanupError;
  if (cleanupError) report(`[base-db] 임시 DB 를 지우지 못했습니다: ${cleanupError.message}`);
}

export function safeDbOutputPath(requested, profile, shortSha) {
  const defaultName = `${profile}-${shortSha}-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`;
  const output = resolve(requested ?? join(OUTPUT_ROOT, defaultName));
  const rel = relative(resolve(OUTPUT_ROOT), output);
  if (rel === '' || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) {
    fail(`산출물 경로는 ${OUTPUT_ROOT} 아래여야 한다: ${output}`);
  }
  if (existsSync(output)) fail(`기존 산출물을 덮어쓰지 않는다: ${output}`);
  let ancestor = dirname(output);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const physical = relative(realpathSync(ROOT), realpathSync(ancestor));
  if (physical === '..' || physical.startsWith(`..${sep}`) || isAbsolute(physical)) {
    fail('산출물 물리 경로가 workspace 밖이다.');
  }
  return output;
}

async function main() {
  const args = parseDbGenerationArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  assertContainerName(args.container);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 산출물은 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 산출물은 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  // 프리셋(--profile)과 화면 생성기(--composition)가 같은 해석기를 탄다. 스냅숏 갱신 모드만 해석하지 않는다.
  let composition, composerCatalog, profile;
  if (!args.writeMenuSnapshot) {
    const { loadProjectComposerCatalog } = await import('./project-composer-catalog.mjs');
    const { resolveGeneratorComposition } = await import('./project-composer-recipe.mjs');
    composerCatalog = loadProjectComposerCatalog(ROOT);
    composition = resolveGeneratorComposition({ catalog: composerCatalog, profile: args.profile,
      supplied: args.composition ? JSON.parse(readFileSync(resolve(ROOT, args.composition), 'utf8')) : undefined,
      backendLayout: args.layout, layoutExplicit: args.layout !== undefined, sourceCommit,
      resolveSourceReference: reference => git(['rev-parse', '--verify', `${reference}^{commit}`]) });
    args.profile = composition.profile;
    profile = { packs: composition.packs };
  }
  const shortSha = sourceCommit.slice(0, 12);
  const output = args.writeMenuSnapshot ? undefined : safeDbOutputPath(args.output, args.profile, shortSha);

  const containerInfo = inspectContainer(args.container);
  const user = containerInfo.user;
  const suffix = `${args.profile ?? 'menus'}_${process.pid}_${Date.now().toString(36)}`.toLowerCase();
  const workingDb = assertIdentifier(`${TEMP_DB_PREFIX}${suffix}`, 'working DB');
  const verifyDb = assertIdentifier(`${workingDb}_verify`, 'verify DB');

  const desiredTables = [...(composition?.tables ?? [])].sort();
  const explicitDesiredSequences = [...(composition?.explicitSequences ?? [])].sort();
  const sourceExpectedTables = Object.values(manifest.packs).flatMap((pack) => pack.database.tables).sort();
  const sourceExplicitSequences = Object.values(manifest.packs).flatMap((pack) => pack.database.sequences).sort();

  let workingCreated = false;
  let verifyCreated = false;
  // 실패를 잡아 표시한다(스냅숏 갱신처럼 중간에 돌아가는 성공 경로도 완료로 본다).
  let failed = false;
  try {
    console.log(`[base-db] ${args.profile ?? 'menu-snapshot'}: 현재 versioned migration을 빈 임시 DB에 적용한다.`);
    createDatabase(args.container, user, workingDb);
    workingCreated = true;
    const migrations = versionedMigrations();
    const reviewedSeed = migrations.find(migration => migration.name === 'V2_99__seed_explicit_operation_grants.sql');
    const catalogVersion = readReviewedAuthorizationCatalogVersion(reviewedSeed?.sql.toString('utf8') ?? '');
    const contractSql = readFileSync(join(ROOT, 'api-server/src/main/resources/db/cutover/authorization-contract.sql'), 'utf8');
    runAuthorizationMigrationStages(migrations, {
      migrate: migration => restore(args.container, user, workingDb, `BEGIN;\n${migration.sql.toString('utf8')}\nCOMMIT;`),
      repeatables: () => {
        for (const seed of ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql']) {
          restore(args.container, user, workingDb, readFileSync(join(ROOT, 'api-server/src/main/resources/db/migration', seed)));
        }
      },
      contract: () => restore(args.container, user, workingDb, buildIsolatedContractSql(workingDb, catalogVersion, contractSql)),
    });

    const sourceTables = listObjects(args.container, user, workingDb, 'table');
    assertSameSet(sourceTables, sourceExpectedTables, '현재 migration table snapshot');
    const sourceSequenceDetails = listSequenceDetails(args.container, user, workingDb);
    if (sourceSequenceDetails.length !== manifest.databaseSnapshot.physicalSequenceCount) {
      fail(`현재 migration sequence 수 ${sourceSequenceDetails.length}가 snapshot ${manifest.databaseSnapshot.physicalSequenceCount}와 다르다.`);
    }
    const sourceSequenceNames = sourceSequenceDetails.map((sequence) => sequence.name);
    const unknownOwnedTables = sourceSequenceDetails
      .filter((sequence) => sequence.ownerTable && !sourceExpectedTables.includes(sequence.ownerTable));
    if (unknownOwnedTables.length) {
      fail(`sequence owner table이 manifest에 없다: ${unknownOwnedTables.map((sequence) => `${sequence.name}->${sequence.ownerTable}`).join(', ')}`);
    }
    const unownedSequences = sourceSequenceDetails
      .filter((sequence) => !sequence.ownerTable)
      .map((sequence) => sequence.name);
    assertSameSet(unownedSequences, sourceExplicitSequences, 'standalone sequence 소유권');
    const desiredSequences = sourceSequenceDetails
      .filter((sequence) =>
        (sequence.ownerTable && desiredTables.includes(sequence.ownerTable)) ||
        explicitDesiredSequences.includes(sequence.name))
      .map((sequence) => sequence.name)
      .sort();

    // [2026-10-05] 레거시 연결 프로그램 컬럼·원장은 읽지 않는다(GAP-PROGRAM-001).
    const migratedMenus = JSON.parse(psql(args.container, user, workingDb, `SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.menu_sn),'[]'::json)::text
      FROM (SELECT menu_sn,up_menu_sn,menu_ordr,menu_nm,menu_expln,modern_route,use_yn,del_yn FROM public.tb_menu_info) m`));
    // 원본 마이그레이션이 남긴 그룹별 메뉴 표시 배정. 생성 시드가 선택 메뉴만큼 투영한다.
    const migratedNavigation = JSON.parse(psql(args.container, user, workingDb, `SELECT COALESCE(json_agg(json_build_object('authrt_cd',authrt_cd,'menu_sn',authrt_grnt_cd::bigint)
      ORDER BY authrt_cd, authrt_grnt_cd::bigint),'[]'::json)::text FROM public.tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'`));
    if (args.writeMenuSnapshot) {
      writeProjectComposerMenuSnapshot(ROOT, { menus: migratedMenus, navigation: migratedNavigation });
      console.log('[base-db] PASS: config/project-composer-menus.json 을 원본 마이그레이션 적용 결과로 갱신했다.');
      return;
    }
    assertProjectComposerMenusMatch(ROOT, { menus: migratedMenus, navigation: migratedNavigation });
    let selectedSchema, menuProjection, navigationProjection, compositionAdminSeed, pageAccess, compositionOperationGrants;
    // Read live metadata from this owned, just-migrated DB before projecting its schema.
    // No producer/shared DB data is a seed source.
    const sourceSnapshot = JSON.parse(psql(args.container, user, workingDb, schemaSnapshotSql()));
    assertDeclaredCrossDomainForeignKeys(sourceSnapshot, composerCatalog);
    selectedSchema = selectSchemaSnapshot(sourceSnapshot, desiredTables, desiredSequences, composition.optionalForeignKeys);
    for (const [table, expected] of Object.entries(manifest.databaseSnapshot.metaRows)) {
      if (Number(psql(args.container, user, workingDb, `SELECT count(*) FROM public.${quoteSqlIdentifier(table)}`)) !== expected) {
        fail(`Composition source metadata differs from the checked-in snapshot: ${table}`);
      }
    }
    menuProjection = projectCompositionMenus({ menus: migratedMenus, menuRoutes: composition.menuRoutes, excludedMenuTabs: composition.excludedMenuTabs });
    const permissionCatalog = JSON.parse(readFileSync(join(ROOT, 'config/governance/permission-catalog.json'), 'utf8'));
    pageAccess = { pagePermissions: permissionCatalog.pagePermissions, pagePermissionModes: permissionCatalog.pagePermissionModes };
    const selectedCodes = new Set(composition.permissionCodes);
    compositionOperationGrants = permissionCatalog.permissions.filter(permission => selectedCodes.has(permission.code))
      .flatMap(permission => permission.defaultGroups.map(group => [group, permission.code]));
    navigationProjection = projectCompositionNavigation({ menus: menuProjection.menus, navigation: migratedNavigation,
      operationGrants: compositionOperationGrants, pageAccess });
    compositionAdminSeed = buildCompositionAdminSeed({
      bootstrapSql: readFileSync(join(ROOT, 'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql'), 'utf8'),
      projection: menuProjection, permissionCodes: composition.permissionCodes, permissionCatalog, navigation: navigationProjection,
    });

    const tablesToDrop = sourceTables.filter((table) => !desiredTables.includes(table));
    if (tablesToDrop.length) {
      const sql = tablesToDrop.map((table) => `DROP TABLE IF EXISTS public.${quoteSqlIdentifier(table)} CASCADE;`).join('\n');
      restore(args.container, user, workingDb, sql);
    }
    const sequencesToDrop = listObjects(args.container, user, workingDb, 'sequence')
      .filter((sequence) => !desiredSequences.includes(sequence));
    if (sequencesToDrop.length) {
      const sql = sequencesToDrop.map((sequence) => `DROP SEQUENCE IF EXISTS public.${quoteSqlIdentifier(sequence)} CASCADE;`).join('\n');
      restore(args.container, user, workingDb, sql);
    }
    assertSameSet(listObjects(args.container, user, workingDb, 'table'), desiredTables, '축소 DB table');
    assertSameSet(listObjects(args.container, user, workingDb, 'sequence'), desiredSequences, '축소 DB sequence');
    assertSchemaPreserved(selectedSchema.snapshot,
      JSON.parse(psql(args.container, user, workingDb, schemaSnapshotSql())), '축소 DB physical schema');

    const baseline = sanitizePgDump(
      dump(args.container, user, workingDb, ['--schema-only']),
      `Reusable Base ${args.profile} schema baseline`,
    );
    const metaParts = ['meta_standard_domains', 'meta_standard_terms', 'meta_standard_words'].map((table) =>
      dump(args.container, user, workingDb, [
        '--data-only',
        '--column-inserts',
        '--rows-per-insert=500',
        `--table=public.${table}`,
      ]),
    );
    const metaSeed = sanitizePgDump(Buffer.concat(metaParts), '표준용어 최종 snapshot seed');

    // 참조 데이터(설계서 B5): 원본 마이그레이션이 넣은 공통코드 그룹과 앱이 하드코딩한 게시판 마스터 가운데 선택한 기능의 몫만 싣는다.
    const referencePlan = referenceDataPlan(composition.resolvedDomains, desiredTables);
    const omitSql = omitCodeGroupsSql(referencePlan);
    if (omitSql) restore(args.container, user, workingDb, omitSql);
    const boardMasterSeed = readFileSync(join(ROOT, BOARD_MASTER_SEED), 'utf8');
    if (referencePlan.includeBoardMasters) restore(args.container, user, workingDb, boardMasterSeed);
    const rowsOf = (sql) => psql(args.container, user, workingDb, sql).split(/\r?\n/).filter(Boolean);
    const referenceCodeGroups = rowsOf('SELECT cd_id FROM public.tb_com_cd ORDER BY cd_id');
    const referenceBoardMasters = referencePlan.includeBoardMasters ? rowsOf('SELECT bbs_id FROM public.tb_bbs_master ORDER BY bbs_id') : [];
    if (referencePlan.includeBoardMasters) assertSameSet(referenceBoardMasters, boardMasterIds(boardMasterSeed), '참조 데이터 게시판 마스터');
    for (const group of referencePlan.omittedCodeGroups) {
      if (referenceCodeGroups.includes(group)) fail(`참조 데이터: 선택하지 않은 기능의 코드 그룹 ${group} 이 남았다`);
    }
    const referenceSeed = sanitizePgDump(dump(args.container, user, workingDb, [
      '--data-only', '--column-inserts', '--on-conflict-do-nothing', ...referencePlan.tables.map((table) => `--table=public.${table}`),
    ]), '선택 구성 참조 데이터 seed(공통코드 그룹·게시판 마스터)');

    mkdirSync(join(output, 'db', 'migration'), { recursive: true });
    writeFileSync(join(output, 'db', 'migration', 'V1_0__baseline.sql'), baseline, 'utf8');
    writeFileSync(join(output, 'db', 'migration', 'V1_1__seed_meta_standard.sql'), metaSeed, 'utf8');
    writeFileSync(join(output, 'db', 'migration', REFERENCE_SEED_NAME), referenceSeed, 'utf8');
    writeFileSync(join(output, 'schema-contract.json'), `${JSON.stringify(selectedSchema, null, 2)}\n`, 'utf8');
    // 프로필-안전 repeatable 만 번들에 태운다. R__seed_demo.sql 은 collaboration 테이블을
    // 참조하므로 core 프로필에서 깨진다 — 데모 프로필의 정의로 남겨두고 복사하지 않는다.
    // R__zz_seed_base_admin.sql 이 빠지면 verify 단계의 admin bootstrap 단언이 red 다.
    const REPEATABLE_SEEDS = ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql'];
    for (const seed of REPEATABLE_SEEDS) {
      // 원본 관리자 시드는 바꾸지 않는다. 번들에는 선택 구성으로 투영한 시드를 쓴다.
      if (seed === 'R__zz_seed_base_admin.sql') {
        writeFileSync(join(output, 'db', 'migration', seed), compositionAdminSeed, 'utf8');
      } else copyFileSync(
        join(ROOT, 'api-server', 'src', 'main', 'resources', 'db', 'migration', seed),
        join(output, 'db', 'migration', seed),
      );
    }

    const lock = {
      schemaVersion: 1,
      profile: args.profile,
      packs: profile.packs,
      sourceCommit,
      sourceReleaseTag: releaseTag ?? null,
      localDevelopmentBuild: !releaseTag || Boolean(dirty),
      generatedAt: new Date().toISOString(),
      sourceDatabase: 'current-versioned-migrations',
      sourceMigrationCount: migrations.length,
      tables: desiredTables,
      sequences: desiredSequences,
      metaRows: manifest.databaseSnapshot.metaRows,
      composition, compositionHash: composition.compositionHash, recipeHash: composition.recipeHash,
      catalogHash: composition.catalogHash, layout: composition.backendLayout, resolvedDomains: composition.resolvedDomains,
      schemaSnapshotHash: schemaSnapshotHash(selectedSchema.snapshot), omittedForeignKeys: selectedSchema.omittedForeignKeys,
      menus: menuProjection.menus.map(menu => ({ id: menu.menu_sn, parent: menu.up_menu_sn, route: menu.modern_route })),
      permissionCodes: composition.permissionCodes,
      referenceData: { codeGroups: referenceCodeGroups, omittedCodeGroups: referencePlan.omittedCodeGroups, boardMasters: referenceBoardMasters },
    };
    // 번들은 빈 DB 재적용 단언을 모두 통과한 뒤에만 lock 을 갖는다. 그 전에 실패하면 소비될 수 없다.

    console.log(`[base-db] ${args.profile}: 생성 SQL을 두 번째 빈 임시 DB에서 재적용한다.`);
    createDatabase(args.container, user, verifyDb);
    verifyCreated = true;
    // Reuse one connection like Flyway: a baseline session setting must not
    // silently disappear between files. Repeatables keep description order.
    restore(args.container, user, verifyDb, generatedMigrationSessionSql({
      baseline, metaSeed,
      frameworkSeed: readFileSync(join(output, 'db', 'migration', 'R__seed_framework.sql')),
      referenceSeed: readFileSync(join(output, 'db', 'migration', REFERENCE_SEED_NAME)),
      adminSeed: readFileSync(join(output, 'db', 'migration', 'R__zz_seed_base_admin.sql')),
    }));
    assertSameSet(listObjects(args.container, user, verifyDb, 'table'), desiredTables, '재적용 DB table');
    assertSameSet(listObjects(args.container, user, verifyDb, 'sequence'), desiredSequences, '재적용 DB sequence');
    const reappliedSchema = JSON.parse(psql(args.container, user, verifyDb, schemaSnapshotSql()));
    writeFileSync(join(output, 'schema-reapplied.json'), `${JSON.stringify(reappliedSchema, null, 2)}\n`, 'utf8');
    assertSchemaPreserved(selectedSchema.snapshot, reappliedSchema, '재적용 DB physical schema');
    assertSameSet(psql(args.container, user, verifyDb, 'SELECT menu_sn FROM public.tb_menu_info ORDER BY menu_sn').split(/\r?\n/),
      menuProjection.menus.map(menu => String(menu.menu_sn)), '재적용 DB selected menus');
    assertCompositionOperationGrants(JSON.parse(psql(args.container, user, verifyDb,
      "SELECT COALESCE(json_agg(json_build_array(authrt_cd, authrt_grnt_cd) ORDER BY authrt_cd, authrt_grnt_cd),'[]'::json)::text FROM public.tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'")),
    composition.permissionCodes, JSON.parse(readFileSync(join(ROOT, 'config/governance/permission-catalog.json'), 'utf8')));
    // 그룹별 메뉴 표시는 원본 배정의 투영과 정확히 같고, 그룹마다 표시하는 메뉴에 실제로 들어갈 수 있어야 한다.
    const reappliedNavigation = JSON.parse(psql(args.container, user, verifyDb, `SELECT COALESCE(json_agg(json_build_object('authrt_cd',authrt_cd,'menu_sn',authrt_grnt_cd::bigint)
      ORDER BY authrt_cd, authrt_grnt_cd::bigint),'[]'::json)::text FROM public.tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION'`));
    assertSameSet(reappliedNavigation.map(row => `${row.authrt_cd}:${row.menu_sn}`),
      navigationProjection.map(row => `${row.authrt_cd}:${row.menu_sn}`), '재적용 DB group NAVIGATION grants');
    assertNavigationEnterable({ menus: menuProjection.menus, navigation: reappliedNavigation, pageAccess,
      operationGrants: JSON.parse(psql(args.container, user, verifyDb,
        "SELECT COALESCE(json_agg(json_build_array(authrt_cd, authrt_grnt_cd)),'[]'::json)::text FROM public.tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION'")) });
    // 참조 데이터는 임시 DB 에서 고른 몫과 정확히 같다.
    assertSameSet(psql(args.container, user, verifyDb, 'SELECT cd_id FROM public.tb_com_cd ORDER BY cd_id').split(/\r?\n/).filter(Boolean),
      referenceCodeGroups, '재적용 DB 공통코드 그룹');
    if (referencePlan.includeBoardMasters) {
      assertSameSet(psql(args.container, user, verifyDb, 'SELECT bbs_id FROM public.tb_bbs_master ORDER BY bbs_id').split(/\r?\n/).filter(Boolean),
        referenceBoardMasters, '재적용 DB 게시판 마스터');
    }
    const metaMismatches = [];
    for (const [table, expected] of Object.entries(manifest.databaseSnapshot.metaRows)) {
      const actual = Number(psql(args.container, user, verifyDb, `SELECT count(*) FROM public.${quoteSqlIdentifier(table)}`));
      if (actual !== expected) metaMismatches.push(`${table}=${actual}(snapshot ${expected})`);
    }
    if (metaMismatches.length) fail(`재적용 DB meta row 수 불일치: ${metaMismatches.join(', ')}`);

    // The empty baseline must explicitly grant capabilities and navigation, with an audited
    // bootstrap marker. Program URLs are inventory and never authorization policy.
    const bootstrapChecks = [
      ['tb_menu_info 관리자 메뉴 트리', 'SELECT count(*) FROM public.tb_menu_info'],
      ['ROLE_ADMIN NAVIGATION', "SELECT count(*) FROM public.tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' AND authrt_type_cd='NAVIGATION'"],
      ['ROLE_ADMIN permission administration', "SELECT count(*) FROM (SELECT authrt_cd FROM public.tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' AND authrt_type_cd='OPERATION' AND authrt_grnt_cd IN ('AUTHRT_GRANT','AUTHRT_ASSIGN') GROUP BY authrt_cd HAVING count(*)=2) complete_manager"],
      ['initial admin membership', "SELECT count(*) FROM public.tb_authrt_user_map WHERE scrty_dcsn_trgt_id='USRCNFRM_00000000001' AND authrt_cd='ROLE_ADMIN'"],
      ['audited schema-only bootstrap', "SELECT count(*) FROM public.tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'"],
    ];
    for (const [label, sql] of bootstrapChecks) {
      const count = Number(psql(args.container, user, verifyDb, sql));
      if (!Number.isFinite(count) || count < 1) {
        fail(`재적용 DB admin bootstrap 시드 부재 — ${label} (count=${count}). 생성 base 가 day-1 관리자 잠금 상태로 출하됩니다.`);
      }
    }

    writeFileSync(
      join(output, 'README.md'),
      `# Reusable Base DB — ${args.profile}\n\n` +
        `- source: \`${releaseTag ?? shortSha}\` (\`${sourceCommit}\`)\n` +
        `- packs: ${profile.packs.join(', ')}\n` +
        `- tables: ${desiredTables.length}\n` +
        `- sequences: ${desiredSequences.length}\n` +
        `- 검증: 별도 빈 PostgreSQL DB에 baseline → meta seed → framework seed → reference data seed → admin bootstrap seed 재적용 완료\n` +
        `- 참조 데이터: 공통코드 그룹 ${referenceCodeGroups.length}개, 게시판 마스터 ${referenceBoardMasters.length}개\n` +
        `- 권한 전환: 생성기 소유 disposable DB에서 실제 Contract 리허설 후 구 6개 테이블 제거 확인\n` +
        `- day-1 관리자 부트스트랩: 명시 OPERATION/NAVIGATION·회원 그룹·감사 이력 SQL 단언 PASS\n\n` +
        `운영 DB 축소용 마이그레이션이 아니다. 신규 프로젝트의 빈 DB에서만 사용한다.\n`,
      'utf8',
    );
    lock.validated = true;
    lock.migrationFiles = Object.fromEntries(readdirSync(join(output, 'db', 'migration')).sort().map(name => [
      `db/migration/${name}`, createHash('sha256').update(readFileSync(join(output, 'db', 'migration', name))).digest('hex'),
    ]));
    writeFileSync(join(output, 'profile-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    console.log(`[base-db] PASS: ${relative(ROOT, output).split(sep).join('/')}`);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    dropTemporaryDatabases(database => dropTemporaryDatabase(args.container, user, database),
      [verifyCreated && verifyDb, workingCreated && workingDb].filter(Boolean), { completed: !failed });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  runReportingChild({ argv: process.argv.slice(2), root: ROOT, stage: CHILD_STAGE, label: 'base-db', main });
}
