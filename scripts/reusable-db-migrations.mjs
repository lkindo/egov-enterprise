/**
 * DB 번들 생성의 마이그레이션 단계 — 버전 순서, 권한 Contract 리허설 단계 계획, 검토된 V2_99 카탈로그 판독.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  throw new Error(message);
}

export function versionedMigrations() {
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

