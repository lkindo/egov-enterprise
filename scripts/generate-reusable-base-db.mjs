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
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSchemaPreserved, buildCompositionAdminSeed, projectCompositionMenus, schemaSnapshotHash,
  schemaSnapshotSql, selectSchemaSnapshot, verifyResolvedDbComposition } from './project-composer-db.mjs';
import { assertProjectComposerMenusMatch, writeProjectComposerMenuSnapshot } from './project-composer-menu-preview.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base');
const TEMP_DB_PREFIX = 'test_reusable_base_';
const MAX_BUFFER = 128 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

export function parseDbGenerationArgs(argv) {
  const args = {
    profile: undefined,
    composition: undefined,
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
    else if (arg === '--container') args.container = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else if (arg === '--write-menu-snapshot') args.writeMenuSnapshot = true;
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if (args.profile && args.composition) fail('--profile and --composition are mutually exclusive.');
  if (!args.profile && !args.composition) fail('--profile core|collaboration|demo 또는 --composition PATH가 필요하다.');
  return args;
}

function run(command, args, { input, capture = false, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    input,
    encoding: null,
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr?.toString('utf8').trim();
    fail(`${command} 실행 실패(exit ${result.status})${stderr ? `: ${stderr}` : ''}`);
  }
  if (!quiet && !capture && result.stderr?.length) process.stderr.write(result.stderr);
  return result.stdout ?? Buffer.alloc(0);
}

function git(args) {
  return run('git', args, { capture: true }).toString('utf8').trim();
}

function assertIdentifier(value, label) {
  if (!value || !/^[a-zA-Z0-9_]+$/.test(value)) fail(`${label} 식별자가 안전하지 않다: ${value}`);
  return value;
}

function assertContainerName(value) {
  if (!value || !/^[a-zA-Z0-9_.-]+$/.test(value)) fail(`container 이름이 안전하지 않다: ${value}`);
  return value;
}

function docker(args, options = {}) {
  return run('docker', args, options);
}

function dockerExec(container, args, options = {}) {
  return docker(['exec', '-i', container, ...args], options);
}

function psql(container, user, database, sql) {
  return dockerExec(
    container,
    ['psql', '--username', user, '--dbname', database, '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', sql],
    { capture: true },
  ).toString('utf8').trim();
}

function listObjects(container, user, database, kind) {
  const query = kind === 'table'
    ? "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    : "SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename";
  const output = psql(container, user, database, query);
  return output ? output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : [];
}

function listSequenceDetails(container, user, database) {
  const sql = `
    SELECT seq.relname || E'\\t' || COALESCE((
      SELECT owner.relname
      FROM pg_depend dependency
      JOIN pg_class owner ON owner.oid = dependency.refobjid
      WHERE dependency.objid = seq.oid
        AND dependency.refobjsubid > 0
        AND dependency.deptype IN ('a', 'i')
        AND owner.relkind IN ('r', 'p')
      LIMIT 1
    ), '')
    FROM pg_class seq
    JOIN pg_namespace namespace ON namespace.oid = seq.relnamespace
    WHERE namespace.nspname = 'public' AND seq.relkind = 'S'
    ORDER BY seq.relname`;
  const output = psql(container, user, database, sql);
  return output
    ? output.split(/\r?\n/).filter(Boolean).map((line) => {
        const [name, ownerTable] = line.split('\t');
        return { name, ownerTable: ownerTable || null };
      })
    : [];
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

function quoteSqlIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function sanitizePgDump(buffer, title) {
  const body = buffer
    .toString('utf8')
    .split(/\r?\n/)
    .filter((line) => !/^\\(?:restrict|unrestrict)\b/.test(line)
      // Flyway reuses its connection for later unqualified repeatable seeds.
      // pg_dump's own objects are qualified; keep the caller's configured schema.
      && line !== "SELECT pg_catalog.set_config('search_path', '', false);")
    .join('\n')
    .trimEnd();
  return `-- ${title}\n-- config/reusable-base-profiles.json에서 생성됨. 수동 편집 금지.\n\n${body}\n`;
}

export function generatedMigrationSessionSql({ baseline, metaSeed, frameworkSeed, adminSeed }) {
  return [baseline, metaSeed, frameworkSeed, adminSeed].map(sql => {
    if ((!Buffer.isBuffer(sql) && typeof sql !== 'string') || !sql.length) fail('Generated migration session requires every baseline and seed.');
    return sql.toString();
  }).join('\n');
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

function inspectContainer(container) {
  const raw = docker(['inspect', container], { capture: true }).toString('utf8');
  const [inspection] = JSON.parse(raw);
  if (!inspection?.State?.Running) fail(`PostgreSQL container가 실행 중이 아니다: ${container}`);
  const env = Object.fromEntries(
    (inspection.Config?.Env ?? []).map((entry) => {
      const index = entry.indexOf('=');
      return index < 0 ? [entry, ''] : [entry.slice(0, index), entry.slice(index + 1)];
    }),
  );
  return {
    user: assertIdentifier(env.POSTGRES_USER, 'POSTGRES_USER'),
    database: assertIdentifier(env.POSTGRES_DB, 'POSTGRES_DB'),
  };
}

function createDatabase(container, user, database) {
  dockerExec(container, ['createdb', '--username', user, database]);
}

function dropTemporaryDatabase(container, user, database) {
  if (!database.startsWith(TEMP_DB_PREFIX) || !/^[a-z0-9_]+$/.test(database)) {
    fail(`임시 DB 삭제 안전조건 위반: ${database}`);
  }
  dockerExec(container, ['dropdb', '--username', user, '--if-exists', database], { quiet: true });
}

function dump(container, user, database, args) {
  return dockerExec(
    container,
    ['pg_dump', '--username', user, '--dbname', database, '--no-owner', '--no-privileges', ...args],
    { capture: true },
  );
}

function versionedMigrations() {
  const migrationRoot = join(ROOT, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
  const versionParts = (name) => name.match(/^V([0-9_]+)__/)[1].split('_').map(Number);
  const compareVersion = (left, right) => {
    const a = versionParts(left);
    const b = versionParts(right);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const difference = (a[index] ?? 0) - (b[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return left.localeCompare(right);
  };
  return readdirSync(migrationRoot)
    .filter((name) => /^V[0-9_]+__.*\.sql$/.test(name))
    .sort(compareVersion)
    .map((name) => ({ name, sql: readFileSync(join(migrationRoot, name)) }));
}

/** Plan only: immutable expansion evidence must survive until the actual Contract is checked. */
export function planAuthorizationMigrationStages(migrations) {
  const expansion = 'V2_98__expand_authorization_grants_and_history.sql';
  const operationSeed = 'V2_99__seed_explicit_operation_grants.sql';
  const names = migrations.map(migration => migration.name);
  if (new Set(names).size !== names.length) fail('Duplicate versioned migration in Contract rehearsal.');
  const parts = name => {
    const version = /^V([0-9]+(?:_[0-9]+)*)__.*\.sql$/.exec(name)?.[1];
    if (!version) fail('Unknown versioned migration in Contract rehearsal.');
    return version.split('_').map(Number);
  };
  const compare = (left, right) => {
    const a = parts(left), b = parts(right);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const order = (a[index] ?? 0) - (b[index] ?? 0);
      if (order) return order;
    }
    return 0;
  };
  for (let index = 1; index < names.length; index += 1) {
    if (compare(names[index - 1], names[index]) >= 0) fail('Migration order must be strictly increasing before planning Contract.');
  }
  const cutoverIndex = names.indexOf(operationSeed);
  if (cutoverIndex < 0 || names.indexOf(expansion) < 0 || names.indexOf(expansion) >= cutoverIndex) {
    fail('Contract rehearsal requires the exact V2_98 expansion and V2_99 seed.');
  }
  return { beforeContract: migrations.slice(0, cutoverIndex + 1), afterContract: migrations.slice(cutoverIndex + 1) };
}

/** Synchronous restore failures stop the sequence; later migrations cannot precede Contract. */
export function runAuthorizationMigrationStages(migrations, actions) {
  const stages = planAuthorizationMigrationStages(migrations);
  for (const migration of stages.beforeContract) actions.migrate(migration);
  actions.repeatables();
  actions.contract();
  for (const migration of stages.afterContract) actions.migrate(migration);
  actions.repeatables();
}

function reviewedSqlWithoutComments(sql) {
  const text = sql.replace(/\r\n/g, '\n');
  let source = '', quoted = false, lineComment = false, blockDepth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (lineComment) {
      if (char === '\n') { lineComment = false; source += char; }
    } else if (blockDepth > 0) {
      if (char === '/' && next === '*') { blockDepth += 1; index += 1; }
      else if (char === '*' && next === '/') { blockDepth -= 1; index += 1; }
      else if (char === '\n') source += char;
    } else if (quoted) {
      source += char;
      if (char === "'") {
        if (next === "'") { source += next; index += 1; }
        else quoted = false;
      }
    } else if (char === "'") {
      quoted = true;
      source += char;
    } else if (char === '-' && next === '-') {
      lineComment = true;
      source += ' ';
      index += 1;
    } else if (char === '/' && next === '*') {
      blockDepth = 1;
      source += ' ';
      index += 1;
    } else source += char;
  }
  if (quoted || blockDepth > 0) fail('Reviewed V2_99 has an unterminated SQL literal or block comment.');
  return source;
}

/** The historical Contract must use the immutable V2_99 review, independent of runtime bindings. */
export function readReviewedAuthorizationCatalogVersion(sql) {
  const source = reviewedSqlWithoutComments(sql);
  const witnesses = new Set(['initial_operation_grant', 'legacy_policy:tb_role_info',
    'legacy_policy:tb_authrt_role_map', 'legacy_policy:tb_role_prgrm_map',
    'legacy_policy:tb_role_hierarchy', 'legacy_policy:program_url']);
  const statements = [...source.matchAll(/^INSERT INTO tb_authrt_chg_hstry\b[\s\S]*?;/gm)];
  const selects = [...source.matchAll(/^SELECT 'migration:2\.99','([^']*)',/gm)];
  if (statements.length !== witnesses.size || selects.length !== witnesses.size) {
    fail('Reviewed V2_99 requires exactly six historical audit INSERT/SELECT statements.');
  }
  let version;
  for (const [statement] of statements) {
    const audit = /^SELECT 'migration:2\.99','([a-f0-9]{64})','(GROUP(?:_GRANT)?)','MIGRATE',/m.exec(statement);
    const labels = [...statement.matchAll(/'(initial_operation_grant|legacy_policy:[^']*)'/g)];
    if (!audit || labels.length !== 1 || !witnesses.delete(labels[0][1])) {
      fail('Reviewed V2_99 has an invalid catalog digest or missing, duplicate or unknown historical witness.');
    }
    const expectedType = labels[0][1] === 'initial_operation_grant' ? 'GROUP_GRANT' : 'GROUP';
    if (audit[2] !== expectedType || (version !== undefined && version !== audit[1])) {
      fail('Reviewed V2_99 historical audit types and catalog digests must agree.');
    }
    version = audit[1];
  }
  return version;
}

function restore(container, user, database, sql) {
  dockerExec(
    container,
    ['psql', '--username', user, '--dbname', database, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1'],
    { input: Buffer.isBuffer(sql) ? sql : Buffer.from(sql, 'utf8'), quiet: true },
  );
}

/** Raw SQL rehearsal ledger is disposable evidence only; it is removed before pg_dump. */
export function buildIsolatedContractSql(database, catalogVersion, contractSql) {
  if (!/^test_reusable_base_[a-z0-9_]+$/.test(database)) fail('Contract rehearsal requires a disposable generated DB name.');
  if (!/^[a-f0-9]{64}$/.test(catalogVersion)) fail('Contract rehearsal requires the reviewed catalog digest.');
  if (!contractSql.includes('DO $authorization_contract$')) fail('The actual authorization Contract SQL is required.');
  const evidence = createHash('sha256').update(`DISPOSABLE_BASE_REHEARSAL:${database}`).digest('hex');
  const backup = createHash('sha256').update('DISPOSABLE_BASE_NO_OPERATIONAL_BACKUP').digest('hex');
  return `BEGIN;
DO $$ BEGIN
  IF current_database() <> '${database}' THEN RAISE EXCEPTION 'Disposable Contract target mismatch'; END IF;
END $$;
CREATE TABLE flyway_schema_history(version varchar(50),success boolean);
INSERT INTO flyway_schema_history VALUES('2.98',true),('2.99',true);
SELECT set_config('app.authorization_cutover_evidence','${evidence}',true);
SELECT set_config('app.authorization_backup_sha256','${backup}',true);
SELECT set_config('app.authorization_catalog_version','${catalogVersion}',true);
${contractSql}
DROP TABLE flyway_schema_history;
COMMIT;`;
}

async function main() {
  const args = parseDbGenerationArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  let profile = manifest.profiles?.[args.profile];
  if (!args.composition && !profile) fail(`지원하지 않는 profile: ${args.profile}`);
  assertContainerName(args.container);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 산출물은 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 산출물은 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  let composition;
  if (args.composition) {
    const { loadProjectComposerCatalog } = await import('./project-composer-catalog.mjs');
    const { verifyProjectComposition } = await import('./project-composer-recipe.mjs');
    const input = JSON.parse(readFileSync(resolve(ROOT, args.composition), 'utf8'));
    const resolved = verifyProjectComposition(input, loadProjectComposerCatalog(ROOT));
    composition = verifyResolvedDbComposition(input, resolved, sourceCommit,
      reference => git(['rev-parse', '--verify', `${reference}^{commit}`]));
    args.profile = composition.profile;
    profile = { packs: composition.packs };
  }
  const shortSha = sourceCommit.slice(0, 12);
  const output = safeDbOutputPath(args.output, args.profile, shortSha);

  const containerInfo = inspectContainer(args.container);
  const user = containerInfo.user;
  const suffix = `${args.profile}_${process.pid}_${Date.now().toString(36)}`.toLowerCase();
  const workingDb = assertIdentifier(`${TEMP_DB_PREFIX}${suffix}`, 'working DB');
  const verifyDb = assertIdentifier(`${workingDb}_verify`, 'verify DB');

  const desiredTables = composition ? [...composition.tables].sort()
    : profile.packs.flatMap((packName) => manifest.packs[packName].database.tables).sort();
  const explicitDesiredSequences = composition ? [...composition.explicitSequences].sort()
    : profile.packs.flatMap((packName) => manifest.packs[packName].database.sequences).sort();
  const sourceExpectedTables = Object.values(manifest.packs).flatMap((pack) => pack.database.tables).sort();
  const sourceExplicitSequences = Object.values(manifest.packs).flatMap((pack) => pack.database.sequences).sort();

  let workingCreated = false;
  let verifyCreated = false;
  try {
    console.log(`[base-db] ${args.profile}: 현재 versioned migration을 빈 임시 DB에 적용한다.`);
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

    let migratedMenus, migratedPrograms;
    if (composition || args.writeMenuSnapshot) {
      migratedMenus = JSON.parse(psql(args.container, user, workingDb, `SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.menu_sn),'[]'::json)::text
        FROM (SELECT menu_sn,up_menu_sn,menu_ordr,menu_nm,prgrm_file_nm,menu_expln,modern_route,use_yn,del_yn FROM public.tb_menu_info) m`));
      migratedPrograms = JSON.parse(psql(args.container, user, workingDb, `SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.prgrm_file_nm),'[]'::json)::text
        FROM (SELECT prgrm_file_nm,prgrm_korn_nm,url,prgrm_strg_path,prgrm_expln FROM public.tb_prgrm_lst) p`));
      if (composition && !args.writeMenuSnapshot) assertProjectComposerMenusMatch(ROOT, { menus: migratedMenus, programs: migratedPrograms });
    }
    let selectedSchema, menuProjection, compositionAdminSeed;
    if (composition) {
      // Read live metadata from this owned, just-migrated DB before projecting its schema.
      // No producer/shared DB data is a seed source.
      const sourceSnapshot = JSON.parse(psql(args.container, user, workingDb, schemaSnapshotSql()));
      selectedSchema = selectSchemaSnapshot(sourceSnapshot, desiredTables, desiredSequences, composition.optionalForeignKeys);
      for (const [table, expected] of Object.entries(manifest.databaseSnapshot.metaRows)) {
        if (Number(psql(args.container, user, workingDb, `SELECT count(*) FROM public.${quoteSqlIdentifier(table)}`)) !== expected) {
          fail(`Composition source metadata differs from the checked-in snapshot: ${table}`);
        }
      }
      menuProjection = projectCompositionMenus({ menus: migratedMenus, programs: migratedPrograms, menuRoutes: composition.menuRoutes });
      compositionAdminSeed = buildCompositionAdminSeed({
        bootstrapSql: readFileSync(join(ROOT, 'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql'), 'utf8'),
        projection: menuProjection, permissionCodes: composition.permissionCodes,
        permissionCatalog: JSON.parse(readFileSync(join(ROOT, 'config/governance/permission-catalog.json'), 'utf8')),
      });
    }

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
    if (composition) assertSchemaPreserved(selectedSchema.snapshot,
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

    mkdirSync(join(output, 'db', 'migration'), { recursive: true });
    writeFileSync(join(output, 'db', 'migration', 'V1_0__baseline.sql'), baseline, 'utf8');
    writeFileSync(join(output, 'db', 'migration', 'V1_1__seed_meta_standard.sql'), metaSeed, 'utf8');
    if (composition) writeFileSync(join(output, 'schema-contract.json'), `${JSON.stringify(selectedSchema, null, 2)}\n`, 'utf8');
    // 프로필-안전 repeatable 만 번들에 태운다. R__seed_demo.sql 은 collaboration 테이블을
    // 참조하므로 core 프로필에서 깨진다 — 데모 프로필의 정의로 남겨두고 복사하지 않는다.
    // R__zz_seed_base_admin.sql 이 빠지면 verify 단계의 admin bootstrap 단언이 red 다.
    const REPEATABLE_SEEDS = ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql'];
    for (const seed of REPEATABLE_SEEDS) {
      if (composition && seed === 'R__zz_seed_base_admin.sql') {
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
      ...(composition ? { composition, compositionHash: composition.compositionHash, recipeHash: composition.recipeHash,
        catalogHash: composition.catalogHash, layout: composition.backendLayout, resolvedDomains: composition.resolvedDomains,
        schemaSnapshotHash: schemaSnapshotHash(selectedSchema.snapshot), omittedForeignKeys: selectedSchema.omittedForeignKeys,
        menus: menuProjection.menus.map(menu => ({ id: menu.menu_sn, parent: menu.up_menu_sn, route: menu.modern_route })),
        permissionCodes: composition.permissionCodes } : {}),
    };
    // Legacy profiles keep their existing contract. A new composition cannot be
    // consumed as a successful DB bundle until every empty-DB assertion passes.
    if (!composition) writeFileSync(join(output, 'profile-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');

    console.log(`[base-db] ${args.profile}: 생성 SQL을 두 번째 빈 임시 DB에서 재적용한다.`);
    createDatabase(args.container, user, verifyDb);
    verifyCreated = true;
    // Reuse one connection like Flyway: a baseline session setting must not
    // silently disappear between files. Repeatables keep description order.
    restore(args.container, user, verifyDb, generatedMigrationSessionSql({
      baseline, metaSeed,
      frameworkSeed: readFileSync(join(output, 'db', 'migration', 'R__seed_framework.sql')),
      adminSeed: readFileSync(join(output, 'db', 'migration', 'R__zz_seed_base_admin.sql')),
    }));
    assertSameSet(listObjects(args.container, user, verifyDb, 'table'), desiredTables, '재적용 DB table');
    assertSameSet(listObjects(args.container, user, verifyDb, 'sequence'), desiredSequences, '재적용 DB sequence');
    if (composition) {
      const reappliedSchema = JSON.parse(psql(args.container, user, verifyDb, schemaSnapshotSql()));
      writeFileSync(join(output, 'schema-reapplied.json'), `${JSON.stringify(reappliedSchema, null, 2)}\n`, 'utf8');
      assertSchemaPreserved(selectedSchema.snapshot, reappliedSchema, '재적용 DB physical schema');
      assertSameSet(psql(args.container, user, verifyDb, 'SELECT menu_sn FROM public.tb_menu_info ORDER BY menu_sn').split(/\r?\n/),
        menuProjection.menus.map(menu => String(menu.menu_sn)), '재적용 DB selected menus');
      assertSameSet(psql(args.container, user, verifyDb, "SELECT DISTINCT authrt_grnt_cd FROM public.tb_authrt_grnt_map WHERE authrt_type_cd='OPERATION' ORDER BY authrt_grnt_cd").split(/\r?\n/),
        composition.permissionCodes, '재적용 DB selected OPERATION codes');
      assertSameSet(psql(args.container, user, verifyDb, "SELECT authrt_grnt_cd FROM public.tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' AND authrt_type_cd='NAVIGATION' ORDER BY authrt_grnt_cd").split(/\r?\n/),
        menuProjection.menus.map(menu => String(menu.menu_sn)), '재적용 DB selected NAVIGATION codes');
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
        `- 검증: 별도 빈 PostgreSQL DB에 baseline → meta seed → framework seed → admin bootstrap seed 재적용 완료\n` +
        `- 권한 전환: 생성기 소유 disposable DB에서 실제 Contract 리허설 후 구 6개 테이블 제거 확인\n` +
        `- day-1 관리자 부트스트랩: 명시 OPERATION/NAVIGATION·회원 그룹·감사 이력 SQL 단언 PASS\n\n` +
        `운영 DB 축소용 마이그레이션이 아니다. 신규 프로젝트의 빈 DB에서만 사용한다.\n`,
      'utf8',
    );
    if (composition) {
      lock.validated = true;
      lock.migrationFiles = Object.fromEntries(readdirSync(join(output, 'db', 'migration')).sort().map(name => [
        `db/migration/${name}`, createHash('sha256').update(readFileSync(join(output, 'db', 'migration', name))).digest('hex'),
      ]));
      writeFileSync(join(output, 'profile-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    }
    if (args.writeMenuSnapshot) writeProjectComposerMenuSnapshot(ROOT, { menus: migratedMenus, programs: migratedPrograms });
    console.log(`[base-db] PASS: ${relative(ROOT, output).split(sep).join('/')}`);
  } finally {
    if (verifyCreated) dropTemporaryDatabase(args.container, user, verifyDb);
    if (workingCreated) dropTemporaryDatabase(args.container, user, workingDb);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  main().catch(error => {
    console.error(`[base-db] FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
