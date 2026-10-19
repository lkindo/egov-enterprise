#!/usr/bin/env node
/**
 * 복원 훈련 도구 — 백업·복원 런북 §2 형식의 백업 세트를 일회용 PostgreSQL 에 복원하고 §5.1 의 확인 항목을 실행한다.
 *
 * 사용법:
 *   node scripts/restore-drill.mjs --backup-dir <backup-YYYYMMDDThhmmssZ> [--migrations <폴더>] [--output <result.json>]
 *                                  [--storage-prefix uploads] [--verbose]
 *   node scripts/restore-drill.mjs --synthetic-backup <새 디렉터리> [--migrations <폴더>] [--verbose]
 *     현재 스키마로 합성 백업 세트를 만든다(manifest 에 fixture=synthetic). 도구 자체 점검용이며 운영 증거가 아니다.
 *
 * 경계:
 * - 운영 DB·볼륨·.env 를 읽지 않는다. 자식 프로세스에는 closedEnvironment 의 값만 넘기고, 일회용 DB 의 비밀번호는
 *   실행마다 새로 만들어 환경 변수로만 docker 에 전달한다. 호스트 포트를 열지 않고 내부 전용 네트워크를 쓴다.
 * - 만든 컨테이너·볼륨·네트워크는 실행 id 라벨로만 찾고 지운다(`cleanup` 확인이 남은 자원 0 을 본다).
 * - 앱 이미지를 띄우지 않는다. PII 복호화·로그인·화면의 첨부 정합 점검(런북 §3 의 확인 4가지)은 전체 훈련(§5.2)의 몫이다.
 * - 결과 JSON 에는 건수·해시·시간·확인 결과만 담는다. 덤프 값·키·도구의 원문 출력은 담지 않는다(--verbose 는 콘솔에만 쓴다).
 * - 통과는 기관 `backup-recovery` 통제의 승인이 아니다(DEC-OPS-107). 운영 규모·RTO/RPO 는 기관 훈련 기록이 증명한다.
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closedEnvironment } from './run-isolated-e2e.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RUNBOOK = 'docs/04-operations/backup-and-restore-runbook.md';
export const DEFAULT_MIGRATIONS = 'api-server/src/main/resources/db/migration';
export const AUTHORIZATION_CONTRACT = 'api-server/src/main/resources/db/cutover/authorization-contract.sql';
const COMPOSE_BASE = 'docker-compose.yml';
const COMPOSE_PROD = 'docker-compose.prod.yml';
/** 앱과 같은 Flyway(Spring Boot 4.1.1 BOM 의 12.4.0). 다른 판의 validate 가 다른 판정을 내리지 않게 digest 로 고정한다. */
export const FLYWAY_IMAGE = 'flyway/flyway:12.4.0@sha256:5be18367a9b3979a9f37234c371b80da457a448fb9577bd94d4bf24d923fafac';
const OWNER_LABEL = 'egov.restore-drill.run';
const DB_USER = 'drill';
const DB_NAME = 'drill';
const HEAVY_TIMEOUT = 6 * 60 * 60 * 1000;
const COMMAND_TIMEOUT = 10 * 60 * 1000;
const SAMPLE_LIMIT = 20;

/** 런북 §2 가 만드는 백업 세트(sha256.txt 가 이 다섯 파일을 정확히 담는다). */
export const BACKUP_SET_FILES = Object.freeze(['db.dump', 'files.tar.gz', 'schema-version.txt', 'manifest.txt', 'table-counts.tsv']);
export const CHECKSUM_FILE = 'sha256.txt';
export const MANIFEST_KEYS = Object.freeze(['stamp', 'algorithm_key_id', 'api_image_ref', 'frontend_image_ref',
  'release_revision', 'compose_base_sha256', 'compose_prod_sha256']);
/** 런북 §3 의 복원 명령과 같은 선택지. */
export const RESTORE_FLAGS = Object.freeze(['--exit-on-error', '--no-owner', '--no-acl']);
/** V2_132 가 감사 원장 행에 거는 수정·삭제 금지 함수. 대상 표는 마이그레이션에서 읽는다(parseLedgerTriggers). */
export const LEDGER_FUNCTION = 'fn_adt_log_chg_prhb';
/** BEFORE(2) | ROW(1) | DELETE(8) | UPDATE(16) — pg_trigger.tgtype. */
const LEDGER_TRIGGER_TYPE = 27;
/** 시드가 채우는 표. 비어 있으면 운영 DB 가 아닌 것을 백업했거나 복원이 비었다. */
export const CORE_TABLES = Object.freeze(['flyway_schema_history', 'tb_user_info', 'tb_authrt_info', 'tb_authrt_user_map',
  'tb_authrt_grnt_map', 'tb_menu_info', 'tb_com_cd']);
/** 런북 §2 가 같은 글자로 쓴다(restore-drill.test.mjs 가 대조한다). 버전 없는 반복 마이그레이션(R__) 행은 건너뛴다. */
export const SCHEMA_VERSION_SQL = 'SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1';
/** 런북 §2·§3 의 TABLE_COUNTS_SQL heredoc 과 같은 질의. public 의 모든 기본 표를 `이름<TAB>행 수` 로 낸다. */
export const TABLE_COUNT_SQL = `SELECT table_name || E'\\t' || (xpath('/row/c/text()', query_to_xml(
         format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
 ORDER BY table_name;`;
const ATTACHMENT_META_SQL = `SELECT coalesce(json_agg(json_build_array(file_strg_path, strg_file_nm, file_sz)
  ORDER BY atch_file_sn, atch_file_seq), '[]'::json) FROM tb_file_detail;`;
const LEDGER_CATALOG_SQL = `SELECT c.relname || E'\\t' || t.tgname || E'\\t' || t.tgenabled::text || E'\\t' || t.tgtype::text
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE NOT t.tgisinternal AND n.nspname = 'public' AND p.proname = '${LEDGER_FUNCTION}'
 ORDER BY 1;`;

const IMAGE_REF = /^[^\s@]+@sha256:[0-9a-f]{64}$/u;
const REVISION = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const HASH = /^[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/u;

class DrillError extends Error {}
const fail = message => new DrillError(message);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const sameList = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

/** 실행 순서와 확인 id. 런북 §5.1 의 확인 항목 표와 정확히 같아야 한다(restore-drill.test.mjs). */
const STEPS = Object.freeze([
  { id: 'backup-set', run: checkBackupSet },
  { id: 'db-restore', run: restoreDatabase, needs: 'backup-set' },
  { id: 'flyway-validate', run: validateFlyway, needs: 'db-restore' },
  { id: 'schema-version', run: checkSchemaVersion, needs: 'db-restore' },
  { id: 'table-counts', run: checkTableCounts, needs: 'db-restore' },
  { id: 'core-tables', run: checkCoreTables, needs: 'table-counts' },
  { id: 'audit-ledger', run: checkAuditLedger, needs: 'db-restore' },
  { id: 'attachments', run: checkAttachments, needs: 'db-restore' },
]);
export const DRILL_CHECKS = Object.freeze([...STEPS.map(step => step.id), 'cleanup']);

/** docker-compose.yml 의 db 서비스 이미지 — 운영과 같은 PostgreSQL 판·digest 로 복원한다. */
export function postgresImage(composeText) {
  const match = /^ {2}db:\r?\n(?:(?: {4}.*)?\r?\n)*? {4}image:\s*(\S+)\s*$/mu.exec(composeText);
  const image = match?.[1];
  if (!image || !/^postgres:\S+@sha256:[0-9a-f]{64}$/u.test(image)) throw fail('docker-compose.yml 의 db 이미지를 digest 로 읽지 못했다');
  return image;
}

export function parseManifest(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/u)) {
    if (line === '') continue;
    const separator = line.indexOf('=');
    if (separator <= 0) throw fail('manifest.txt 에 key=value 가 아닌 줄이 있다');
    const key = line.slice(0, separator);
    if (values.has(key)) throw fail(`manifest.txt 의 ${key} 가 두 번 나온다`);
    values.set(key, line.slice(separator + 1));
  }
  for (const key of MANIFEST_KEYS) if (!values.has(key)) throw fail(`manifest.txt 에 ${key} 가 없다`);
  if (!/^\d{8}T\d{6}Z$/u.test(values.get('stamp'))) throw fail('manifest.txt 의 stamp 형식이 YYYYMMDDThhmmssZ 가 아니다');
  if (values.get('algorithm_key_id').trim() === '') throw fail('manifest.txt 의 algorithm_key_id 가 비어 있다');
  for (const key of ['api_image_ref', 'frontend_image_ref']) {
    if (!IMAGE_REF.test(values.get(key))) throw fail(`manifest.txt 의 ${key} 가 digest 고정 reference 가 아니다`);
  }
  if (!REVISION.test(values.get('release_revision'))) throw fail('manifest.txt 의 release_revision 이 커밋 해시가 아니다');
  for (const key of ['compose_base_sha256', 'compose_prod_sha256']) {
    if (!HASH.test(values.get(key))) throw fail(`manifest.txt 의 ${key} 가 SHA-256 이 아니다`);
  }
  return Object.fromEntries(values);
}

/** sha256sum 출력(`<해시>  <파일>`). 백업 세트의 다섯 파일을 정확히 한 번씩 담아야 한다. */
export function parseChecksums(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/u)) {
    if (line === '') continue;
    const match = /^([0-9a-f]{64}) [ *](.+)$/u.exec(line);
    if (!match) throw fail('sha256.txt 형식이 sha256sum 출력과 다르다');
    if (entries.has(match[2])) throw fail(`sha256.txt 에 ${match[2]} 가 두 번 나온다`);
    entries.set(match[2], match[1]);
  }
  const listed = [...entries.keys()].sort();
  const expected = [...BACKUP_SET_FILES].sort();
  if (!sameList(listed, expected)) {
    throw fail(`sha256.txt 의 파일 목록(${listed.join(', ')})이 백업 세트(${expected.join(', ')})와 다르다`
      + ' — table-counts.tsv 가 없는 이전 절차의 백업은 행 수 기준이 없어 완전성을 판정할 수 없다');
  }
  return entries;
}

export function parseTableCounts(text) {
  const counts = new Map();
  for (const line of text.split(/\r?\n/u)) {
    if (line === '') continue;
    const match = /^([a-z_][a-z0-9_]*)\t(\d+)$/u.exec(line);
    if (!match) throw fail('행 수 목록에 `표<TAB>행 수` 가 아닌 줄이 있다');
    if (counts.has(match[1])) throw fail(`행 수 목록에 ${match[1]} 이 두 번 나온다`);
    counts.set(match[1], Number(match[2]));
  }
  if (counts.size === 0) throw fail('행 수 목록이 비어 있다');
  return counts;
}

export function compareTableCounts(expected, actual) {
  const missing = [...expected.keys()].filter(table => !actual.has(table));
  const extra = [...actual.keys()].filter(table => !expected.has(table));
  const different = [...expected].filter(([table, rows]) => actual.has(table) && actual.get(table) !== rows)
    .map(([table, rows]) => ({ table, expected: rows, actual: actual.get(table) }));
  const rows = [...actual.values()].reduce((sum, value) => sum + value, 0);
  return { tables: actual.size, rows, missing, extra, different,
    passed: missing.length === 0 && extra.length === 0 && different.length === 0 };
}

/** Flyway 적용 순서: 버전 마이그레이션(숫자 순) 다음 반복 마이그레이션(이름 순). */
export function flywayOrder(names) {
  const versioned = [];
  const repeatable = [];
  for (const name of names) {
    const match = /^V(\d+(?:[._]\d+)*)__.+\.sql$/u.exec(name);
    if (match) versioned.push({ name, version: match[1].split(/[._]/u).map(Number) });
    else if (/^R__.+\.sql$/u.test(name)) repeatable.push(name);
  }
  versioned.sort((left, right) => {
    for (let index = 0; index < Math.max(left.version.length, right.version.length); index++) {
      const difference = (left.version[index] ?? 0) - (right.version[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  });
  return [...versioned.map(entry => entry.name), ...repeatable.sort()];
}

const stripSqlComments = text => text.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/--[^\n]*/gu, ' ');

/**
 * 감사 원장 트리거의 기대 집합 — 마이그레이션(원본의 V2 사슬이든 재사용 생성물의 pg_dump baseline 이든)이
 * fn_adt_log_chg_prhb 로 만든 트리거에서 뒤에 지운 것을 뺀다.
 */
export function parseLedgerTriggers(files) {
  const create = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-z_][a-z0-9_]*)\s+BEFORE\s+[A-Z\s]+?\s+ON\s+(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:public\.)?fn_adt_log_chg_prhb\s*\(\s*\)/giu;
  const drop = /DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/giu;
  const triggers = new Map();
  for (const { text } of files) {
    const sql = stripSqlComments(text);
    const events = [...sql.matchAll(create)].map(match => ({ index: match.index, kind: 'create', trigger: match[1], table: match[2] }))
      .concat([...sql.matchAll(drop)].map(match => ({ index: match.index, kind: 'drop', trigger: match[1], table: match[2] })))
      .sort((left, right) => left.index - right.index);
    for (const event of events) {
      const key = `${event.table}\t${event.trigger}`;
      if (event.kind === 'create') triggers.set(key, { table: event.table, trigger: event.trigger });
      else triggers.delete(key);
    }
  }
  return [...triggers.values()].sort((left, right) => left.table.localeCompare(right.table));
}

export function readMigrations(directory) {
  if (!lstatSync(directory, { throwIfNoEntry: false })?.isDirectory()) throw fail(`마이그레이션 폴더가 없다: ${directory}`);
  const names = flywayOrder(readdirSync(directory));
  if (names.length === 0) throw fail(`마이그레이션 폴더에 SQL 이 없다: ${directory}`);
  return names.map(name => ({ name, text: readFileSync(path.join(directory, name), 'utf8') }));
}

/** 감사 원장 판정: 기대 트리거마다 활성(O)·BEFORE UPDATE OR DELETE ROW 이고, 행이 있으면 수정·삭제가 거부돼야 한다. */
export function judgeAuditLedger(expected, catalogRows, probeRows) {
  const catalog = new Map(catalogRows.map(row => [`${row.table}\t${row.trigger}`, row]));
  const problems = [];
  for (const { table, trigger } of expected) {
    const row = catalog.get(`${table}\t${trigger}`);
    if (!row) problems.push(`${table}.${trigger}: 복원본에 없음`);
    else if (row.enabled !== 'O') problems.push(`${table}.${trigger}: 활성 상태가 ${row.enabled}`);
    else if (row.type !== LEDGER_TRIGGER_TYPE) problems.push(`${table}.${trigger}: 종류(tgtype ${row.type})가 BEFORE UPDATE OR DELETE ROW 가 아님`);
  }
  for (const probe of probeRows) {
    if (probe.result === 'accepted') problems.push(`${probe.table}: ${probe.operation} 이 거부되지 않음`);
    else if (!['rejected', 'empty'].includes(probe.result)) problems.push(`${probe.table}: ${probe.operation} 시험 결과를 읽지 못함`);
  }
  if (expected.length === 0) problems.push('마이그레이션에서 감사 원장 트리거를 찾지 못함');
  return { expected: expected.length, problems, passed: problems.length === 0 };
}

/**
 * 첨부 메타와 실물 대조 — 앱의 첨부 정합성 점검(AttachmentIntegrityService)과 같은 경로 규약이다:
 * 실물은 `<저장소 접두>/<file_strg_path>/<strg_file_nm>`, 고아 후보는 `<접두>/general/` 아래만 센다.
 * 메타가 가리키는 실물이 없거나 크기(file_sz)가 다르면 실패다. 고아 후보는 실패가 아니라 보고다(커밋 전 업로드와 구별할 수 없다).
 */
export function compareAttachments(metaRows, fileSizes, prefix = 'uploads') {
  const referenced = new Set();
  const missing = [];
  const sizeMismatch = [];
  for (const [storagePath, storedName, size] of metaRows) {
    if (typeof storedName !== 'string' || storedName.trim() === '') { missing.push('(저장 파일명 없음)'); continue; }
    const relative = path.posix.normalize(path.posix.join(prefix, storagePath ?? '', storedName));
    if (!relative.startsWith(`${prefix}/`)) { missing.push(`(저장소 밖 경로) ${storagePath}/${storedName}`); continue; }
    referenced.add(relative);
    if (!fileSizes.has(relative)) missing.push(relative);
    else if (size !== null && size !== undefined && Number(size) !== fileSizes.get(relative)) sizeMismatch.push(relative);
  }
  const generalRoot = `${prefix}/general/`;
  const orphanCandidates = [...fileSizes.keys()].filter(file => file.startsWith(generalRoot) && !referenced.has(file)).sort();
  return {
    metadataRows: metaRows.length, archiveFiles: fileSizes.size,
    missing: missing.length, sizeMismatch: sizeMismatch.length, orphanCandidates: orphanCandidates.length,
    samples: { missing: missing.slice(0, SAMPLE_LIMIT), sizeMismatch: sizeMismatch.slice(0, SAMPLE_LIMIT),
      orphanCandidates: orphanCandidates.slice(0, SAMPLE_LIMIT) },
    passed: missing.length === 0 && sizeMismatch.length === 0,
  };
}

/** `find -printf '%s\t%P\0'` 출력. */
export function parseFileListing(output) {
  const files = new Map();
  for (const entry of output.split('\u0000')) {
    if (entry === '') continue;
    const separator = entry.indexOf('\t');
    if (separator <= 0 || !/^\d+$/u.test(entry.slice(0, separator))) throw fail('첨부 목록을 읽지 못했다');
    files.set(entry.slice(separator + 1), Number(entry.slice(0, separator)));
  }
  return files;
}

/** 런북 §5.1 의 확인 항목 표 첫 열(`id`). */
export function runbookDrillChecks(text) {
  const lines = text.split(/\r?\n/u);
  const start = lines.indexOf('#### 훈련 도구의 확인 항목');
  if (start < 0) return [];
  const ids = [];
  let table = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('|')) {
      table = true;
      const match = /^\|\s*`([a-z-]+)`\s*\|/u.exec(line);
      if (match) ids.push(match[1]);
    } else if (table || line.startsWith('#')) {
      break;
    }
  }
  return ids;
}

function command(executable, args, { env = {}, input, timeout = COMMAND_TIMEOUT, verbose = false, allowFailure = false,
  maxBuffer = 512 * 1024 * 1024 } = {}) {
  const result = spawnSync(executable, args, { cwd: ROOT, env: { ...closedEnvironment(), ...env }, input,
    encoding: 'utf8', windowsHide: true, timeout, maxBuffer });
  const ok = !result.error && result.status === 0;
  if (!ok && verbose) {
    process.stderr.write(`[restore-drill] ${executable} ${args.slice(0, 2).join(' ')} 실패\n${result.stderr ?? ''}${result.error?.message ?? ''}\n`);
  }
  if (!ok && !allowFailure) {
    throw fail(`${executable} ${args.slice(0, 2).join(' ')} 실패 — 원문 출력은 결과에 남기지 않는다(--verbose 로 콘솔에서 본다)`);
  }
  return { ok, stdout: result.stdout ?? '' };
}

export function createRuntime({ runId = randomBytes(12).toString('hex'), postgres, verbose = false } = {}) {
  const name = `egov-restore-drill-${runId}`;
  const label = `${OWNER_LABEL}=${runId}`;
  const password = randomBytes(24).toString('hex');
  const database = `${name}-db`;
  const docker = (args, options = {}) => command('docker', args, { verbose, ...options });
  // 목록 조회가 실패하면 남은 자원을 0 으로 단정하지 않는다 — null 을 돌려 cleanup 이 실패로 센다.
  const owned = args => {
    const listed = docker([...args, '--filter', `label=${label}`], { allowFailure: true });
    return listed.ok ? listed.stdout.split(/\s+/u).filter(Boolean) : null;
  };
  let flywayRuns = 0;
  return {
    runId,
    async start() {
      docker(['network', 'create', '--internal', '--label', label, name]);
      docker(['volume', 'create', '--label', label, name]);
      docker(['run', '-d', '--name', database, '--label', label, '--network', name,
        '--mount', `type=volume,src=${name},dst=/var/lib/postgresql/data`,
        '-e', `POSTGRES_USER=${DB_USER}`, '-e', `POSTGRES_DB=${DB_NAME}`, '-e', 'POSTGRES_PASSWORD', postgres],
      { env: { POSTGRES_PASSWORD: password } });
      // 초기화 중의 임시 서버는 TCP 를 열지 않는다 — TCP 로 응답해야 최종 서버다.
      const deadline = Date.now() + 180_000;
      while (!docker(['exec', database, 'pg_isready', '-q', '-h', '127.0.0.1', '-U', DB_USER, '-d', DB_NAME],
        { allowFailure: true, verbose: false }).ok) {
        if (Date.now() > deadline) throw fail('일회용 PostgreSQL 이 180초 안에 준비되지 않았다');
        await pause(1000);
      }
    },
    psql(sql) {
      return docker(['exec', '-i', database, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-U', DB_USER, '-d', DB_NAME, '-f', '-'],
        { input: sql, timeout: HEAVY_TIMEOUT }).stdout;
    },
    exec(args, options = {}) {
      return docker(['exec', database, ...args], { timeout: HEAVY_TIMEOUT, ...options }).stdout;
    },
    copyIn(source, target) { docker(['cp', source, `${database}:${target}`], { timeout: HEAVY_TIMEOUT }); },
    copyOut(source, target) { docker(['cp', `${database}:${source}`, target], { timeout: HEAVY_TIMEOUT }); },
    flyway(migrations, flywayArgs) {
      const container = `${name}-flyway-${++flywayRuns}`;
      docker(['create', '--name', container, '--label', label, '--network', name,
        '-e', `FLYWAY_URL=jdbc:postgresql://${database}:5432/${DB_NAME}`, '-e', `FLYWAY_USER=${DB_USER}`, '-e', 'FLYWAY_PASSWORD',
        '-e', 'FLYWAY_LOCATIONS=filesystem:/flyway/sql', '-e', 'REDGATE_DISABLE_TELEMETRY=true',
        FLYWAY_IMAGE, ...flywayArgs], { env: { FLYWAY_PASSWORD: password } });
      try {
        docker(['cp', `${path.resolve(migrations)}${path.sep}.`, `${container}:/flyway/sql`]);
        docker(['start', '-a', container], { timeout: HEAVY_TIMEOUT });
      } finally {
        docker(['rm', '-f', container], { allowFailure: true });
      }
    },
    /** 이 실행의 라벨이 붙은 컨테이너·볼륨·네트워크를 지우고 남은 수를 센다. 목록을 읽지 못하면 listingFailed 다. */
    cleanup() {
      const kinds = [[['ps', '-aq'], id => ['rm', '-f', '-v', id]], [['volume', 'ls', '-q'], id => ['volume', 'rm', '-f', id]],
        [['network', 'ls', '-q'], id => ['network', 'rm', id]]];
      for (const [list, remove] of kinds) for (const id of owned(list) ?? []) docker(remove(id), { allowFailure: true });
      const remaining = kinds.map(([list]) => owned(list));
      return { residualResources: remaining.reduce((sum, ids) => sum + (ids?.length ?? 0), 0),
        listingFailed: remaining.some(ids => ids === null) };
    },
  };
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file).on('error', reject).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')));
  });
}

async function checkBackupSet(context) {
  const directory = context.backupDir;
  const info = lstatSync(directory, { throwIfNoEntry: false });
  if (!info?.isDirectory() || info.isSymbolicLink()) throw fail('--backup-dir 가 디렉터리가 아니다');
  const checksumPath = path.join(directory, CHECKSUM_FILE);
  if (!lstatSync(checksumPath, { throwIfNoEntry: false })?.isFile()) throw fail('sha256.txt 가 없다');
  const checksums = parseChecksums(readFileSync(checksumPath, 'utf8'));
  const bytes = {};
  for (const file of BACKUP_SET_FILES) {
    const target = path.join(directory, file);
    const stat = lstatSync(target, { throwIfNoEntry: false });
    if (!stat?.isFile() || stat.isSymbolicLink()) throw fail(`${file} 이 일반 파일이 아니다`);
    if (stat.size === 0) throw fail(`${file} 이 비어 있다`);
    if (await sha256File(target) !== checksums.get(file)) throw fail(`${file} 의 SHA-256 이 sha256.txt 와 다르다`);
    bytes[file] = stat.size;
  }
  const manifest = parseManifest(readFileSync(path.join(directory, 'manifest.txt'), 'utf8'));
  const schemaVersion = readFileSync(path.join(directory, 'schema-version.txt'), 'utf8').trim();
  if (!/^\d+(?:\.\d+)*$/u.test(schemaVersion)) throw fail('schema-version.txt 가 Flyway 버전이 아니다');
  context.backup = { manifest, schemaVersion, counts: parseTableCounts(readFileSync(path.join(directory, 'table-counts.tsv'), 'utf8')) };
  context.summary.backup = {
    stamp: manifest.stamp, releaseRevision: manifest.release_revision, algorithmKeyId: manifest.algorithm_key_id,
    apiImageRef: manifest.api_image_ref, frontendImageRef: manifest.frontend_image_ref, schemaVersion,
    synthetic: manifest.fixture === 'synthetic',
    sha256: { 'db.dump': checksums.get('db.dump'), 'files.tar.gz': checksums.get('files.tar.gz') }, bytes,
  };
  return { files: BACKUP_SET_FILES.length + 1 };
}

async function restoreDatabase(context) {
  await context.runtime.start();
  context.runtime.copyIn(path.join(context.backupDir, 'db.dump'), '/tmp/db.dump');
  context.runtime.exec(['sh', '-c', 'pg_restore --list /tmp/db.dump > /dev/null']);
  const started = Date.now();
  context.runtime.exec(['pg_restore', ...RESTORE_FLAGS, '-U', DB_USER, '-d', DB_NAME, '/tmp/db.dump']);
  context.summary.durations.pgRestoreMillis = Date.now() - started;
  context.runtime.exec(['rm', '-f', '/tmp/db.dump']);
  return { postgresImage: context.postgres, flags: RESTORE_FLAGS };
}

async function validateFlyway(context) {
  const migrations = readMigrations(context.migrations);
  try {
    context.runtime.flyway(context.migrations, ['validate']);
  } catch (error) {
    if (!(error instanceof DrillError)) throw error;
    throw fail('Flyway validate 가 실패했다 — 체크섬 불일치·적용 안 된 마이그레이션·실패 이력 중 하나다. 백업의 release_revision '
      + '체크아웃의 마이그레이션 폴더를 --migrations 로 주었는지 보고, --verbose 로 Flyway 출력을 본다');
  }
  return { flywayImage: FLYWAY_IMAGE, migrationFiles: migrations.length };
}

async function checkSchemaVersion(context) {
  const restored = context.runtime.psql(`${SCHEMA_VERSION_SQL};`).trim();
  if (restored !== context.backup.schemaVersion) {
    throw fail(`복원본의 최신 버전 ${restored || '(없음)'} 이 schema-version.txt 의 ${context.backup.schemaVersion} 와 다르다`);
  }
  return { version: restored };
}

async function checkTableCounts(context) {
  context.restoredCounts = parseTableCounts(context.runtime.psql(TABLE_COUNT_SQL));
  const comparison = compareTableCounts(context.backup.counts, context.restoredCounts);
  if (!comparison.passed) {
    const detail = { ...comparison, different: comparison.different.slice(0, SAMPLE_LIMIT) };
    throw Object.assign(fail(`행 수가 백업 시점과 다르다: 없는 표 ${comparison.missing.length}, 늘어난 표 ${comparison.extra.length}, `
      + `수가 다른 표 ${comparison.different.length}`), { detail });
  }
  return { tables: comparison.tables, rows: comparison.rows };
}

async function checkCoreTables(context) {
  const empty = CORE_TABLES.filter(table => !(context.restoredCounts.get(table) > 0));
  if (empty.length > 0) throw fail(`핵심 표가 없거나 비어 있다: ${empty.join(', ')}`);
  return Object.fromEntries(CORE_TABLES.map(table => [table, context.restoredCounts.get(table)]));
}

function ledgerProbeSql(tables) {
  const probes = tables.flatMap(table => ['UPDATE', 'DELETE'].map(operation =>
    `SELECT '${table}' || E'\\t' || '${operation}' || E'\\t' || pg_temp.restore_drill_probe('${table}'::regclass, '${operation}');`));
  // 훈련 DB 안에서도 시험 행을 남기지 않는다 — 거부되지 않았어도 ROLLBACK 이 되돌린다.
  return `BEGIN;
CREATE FUNCTION pg_temp.restore_drill_probe(target regclass, operation text) RETURNS text LANGUAGE plpgsql AS $probe$
DECLARE first_column text; affected bigint;
BEGIN
  SELECT quote_ident(attname) INTO first_column FROM pg_attribute
   WHERE attrelid = target AND attnum > 0 AND NOT attisdropped ORDER BY attnum LIMIT 1;
  IF operation = 'UPDATE' THEN
    EXECUTE format('UPDATE %s SET %s = %s WHERE ctid = (SELECT ctid FROM %s LIMIT 1)', target, first_column, first_column, target);
  ELSE
    EXECUTE format('DELETE FROM %s WHERE ctid = (SELECT ctid FROM %s LIMIT 1)', target, target);
  END IF;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN CASE WHEN affected = 0 THEN 'empty' ELSE 'accepted' END;
EXCEPTION WHEN restrict_violation THEN
  RETURN 'rejected';
END $probe$;
${probes.join('\n')}
ROLLBACK;
`;
}

async function checkAuditLedger(context) {
  const expected = parseLedgerTriggers(readMigrations(context.migrations));
  for (const { table } of expected) if (!IDENTIFIER.test(table)) throw fail('감사 원장 표 이름을 읽지 못했다');
  const catalog = context.runtime.psql(LEDGER_CATALOG_SQL).split(/\r?\n/u).filter(Boolean).map(line => {
    const [table, trigger, enabled, type] = line.split('\t');
    return { table, trigger, enabled, type: Number(type) };
  });
  const tables = [...new Set(expected.map(entry => entry.table))].filter(table => context.restoredCounts?.has(table) ?? true);
  const probes = context.runtime.psql(ledgerProbeSql(tables)).split(/\r?\n/u).filter(Boolean).map(line => {
    const [table, operation, result] = line.split('\t');
    return { table, operation, result };
  });
  const judged = judgeAuditLedger(expected, catalog, probes);
  const detail = { triggers: expected.map(entry => `${entry.table}.${entry.trigger}`), probes, problems: judged.problems };
  if (!judged.passed) throw Object.assign(fail(`감사 원장 보호가 복원되지 않았다: ${judged.problems.join('; ')}`), { detail });
  return detail;
}

async function checkAttachments(context) {
  const started = Date.now();
  context.runtime.copyIn(path.join(context.backupDir, 'files.tar.gz'), '/tmp/files.tar.gz');
  context.runtime.exec(['sh', '-c', 'rm -rf /tmp/drill-files && mkdir /tmp/drill-files && tar -xzf /tmp/files.tar.gz -C /tmp/drill-files && rm -f /tmp/files.tar.gz']);
  const files = parseFileListing(context.runtime.exec(['find', '/tmp/drill-files', '-type', 'f', '-printf', '%s\\t%P\\0']));
  context.summary.durations.attachmentExtractMillis = Date.now() - started;
  const meta = JSON.parse(context.runtime.psql(ATTACHMENT_META_SQL).trim() || '[]');
  const comparison = compareAttachments(meta, files, context.storagePrefix);
  if (!comparison.passed) {
    throw Object.assign(fail(`첨부 실물 부재 ${comparison.missing}건, 크기 차이 ${comparison.sizeMismatch}건`), { detail: comparison });
  }
  return comparison;
}

export async function runDrill({ backupDir, migrations = path.join(ROOT, DEFAULT_MIGRATIONS), storagePrefix = 'uploads',
  verbose = false, runId = randomBytes(12).toString('hex') }) {
  const postgres = postgresImage(readFileSync(path.join(ROOT, COMPOSE_BASE), 'utf8'));
  const started = Date.now();
  const summary = { schemaVersion: 1, kind: 'egov-restore-drill', runId, startedAt: new Date(started).toISOString(),
    scope: '백업 세트를 일회용 PostgreSQL 에 복원한 DB·첨부 구성 요소 확인. 앱 기동·PII 복호화·로그인은 포함하지 않는다',
    institutionApproval: false, appSmokeVerified: false, status: null, backup: null, durations: {}, checks: [] };
  const context = { backupDir: path.resolve(backupDir), migrations: path.resolve(migrations), storagePrefix, postgres, summary,
    runtime: createRuntime({ runId, postgres, verbose }) };
  const status = new Map();
  try {
    for (const step of STEPS) {
      if (step.needs && status.get(step.needs) !== 'PASS') {
        status.set(step.id, 'SKIPPED');
        summary.checks.push({ id: step.id, status: 'SKIPPED', reason: `${step.needs} 가 통과하지 않음` });
        continue;
      }
      const stepStarted = Date.now();
      try {
        const detail = await step.run(context);
        status.set(step.id, 'PASS');
        summary.checks.push({ id: step.id, status: 'PASS', millis: Date.now() - stepStarted, detail });
      } catch (error) {
        if (!(error instanceof DrillError)) throw error;
        status.set(step.id, 'FAIL');
        summary.checks.push({ id: step.id, status: 'FAIL', millis: Date.now() - stepStarted, reason: error.message,
          ...(error.detail ? { detail: error.detail } : {}) });
      }
    }
  } finally {
    const cleanup = context.runtime.cleanup();
    summary.checks.push({ id: 'cleanup', status: cleanup.residualResources === 0 && !cleanup.listingFailed ? 'PASS' : 'FAIL',
      detail: cleanup });
  }
  summary.durations.totalMillis = Date.now() - started;
  summary.status = summary.checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL';
  const ids = summary.checks.map(check => check.id);
  if (!sameList(ids, DRILL_CHECKS)) throw new Error('restore drill: 확인 목록이 DRILL_CHECKS 와 다르다');
  return summary;
}

function stampOf(date) {
  return date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z');
}

/** 현재 스키마의 합성 백업 세트 — 런북 §2 와 같은 파일·형식. 인가 Contract 는 격리 리허설과 같은 순서로 적용한다. */
export async function buildSyntheticBackup({ target, migrations = path.join(ROOT, DEFAULT_MIGRATIONS), verbose = false }) {
  const output = path.resolve(target);
  if (existsSync(output)) throw fail('--synthetic-backup 대상이 이미 있다 — 덮어쓰지 않는다');
  const parent = path.dirname(output);
  if (!lstatSync(parent, { throwIfNoEntry: false })?.isDirectory()) throw fail('--synthetic-backup 의 상위 디렉터리가 없다');
  const postgres = postgresImage(readFileSync(path.join(ROOT, COMPOSE_BASE), 'utf8'));
  const runtime = createRuntime({ postgres, verbose });
  const staging = mkdtempSync(path.join(parent, `.${path.basename(output)}.tmp-`));
  try {
    await runtime.start();
    runtime.flyway(migrations, ['-target=2.99', 'migrate']);
    const legacy = runtime.psql(`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info');`).trim();
    if (legacy !== '0') {
      const versions = runtime.psql(`SELECT DISTINCT plcy_ver_no FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.99';`)
        .split(/\r?\n/u).filter(Boolean);
      if (versions.length !== 1 || !HASH.test(versions[0])) throw fail('V2_99 의 권한 카탈로그 버전을 읽지 못했다');
      // 합성 증거 값이다. 운영 전환 증거·백업 해시가 아니다(AuthorizationCutoverTestSupport 와 같은 리허설 값).
      runtime.psql(`SELECT set_config('app.authorization_cutover_evidence', repeat('a', 64), false),
        set_config('app.authorization_backup_sha256', repeat('b', 64), false),
        set_config('app.authorization_catalog_version', '${versions[0]}', false);
${readFileSync(path.join(ROOT, AUTHORIZATION_CONTRACT), 'utf8')}`);
    }
    runtime.flyway(migrations, ['migrate']);
    const masters = runtime.psql(`INSERT INTO tb_file_master (use_yn) VALUES ('Y'), ('Y') RETURNING atch_file_sn;`)
      .split(/\r?\n/u).filter(Boolean);
    if (masters.length !== 2 || masters.some(value => !/^\d+$/u.test(value))) throw fail('합성 첨부 마스터를 만들지 못했다');
    const attachments = masters.map((sn, index) => ({ sn, name: `${randomUUID()}.txt`, content: `synthetic restore drill attachment ${index + 1}` }));
    runtime.psql(`${attachments.map(({ sn, name, content }) => `INSERT INTO tb_file_detail
      (atch_file_sn, atch_file_seq, file_sz, strg_file_nm, orgnl_file_nm, file_strg_path)
      VALUES (${sn}, 1, ${Buffer.byteLength(content)}, '${name}', 'restore-drill.txt', 'general/${sn}');`).join('\n')}
INSERT INTO tb_sys_adt_log (dmnd_idntfr, prcs_stts_nm, job_nm, adt_cn, adt_dt, frst_rgtr_id, crt_dt)
  VALUES ('restore-drill-fixture', 'ATTEMPTED', 'RESTORE_DRILL', 'synthetic restore drill row', now(), 'SYSTEM', now());
INSERT INTO tb_privacy_log (dmnd_id, inq_dt, srvc_nm, frst_rgtr_id, crt_dt)
  VALUES ('restore-drill', now(), 'restore-drill-fixture', 'SYSTEM', now());`);
    // 커밋 전 업로드처럼 메타 없는 실물 하나 — 고아 후보 보고 경로를 시험한다(실패가 아니다).
    const orphanDirectory = String(Math.max(...masters.map(Number)) + 1000);
    const files = [...attachments.map(({ sn, name, content }) => ({ directory: sn, name, content })),
      { directory: orphanDirectory, name: 'orphan-candidate.txt', content: 'synthetic orphan candidate' }];
    runtime.exec(['sh', '-c', ['rm -rf /tmp/fixture', ...files.map(({ directory, name, content }) =>
      `mkdir -p /tmp/fixture/uploads/general/${directory} && printf '%s' '${content}' > /tmp/fixture/uploads/general/${directory}/${name}`),
    'tar -czf /tmp/files.tar.gz -C /tmp/fixture .'].join(' && ')]);
    runtime.exec(['pg_dump', '-U', DB_USER, '-d', DB_NAME, '-Fc', '-f', '/tmp/db.dump']);
    runtime.copyOut('/tmp/db.dump', path.join(staging, 'db.dump'));
    runtime.copyOut('/tmp/files.tar.gz', path.join(staging, 'files.tar.gz'));
    writeFileSync(path.join(staging, 'schema-version.txt'), runtime.psql(`${SCHEMA_VERSION_SQL};`));
    writeFileSync(path.join(staging, 'table-counts.tsv'), runtime.psql(TABLE_COUNT_SQL));
    const revision = command('git', ['rev-parse', 'HEAD']).stdout.trim();
    const composeHash = file => createHash('sha256').update(readFileSync(path.join(ROOT, file))).digest('hex');
    writeFileSync(path.join(staging, 'manifest.txt'), [
      `stamp=${stampOf(new Date())}`, 'algorithm_key_id=synthetic-not-a-key',
      `api_image_ref=registry.invalid/egov/api@sha256:${'0'.repeat(64)}`,
      `frontend_image_ref=registry.invalid/egov/frontend@sha256:${'0'.repeat(64)}`,
      `release_revision=${revision}`, `compose_base_sha256=${composeHash(COMPOSE_BASE)}`,
      `compose_prod_sha256=${composeHash(COMPOSE_PROD)}`, 'fixture=synthetic', ''].join('\n'));
    const lines = [];
    for (const file of BACKUP_SET_FILES) lines.push(`${await sha256File(path.join(staging, file))}  ${file}`);
    writeFileSync(path.join(staging, CHECKSUM_FILE), `${lines.join('\n')}\n`);
    renameSync(staging, output);
  } finally {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    const cleanup = runtime.cleanup();
    if (cleanup.residualResources !== 0 || cleanup.listingFailed) {
      process.stderr.write(`[restore-drill] 정리를 확인하지 못했다(남은 자원 ${cleanup.residualResources}개, 라벨 ${OWNER_LABEL}=${runtime.runId})\n`);
    }
  }
  return output;
}

function parseArguments(argv) {
  const options = {};
  const values = new Set(['--backup-dir', '--migrations', '--output', '--storage-prefix', '--synthetic-backup']);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--verbose') options.verbose = true;
    else if (values.has(argument) && argv[index + 1] && !argv[index + 1].startsWith('--')) options[argument.slice(2)] = argv[++index];
    else throw fail(`알 수 없는 인자: ${argument}`);
  }
  if (Boolean(options['backup-dir']) === Boolean(options['synthetic-backup'])) throw fail('--backup-dir 와 --synthetic-backup 중 하나만 준다');
  if (options['storage-prefix'] && !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u.test(options['storage-prefix'])) throw fail('--storage-prefix 형식이 잘못됐다');
  return options;
}

async function main(argv) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  const migrations = options.migrations ? path.resolve(options.migrations) : path.join(ROOT, DEFAULT_MIGRATIONS);
  if (options['synthetic-backup']) {
    const output = await buildSyntheticBackup({ target: options['synthetic-backup'], migrations, verbose: options.verbose });
    process.stdout.write(`합성 백업 세트를 만들었다(운영 증거 아님): ${output}\n`);
    return 0;
  }
  const summary = await runDrill({ backupDir: options['backup-dir'], migrations, storagePrefix: options['storage-prefix'] ?? 'uploads',
    verbose: options.verbose });
  const output = path.resolve(options.output ?? path.join(ROOT, '.agent', 'temp', `restore-drill-${summary.runId}`, 'result.json'));
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  for (const check of summary.checks) process.stdout.write(`${check.status.padEnd(7)} ${check.id}${check.reason ? ` — ${check.reason}` : ''}\n`);
  process.stdout.write(`${summary.status}: 결과 ${output} (총 ${summary.durations.totalMillis}ms)\n`);
  return summary.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => {
    process.stderr.write(`${error instanceof DrillError ? error.message : error.stack}\n`);
    process.exitCode = 1;
  });
}
