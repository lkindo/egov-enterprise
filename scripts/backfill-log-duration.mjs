#!/usr/bin/env node
/** Bounded Sync between V2_145 Expand and V2_146 Redirect readiness. No metadata/DDL/history writes. */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SELF = 'scripts/backfill-log-duration.mjs';
const OPERATIONS = 'api-server/src/main/resources/db/operations/log-duration/';
const MIGRATIONS = 'api-server/src/main/resources/db/migration/';
const LEDGERS = ['tb_sys_log.prcs_req_msec', 'tb_web_log.prcs_req_msec'];
const normalize = value => value.replace(/\r\n/g, '\n');
export class SyncStopped extends Error {
  constructor(code) { super(code); this.name = 'SyncStopped'; this.code = code; }
}

/** Bind the executable and both SQL inputs to an already merged main commit. Never accept arbitrary SQL. */
export function assertMergedSource(root, commit) {
  if (!/^[0-9a-f]{40}$/.test(commit ?? '')) throw new SyncStopped('MERGED_SOURCE_REQUIRED');
  const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (git(['merge-base', '--is-ancestor', commit, 'origin/main']).status !== 0) {
    throw new SyncStopped('SOURCE_NOT_ON_MAIN');
  }
  const verified = new Map();
  for (const relative of [SELF, OPERATIONS + 'backfill.sql', OPERATIONS + 'verify-parity.sql',
    MIGRATIONS + 'V2_145__expand_log_duration_milliseconds.sql',
    MIGRATIONS + 'V2_146__require_log_duration_parity_before_redirect.sql']) {
    const expected = git(['show', `${commit}:${relative}`]);
    const actual = readFileSync(resolve(root, relative), 'utf8');
    if (expected.status !== 0 || normalize(expected.stdout) !== normalize(actual)) {
      throw new SyncStopped('SOURCE_BYTES_DIFFER');
    }
    verified.set(relative, actual);
  }
  return verified;
}

function count(value) {
  if (!/^(0|[1-9][0-9]*)$/.test(String(value))) throw new SyncStopped('INVALID_RESULT_COUNT');
  return BigInt(value);
}
function checkParity(rows) {
  if (!Array.isArray(rows) || rows.length !== 2 || new Set(rows.map(row => row.target)).size !== 2
      || !rows.every(row => LEDGERS.includes(row.target))) throw new SyncStopped('INVALID_PARITY_RESULT');
  let pending = 0n;
  for (const row of rows) {
    const drift = count(row.nonnull_drift_rows);
    const missing = count(row.pending_rows);
    const mismatches = count(row.mismatches);
    if (drift !== 0n) throw new SyncStopped('NONNULL_DRIFT');
    if (mismatches !== missing) throw new SyncStopped('INVALID_PARITY_RESULT');
    pending += missing;
  }
  return pending;
}

export async function readState(client, backfillSql, paritySql) {
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='5s'");
    await client.query("SET LOCAL transaction_timeout='15s'");
    const provenance = await client.query("SELECT current_database() AS database_name, "
      + "current_setting('server_version_num')::integer AS server_version_num, "
      + "(SELECT count(*) FROM public.flyway_schema_history WHERE version='2.145' AND success) AS expand_history, "
      + "(SELECT count(*) FROM information_schema.columns WHERE table_schema='public' "
      + "AND table_name IN ('tb_sys_log','tb_web_log') AND column_name='prcs_req_msec') AS expanded_columns");
    const state = provenance.rows[0];
    if (!state || state.server_version_num < 170000 || count(state.expand_history) !== 1n
        || count(state.expanded_columns) !== 2n) throw new SyncStopped('V2145_EXPAND_REQUIRED');
    const start = backfillSql.indexOf('DO $d02_log_metadata$');
    const functions = backfillSql.indexOf('DO $d02_log_function_guard$');
    const end = backfillSql.indexOf('WITH selected AS MATERIALIZED');
    if (start < 0 || functions <= start || end <= functions) throw new SyncStopped('SQL_GUARDS_MISSING');
    // The guard contains only catalog/value reads and RAISE. READ ONLY also rejects accidental writes.
    await client.query(backfillSql.slice(start, end));
    const parity = (await client.query(paritySql)).rows;
    const pending = checkParity(parity);
    await client.query('COMMIT');
    return { database: state.database_name, pending, parity };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

/** CLI authorizes its merged source and independently supplied target before invoking this batching core. */
export async function runBackfill(client, backfillSql, paritySql, options = {}) {
  const { maxBatches = 200, maxRuntimeMs = 300000, now = Date.now, progress = () => {} } = options;
  if (!Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 100000
      || !Number.isSafeInteger(maxRuntimeMs) || maxRuntimeMs < 1 || maxRuntimeMs > 3600000) {
    throw new SyncStopped('INVALID_BUDGET');
  }
  const started = now();
  let state = await readState(client, backfillSql, paritySql);
  let changed = 0n;
  for (let batch = 1; state.pending !== 0n; batch++) {
    if (batch > maxBatches || now() - started >= maxRuntimeMs) throw new SyncStopped('BUDGET_EXHAUSTED');
    await client.query('BEGIN');
    let batchChanged = 0n;
    try {
      const raw = await client.query(backfillSql);
      const rows = (Array.isArray(raw) ? raw : [raw]).flatMap(result => result.rows ?? []);
      if (rows.length !== 2 || new Set(rows.map(row => row.target)).size !== 2
          || !rows.every(row => LEDGERS.includes(row.target))) throw new SyncStopped('INVALID_BATCH_RESULT');
      for (const row of rows) {
        const size = count(row.changed_rows);
        if (size > 500n) throw new SyncStopped('BATCH_LIMIT_EXCEEDED');
        batchChanged += size;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
    changed += batchChanged;
    state = await readState(client, backfillSql, paritySql);
    progress({ batch, changedRows: batchChanged.toString(), pendingRows: state.pending.toString() });
    if (batchChanged === 0n && state.pending !== 0n) throw new SyncStopped('LOCKED_PENDING_ROWS');
  }
  return { changedRows: changed.toString(), parity: state.parity };
}

export function connectionOptions(environment, expectedHost, expectedDatabase) {
  let url;
  try { url = new URL((environment.DB_URL ?? '').replace(/^jdbc:/, '')); }
  catch { throw new SyncStopped('DATABASE_TARGET_MISMATCH'); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== 'postgresql:' || !database || database.includes('/') || url.username || url.password || url.hash
      || !expectedHost || url.hostname !== expectedHost || url.hostname !== environment.DB_HOST
      || database !== expectedDatabase || !expectedDatabase
      || (environment.DB_NAME && environment.DB_NAME !== database)
      || (environment.DB_PORT && Number(environment.DB_PORT) !== Number(url.port || 5432))) {
    throw new SyncStopped('DATABASE_TARGET_MISMATCH');
  }
  const query = new Map();
  for (const [key, value] of url.searchParams) {
    if (!['currentSchema', 'prepareThreshold', 'sslmode'].includes(key) || query.has(key)) throw new SyncStopped('UNSUPPORTED_DATABASE_OPTION');
    query.set(key, value);
  }
  if (query.has('currentSchema') && query.get('currentSchema') !== 'public') throw new SyncStopped('UNSUPPORTED_DATABASE_OPTION');
  // JDBC's prepareThreshold does not apply to node-pg's unnamed statements; accept only the known integer option.
  if (query.has('prepareThreshold') && (!/^(?:-1|0|[1-9][0-9]{0,4})$/.test(query.get('prepareThreshold'))
      || Number(query.get('prepareThreshold')) > 65535)) throw new SyncStopped('UNSUPPORTED_DATABASE_OPTION');
  const mode = query.get('sslmode');
  if ((mode && !['disable', 'require', 'verify-full'].includes(mode))
      || (environment.DB_SSL && !['true', 'false'].includes(environment.DB_SSL))
      || (environment.DB_SSL_REJECT_UNAUTHORIZED && !['true', 'false'].includes(environment.DB_SSL_REJECT_UNAUTHORIZED))
      || (mode === 'disable' && environment.DB_SSL === 'true')
      || (mode && mode !== 'disable' && environment.DB_SSL === 'false')
      || (mode === 'verify-full' && environment.DB_SSL_REJECT_UNAUTHORIZED === 'false')) {
    throw new SyncStopped('DATABASE_TLS_OPTIONS_CONFLICT');
  }
  if (!environment.DB_USERNAME || !environment.DB_PASSWORD) throw new SyncStopped('DATABASE_CREDENTIALS_REQUIRED');
  const tls = mode ? mode !== 'disable' : environment.DB_SSL === 'true';
  return {
    host: url.hostname, port: Number(url.port || 5432), database,
    user: environment.DB_USERNAME, password: environment.DB_PASSWORD,
    ssl: tls ? { rejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
    connectionTimeoutMillis: 5000, query_timeout: 18000, application_name: 'egov-log-duration-sync',
  };
}

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: 'boolean', default: false },
    'source-commit': { type: 'string' }, 'expected-host': { type: 'string' }, 'expected-database': { type: 'string' },
    'max-batches': { type: 'string', default: '200' },
    'max-runtime-ms': { type: 'string', default: '300000' },
  } });
  const options = connectionOptions(process.env, values['expected-host'], values['expected-database']);
  const verified = assertMergedSource(ROOT, values['source-commit']);
  const backfill = verified.get(OPERATIONS + 'backfill.sql');
  const parity = verified.get(OPERATIONS + 'verify-parity.sql');
  const client = new pg.Client(options);
  client.on('error', () => {}); // Connection/transaction timeout is reported by the active awaited query.
  try {
    await client.connect();
    const state = await readState(client, backfill, parity);
    if (state.database !== values['expected-database']) throw new SyncStopped('DATABASE_TARGET_MISMATCH');
    if (!values.apply) {
      console.log(JSON.stringify({ mode: 'read-only', pendingRows: state.pending.toString(), parity: state.parity }));
      return;
    }
    const result = await runBackfill(client, backfill, parity, {
      maxBatches: Number(values['max-batches']), maxRuntimeMs: Number(values['max-runtime-ms']),
      progress: item => console.log(JSON.stringify(item)),
    });
    console.log(JSON.stringify({ mode: 'applied', ...result }));
  } finally { await client.end().catch(() => {}); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Never print server DETAIL, SQL, connection arguments or raw log rows.
    const code = error instanceof SyncStopped ? error.code : (/^[A-Z0-9]{5}$/.test(error.code ?? '') ? error.code : 'EXECUTION_FAILED');
    console.error(`Log duration Sync stopped: ${code}`);
    process.exitCode = 1;
  });
}
