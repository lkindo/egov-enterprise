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
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base');
const TEMP_DB_PREFIX = 'test_reusable_base_';
const MAX_BUFFER = 128 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = {
    profile: undefined,
    container: 'egov-e2e-postgres',
    output: undefined,
    allowDirty: false,
    allowNonReleaseRef: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile') args.profile = argv[++index];
    else if (arg === '--container') args.container = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if (!args.profile) fail('--profile core|collaboration|demo가 필요하다.');
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

function sanitizePgDump(buffer, title) {
  const body = buffer
    .toString('utf8')
    .split(/\r?\n/)
    .filter((line) => !/^\\(?:restrict|unrestrict)\b/.test(line))
    .join('\n')
    .trimEnd();
  return `-- ${title}\n-- config/reusable-base-profiles.json에서 생성됨. 수동 편집 금지.\n\n${body}\n`;
}

function safeOutputPath(requested, profile, shortSha) {
  const defaultName = `${profile}-${shortSha}-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`;
  const output = resolve(requested ?? join(OUTPUT_ROOT, defaultName));
  const rel = relative(resolve(OUTPUT_ROOT), output);
  if (rel === '' || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) {
    fail(`산출물 경로는 ${OUTPUT_ROOT} 아래여야 한다: ${output}`);
  }
  if (existsSync(output)) fail(`기존 산출물을 덮어쓰지 않는다: ${output}`);
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

function restore(container, user, database, sql) {
  dockerExec(
    container,
    ['psql', '--username', user, '--dbname', database, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1'],
    { input: Buffer.isBuffer(sql) ? sql : Buffer.from(sql, 'utf8'), quiet: true },
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const profile = manifest.profiles?.[args.profile];
  if (!profile) fail(`지원하지 않는 profile: ${args.profile}`);
  assertContainerName(args.container);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 산출물은 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 산출물은 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  const shortSha = sourceCommit.slice(0, 12);
  const output = safeOutputPath(args.output, args.profile, shortSha);

  const containerInfo = inspectContainer(args.container);
  const user = containerInfo.user;
  const suffix = `${args.profile}_${process.pid}_${Date.now().toString(36)}`.toLowerCase();
  const workingDb = assertIdentifier(`${TEMP_DB_PREFIX}${suffix}`, 'working DB');
  const verifyDb = assertIdentifier(`${workingDb}_verify`, 'verify DB');

  const desiredTables = profile.packs.flatMap((packName) => manifest.packs[packName].database.tables).sort();
  const explicitDesiredSequences = profile.packs.flatMap((packName) => manifest.packs[packName].database.sequences).sort();
  const sourceExpectedTables = Object.values(manifest.packs).flatMap((pack) => pack.database.tables).sort();
  const sourceExplicitSequences = Object.values(manifest.packs).flatMap((pack) => pack.database.sequences).sort();

  let workingCreated = false;
  let verifyCreated = false;
  try {
    console.log(`[base-db] ${args.profile}: 현재 versioned migration을 빈 임시 DB에 적용한다.`);
    createDatabase(args.container, user, workingDb);
    workingCreated = true;
    const migrations = versionedMigrations();
    for (const migration of migrations) restore(args.container, user, workingDb, migration.sql);

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
    copyFileSync(
      join(ROOT, 'api-server', 'src', 'main', 'resources', 'db', 'migration', 'R__seed_framework.sql'),
      join(output, 'db', 'migration', 'R__seed_framework.sql'),
    );

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
    };
    writeFileSync(join(output, 'profile-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');

    console.log(`[base-db] ${args.profile}: 생성 SQL을 두 번째 빈 임시 DB에서 재적용한다.`);
    createDatabase(args.container, user, verifyDb);
    verifyCreated = true;
    restore(args.container, user, verifyDb, baseline);
    restore(args.container, user, verifyDb, metaSeed);
    restore(
      args.container,
      user,
      verifyDb,
      readFileSync(join(output, 'db', 'migration', 'R__seed_framework.sql')),
    );
    assertSameSet(listObjects(args.container, user, verifyDb, 'table'), desiredTables, '재적용 DB table');
    assertSameSet(listObjects(args.container, user, verifyDb, 'sequence'), desiredSequences, '재적용 DB sequence');
    const metaMismatches = [];
    for (const [table, expected] of Object.entries(manifest.databaseSnapshot.metaRows)) {
      const actual = Number(psql(args.container, user, verifyDb, `SELECT count(*) FROM public.${quoteSqlIdentifier(table)}`));
      if (actual !== expected) metaMismatches.push(`${table}=${actual}(snapshot ${expected})`);
    }
    if (metaMismatches.length) fail(`재적용 DB meta row 수 불일치: ${metaMismatches.join(', ')}`);

    writeFileSync(
      join(output, 'README.md'),
      `# Reusable Base DB — ${args.profile}\n\n` +
        `- source: \`${releaseTag ?? shortSha}\` (\`${sourceCommit}\`)\n` +
        `- packs: ${profile.packs.join(', ')}\n` +
        `- tables: ${desiredTables.length}\n` +
        `- sequences: ${desiredSequences.length}\n` +
        `- 검증: 별도 빈 PostgreSQL DB에 baseline → meta seed → framework seed 재적용 완료\n\n` +
        `운영 DB 축소용 마이그레이션이 아니다. 신규 프로젝트의 빈 DB에서만 사용한다.\n`,
      'utf8',
    );
    console.log(`[base-db] PASS: ${relative(ROOT, output).split(sep).join('/')}`);
  } finally {
    if (verifyCreated) dropTemporaryDatabase(args.container, user, verifyDb);
    if (workingCreated) dropTemporaryDatabase(args.container, user, workingDb);
  }
}

try {
  main();
} catch (error) {
  console.error(`[base-db] FAIL: ${error.message}`);
  process.exitCode = 1;
}
