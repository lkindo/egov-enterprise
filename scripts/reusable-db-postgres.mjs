/**
 * DB 번들 생성의 바탕 — 명령 실행, 소유한 PostgreSQL 컨테이너 조작, pg_dump 정리.
 * 임시 DB 이름은 test_reusable_base_ 로 시작하는 것만 지운다.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMP_DB_PREFIX = 'test_reusable_base_';
const MAX_BUFFER = 128 * 1024 * 1024;

function fail(message) {
  throw new Error(message);
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

export function git(args) {
  return run('git', args, { capture: true }).toString('utf8').trim();
}

export function assertIdentifier(value, label) {
  if (!value || !/^[a-zA-Z0-9_]+$/.test(value)) fail(`${label} 식별자가 안전하지 않다: ${value}`);
  return value;
}

export function assertContainerName(value) {
  if (!value || !/^[a-zA-Z0-9_.-]+$/.test(value)) fail(`container 이름이 안전하지 않다: ${value}`);
  return value;
}

function docker(args, options = {}) {
  return run('docker', args, options);
}

function dockerExec(container, args, options = {}) {
  return docker(['exec', '-i', container, ...args], options);
}

export function psql(container, user, database, sql) {
  return dockerExec(
    container,
    ['psql', '--username', user, '--dbname', database, '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', sql],
    { capture: true },
  ).toString('utf8').trim();
}

export function listObjects(container, user, database, kind) {
  const query = kind === 'table'
    ? "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    : "SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename";
  const output = psql(container, user, database, query);
  return output ? output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : [];
}

export function listSequenceDetails(container, user, database) {
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

export function quoteSqlIdentifier(value) {
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

export function inspectContainer(container) {
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

export function createDatabase(container, user, database) {
  dockerExec(container, ['createdb', '--username', user, database]);
}

export function dropTemporaryDatabase(container, user, database) {
  if (!database.startsWith(TEMP_DB_PREFIX) || !/^[a-z0-9_]+$/.test(database)) {
    fail(`임시 DB 삭제 안전조건 위반: ${database}`);
  }
  dockerExec(container, ['dropdb', '--username', user, '--if-exists', database], { quiet: true });
}

export function dump(container, user, database, args) {
  return dockerExec(
    container,
    ['pg_dump', '--username', user, '--dbname', database, '--no-owner', '--no-privileges', ...args],
    { capture: true },
  );
}

export function restore(container, user, database, sql) {
  dockerExec(
    container,
    ['psql', '--username', user, '--dbname', database, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1'],
    { input: Buffer.isBuffer(sql) ? sql : Buffer.from(sql, 'utf8'), quiet: true },
  );
}

