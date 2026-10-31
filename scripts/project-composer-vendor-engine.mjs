/**
 * 벤더 일회용 컨테이너의 수명과 문장 실행(설계서 D-4). 번역이 문장 성공에 그치지 않도록
 * 대상 DB 에 적용한 뒤 메타를 다시 읽는다. 비밀번호는 실행마다 만들어 컨테이너 환경으로만 넘긴다.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const VENDOR_CONTAINER_LABEL = 'egov.composer.vendor';
const SCHEMA = 'vendorcheck';

const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1 << 29, ...options });
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };

const oracleBatch = {
  terminator: '', errors: /^(ORA-\d+|SP2-\d+|PLS-\d+)/,
  wrap: body => `SET DEFINE OFF\nSET SQLBLANKLINES ON\nSET FEEDBACK OFF\nSET PAGESIZE 0\nSET HEADING OFF\nSET LINESIZE 300\nSET LONG 100000\nSET ECHO OFF\n${body}\nCOMMIT;\nEXIT\n`,
  mark: (index, statement) => (statement.raw ? `PROMPT @@${index}\n${statement.sql}\n/` : `PROMPT @@${index}\n${statement.sql};`),
};

const mysqlBatch = {
  errors: /^ERROR \d+/,
  wrap: body => `SET NAMES utf8mb4;\nSET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;\n${body}\nCOMMIT;\n`,
  mark: (index, statement) => (statement.raw ? `SELECT '@@${index}';\nDELIMITER $$\n${statement.sql}$$\nDELIMITER ;` : `SELECT '@@${index}';\n${statement.sql};`),
};

/** 벤더별 기동·실행 방법. image 는 개발용이며 운영 라이선스는 기관 몫이다. */
export const VENDOR_ENGINES = Object.freeze({
  oracle: {
    image: 'gvenzl/oracle-free:23-slim-faststart', maxWaitSeconds: 300,
    environment: password => ({ ORACLE_PASSWORD: password, APP_USER: SCHEMA, APP_USER_PASSWORD: password }),
    ready: name => /DATABASE IS READY TO USE/.test(logs(name)),
    command: file => `NLS_LANG=AMERICAN_AMERICA.AL32UTF8 sqlplus -S ${SCHEMA}/"$APP_USER_PASSWORD"@//localhost/FREEPDB1 @${file}`,
    batch: oracleBatch,
  },
  oracle19: {
    image: 'fugeritorg/oracle-19.3.0-ee:2025.0', maxWaitSeconds: 1500,
    environment: password => ({ ORACLE_PWD: password }),
    ready: name => {
      if (!/DATABASE IS READY TO USE/.test(logs(name))) return false;
      const result = docker(['exec', name, 'sh', '-c', `printf 'CREATE USER ${SCHEMA} IDENTIFIED BY "%s" QUOTA UNLIMITED ON USERS;\\nGRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER TO ${SCHEMA};\\nEXIT\\n' "$ORACLE_PWD" | sqlplus -S sys/"$ORACLE_PWD"@//localhost/ORCLPDB1 as sysdba`]);
      return /Grant succeeded/.test(`${result.stdout}${result.stderr}`);
    },
    command: file => `NLS_LANG=AMERICAN_AMERICA.AL32UTF8 sqlplus -S ${SCHEMA}/"$ORACLE_PWD"@//localhost/ORCLPDB1 @${file}`,
    batch: oracleBatch,
  },
  mysql: {
    image: 'mysql:8.4', maxWaitSeconds: 120, serverArgs: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_0900_bin', '--log-bin-trust-function-creators=1'],
    environment: password => ({ MYSQL_ROOT_PASSWORD: password, MYSQL_DATABASE: SCHEMA }),
    ready: name => docker(['exec', name, 'sh', '-c', `MYSQL_PWD=$MYSQL_ROOT_PASSWORD mysql -uroot -e "select 1" ${SCHEMA}`]).status === 0,
    command: file => `MYSQL_PWD=$MYSQL_ROOT_PASSWORD mysql -uroot --force -N -B --default-character-set=utf8mb4 ${SCHEMA} < ${file}`,
    batch: mysqlBatch,
  },
  mariadb: {
    image: 'mariadb:11.4', maxWaitSeconds: 120, serverArgs: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_nopad_bin'],
    environment: password => ({ MARIADB_ROOT_PASSWORD: password, MARIADB_DATABASE: SCHEMA }),
    ready: name => docker(['exec', name, 'sh', '-c', `MYSQL_PWD=$MARIADB_ROOT_PASSWORD mariadb -uroot -e "select 1" ${SCHEMA}`]).status === 0,
    command: file => `MYSQL_PWD=$MARIADB_ROOT_PASSWORD mariadb -uroot --force -N -B --default-character-set=utf8mb4 ${SCHEMA} < ${file}`,
    batch: mysqlBatch,
  },
  mssql: {
    image: 'mcr.microsoft.com/mssql/server:2022-latest', maxWaitSeconds: 180,
    environment: password => ({ ACCEPT_EULA: 'Y', MSSQL_SA_PASSWORD: password, MSSQL_PID: 'Developer' }),
    ready: name => docker(['exec', name, 'sh', '-c', `/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "IF DB_ID('${SCHEMA}') IS NULL CREATE DATABASE ${SCHEMA}; ALTER DATABASE ${SCHEMA} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE"`]).status === 0,
    command: file => `/opt/mssql-tools18/bin/sqlcmd -C -I -f 65001 -h -1 -W -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d ${SCHEMA} -i ${file}`,
    batch: { errors: /^Msg \d+, Level (1[1-9]|2\d)/, wrap: body => `SET NOCOUNT ON\nGO\n${body}\n`, mark: (index, statement) => `PRINT '@@${index}'\nGO\n${statement.sql}\nGO` },
  },
  cubrid: {
    image: 'cubrid/cubrid:latest', maxWaitSeconds: 120, user: 'cubrid',
    environment: () => ({ CUBRID_DB: SCHEMA, CUBRID_LOCALE: 'ko_KR.utf8', CUBRID_VOLUME_SIZE: '512M' }),
    ready: name => docker(['exec', '-u', 'cubrid', name, 'sh', '-c', `csql -u dba -c "select 1 from db_root" ${SCHEMA}@localhost`]).status === 0,
    command: file => `csql -u dba -e -l -i ${file} ${SCHEMA}@localhost`,
    batch: { errors: /^(ERROR:|Execute:.*error)/i, wrap: body => `${body}\nCOMMIT;\n`, mark: (index, statement) => `SELECT '@@${index}' AS m FROM db_root;\n${statement.sql};` },
  },
});

function logs(name) {
  const result = docker(['logs', name]);
  return `${result.stdout}${result.stderr}`;
}

export function startVendorEngine(engineId) {
  const engine = VENDOR_ENGINES[engineId];
  if (!engine) fail('VENDOR_ENGINE_NOT_READY', `모르는 엔진: ${engineId}`);
  const name = `egov-vendor-${engineId}-${randomBytes(4).toString('hex')}`;
  const password = `Vd1_${randomBytes(10).toString('hex')}`;
  const environment = Object.entries(engine.environment(password)).flatMap(([key, value]) => ['--env', `${key}=${value}`]);
  const started = docker(['run', '-d', '--name', name, '--label', `${VENDOR_CONTAINER_LABEL}=${engineId}`, ...environment, engine.image, ...(engine.serverArgs ?? [])]);
  if (started.status !== 0) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 컨테이너를 띄우지 못했다: ${started.stderr.slice(0, 300)}`);
  const deadline = Date.now() + engine.maxWaitSeconds * 1000;
  for (;;) {
    if (engine.ready(name)) return { id: engineId, name, engine };
    if (Date.now() > deadline) {
      stopVendorEngine({ name });
      fail('VENDOR_ENGINE_NOT_READY', `${engineId} 가 ${engine.maxWaitSeconds}초 안에 준비되지 않았다.`);
    }
    sleep(2000);
  }
}

export const stopVendorEngine = handle => docker(['rm', '-f', '-v', handle.name]);

/** COUNT 한 줄을 읽는다. csql 은 `<00001> count(*): 3` 으로 낸다. */
export const parseCount = lines => {
  const value = (lines ?? []).map(line => line.trim().match(/^(?:<\d+>.*:\s*)?(\d+)$/)?.[1]).find(item => item !== undefined);
  return value === undefined ? null : Number(value);
};

/**
 * 클라이언트 출력을 문장별로 나눈다. 값 거부는 문장 오류로 돌려주고, 실행 자체의 실패는 던진다.
 * 접속이 끊긴 클라이언트도 종료 코드 0 을 낼 수 있어 문장마다 표식이 나왔는지 본다.
 */
export function collectResults(result, statements, errorPattern, label) {
  if (result.error || result.status === null) fail('VENDOR_ENGINE_NOT_READY', `${label} 실행이 끝나지 않았다: ${result.error?.message ?? result.signal}`);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const sections = new Map();
  let current = -1;
  for (const line of output.split(/\r?\n/)) {
    const marker = line.match(/@@(\d+)/);
    if (marker) { current = Number(marker[1]); if (!sections.has(current)) sections.set(current, []); continue; }
    if (current >= 0) sections.get(current).push(line);
  }
  const unreached = statements.findIndex((_, index) => !sections.has(index));
  if (unreached >= 0) fail('VENDOR_ENGINE_NOT_READY', `${label}: ${statements.length}문장 가운데 ${unreached}번째에 닿지 못했다 — ${output.trim().slice(-300)}`);
  const errors = [];
  for (const [index, lines] of sections) {
    const at = lines.findIndex(line => errorPattern.test(line.trim()));
    if (at >= 0) errors.push({ index, statement: statements[index]?.sql.replace(/\s+/g, ' ').slice(0, 200), error: `${lines[at].trim().slice(0, 180)} ${(lines[at + 1] ?? '').trim().slice(0, 120)}` });
  }
  return { sections, errors };
}

/** 문장을 표식과 함께 실행하고 표식별 출력을 돌려준다. 벤더 클라이언트는 오류 뒤에도 계속 가므로 출력에서 오류를 찾는다. */
export function runStatements(handle, statements, { sessionPrefix = [] } = {}) {
  const { engine, name } = handle;
  const directory = mkdtempSync(join(tmpdir(), 'egov-vendor-'));
  try {
    const script = join(directory, 'run.sql');
    writeFileSync(script, engine.batch.wrap([...sessionPrefix, ...statements.map((statement, index) => engine.batch.mark(index, statement))].join('\n')), 'utf8');
    const copied = docker(['cp', script, `${name}:/tmp/run.sql`]);
    if (copied.status !== 0) fail('VENDOR_ENGINE_NOT_READY', copied.stderr.slice(0, 300));
    docker(['exec', name, 'sh', '-c', 'chmod 644 /tmp/run.sql']);
    const result = docker(['exec', ...(engine.user ? ['-u', engine.user] : []), name, 'sh', '-c', `${engine.command('/tmp/run.sql')} 2>&1`], { timeout: 3_600_000 });
    return collectResults(result, statements, engine.batch.errors, name);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** 대상 DB 메타 조회. 각 문장은 `표.이름` 한 컬럼을 낸다. */
export const VENDOR_INTROSPECTION = Object.freeze({
  oracle: {
    columns: 'SELECT LOWER(table_name) || \'.\' || LOWER(column_name) FROM user_tab_columns WHERE table_name NOT LIKE \'BIN$%\'',
    constraints: "SELECT LOWER(table_name) || '.' || LOWER(constraint_name) FROM user_constraints WHERE constraint_type IN ('P','R','U','C') AND constraint_name NOT LIKE 'SYS\\_%' ESCAPE '\\'",
    indexes: "SELECT LOWER(table_name) || '.' || LOWER(index_name) FROM user_indexes WHERE index_name NOT LIKE 'SYS\\_%' ESCAPE '\\' AND index_type <> 'LOB' AND index_name NOT IN (SELECT constraint_name FROM user_constraints WHERE constraint_type IN ('P','U'))",
    triggers: "SELECT LOWER(table_name) || '.' || LOWER(trigger_name) FROM user_triggers",
    sequences: "SELECT '.' || LOWER(sequence_name) FROM user_sequences WHERE sequence_name NOT LIKE 'ISEQ$$%'",
  },
  mysql: mysqlIntrospection(),
  mariadb: { ...mysqlIntrospection(), sequences: "SELECT CONCAT('.', LOWER(table_name)) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'SEQUENCE'" },
  mssql: {
    columns: "SELECT LOWER(t.name) + '.' + LOWER(c.name) FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id",
    constraints: "SELECT LOWER(OBJECT_NAME(parent_object_id)) + '.' + LOWER(name) FROM sys.objects WHERE type IN ('PK','UQ','F','C') AND name NOT LIKE 'PK[_][_]%'",
    indexes: "SELECT LOWER(t.name) + '.' + LOWER(i.name) FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id WHERE i.name IS NOT NULL AND i.is_primary_key = 0 AND i.is_unique_constraint = 0",
    triggers: "SELECT LOWER(OBJECT_NAME(parent_id)) + '.' + LOWER(name) FROM sys.triggers",
    sequences: "SELECT '.' + LOWER(name) FROM sys.sequences",
  },
  cubrid: {
    columns: "SELECT LOWER(class_name) || '.' || LOWER(attr_name) FROM db_attribute WHERE class_name NOT LIKE 'db\\_%' ESCAPE '\\' AND class_name NOT LIKE '\\_db\\_%' ESCAPE '\\' AND class_name NOT IN (SELECT class_name FROM db_class WHERE is_system_class = 'YES')",
    indexes: "SELECT LOWER(class_name) || '.' || LOWER(index_name) FROM db_index WHERE class_name NOT IN (SELECT class_name FROM db_class WHERE is_system_class = 'YES')",
    triggers: "SELECT LOWER(target_class_name) || '.' || LOWER(trigger_name) FROM db_trig",
    sequences: "SELECT '.' || LOWER(name) FROM db_serial WHERE class_name IS NULL",
    constraints: null,
  },
});

/** 표별 다음 식별 값. 각 문장은 `표:값` 을 낸다. `inclusive` 는 값이 이미 쓰인 마지막 번호라는 뜻이다. */
const VENDOR_NEXT_VALUES = Object.freeze({
  oracle: { sql: "SELECT LOWER(c.table_name) || ':' || s.last_number FROM user_tab_identity_cols c JOIN user_sequences s ON s.sequence_name = c.sequence_name" },
  mysql: { prefix: ['SET SESSION information_schema_stats_expiry = 0;'], sql: "SELECT CONCAT(LOWER(table_name), ':', auto_increment) FROM information_schema.tables WHERE table_schema = DATABASE() AND auto_increment IS NOT NULL" },
  mariadb: { sql: "SELECT CONCAT(LOWER(table_name), ':', auto_increment) FROM information_schema.tables WHERE table_schema = DATABASE() AND auto_increment IS NOT NULL" },
  mssql: { sql: "SELECT LOWER(OBJECT_NAME(object_id)) + ':' + CAST(last_value AS VARCHAR(30)) FROM sys.identity_columns WHERE last_value IS NOT NULL AND OBJECTPROPERTY(object_id, 'IsUserTable') = 1", inclusive: true },
  cubrid: { sql: "SELECT LOWER(class_name) || ':' || CAST(current_val AS VARCHAR(40)) FROM db_serial WHERE class_name IS NOT NULL" },
});

export function readNextValues(handle, vendorId) {
  const query = VENDOR_NEXT_VALUES[vendorId];
  const { sections, errors } = runStatements(handle, [{ sql: query.sql }], { sessionPrefix: query.prefix ?? [] });
  if (errors.length) fail('VENDOR_PARITY_FAILED', `${vendorId} 다음 값 조회 실패: ${errors[0].error}`);
  const values = new Map();
  for (const line of sections.get(0) ?? []) {
    const match = line.trim().match(/(?:^|[\s'])([a-z0-9_$#]+):(\d+)'?$/);
    if (match) values.set(match[1], Number(match[2]) + (query.inclusive ? 1 : 0));
  }
  return values;
}

function mysqlIntrospection() {
  return {
    columns: "SELECT CONCAT(LOWER(c.table_name), '.', LOWER(c.column_name)) FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name WHERE c.table_schema = DATABASE() AND t.table_type = 'BASE TABLE'",
    constraints: "SELECT CONCAT(LOWER(table_name), '.', LOWER(constraint_name)) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()",
    indexes: "SELECT DISTINCT CONCAT(LOWER(s.table_name), '.', LOWER(s.index_name)) FROM information_schema.statistics s WHERE s.table_schema = DATABASE() AND s.index_name <> 'PRIMARY' AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints k WHERE k.constraint_schema = s.table_schema AND k.table_name = s.table_name AND k.constraint_name = s.index_name)",
    triggers: "SELECT CONCAT(LOWER(event_object_table), '.', LOWER(trigger_name)) FROM information_schema.triggers WHERE trigger_schema = DATABASE()",
    sequences: "SELECT '.none' FROM DUAL WHERE 1 = 0",
  };
}

/** 다른 클라이언트는 값만 내지만 csql 은 `<00001> 식: 'a.b'` 로 낸다. 줄 끝의 값만 읽는다. */
const NAME_VALUE = /(?:^|[\s:'])([a-z0-9_$#]*\.[a-z0-9_$#]+)'?$/;

/** 메타를 읽어 번역 기대치와 같은 모양으로 돌려준다. */
export function readCatalog(handle, vendorId) {
  const queries = VENDOR_INTROSPECTION[vendorId];
  const kinds = Object.keys(queries).filter(kind => queries[kind]);
  const { sections, errors } = runStatements(handle, kinds.map(kind => ({ sql: queries[kind] })));
  if (errors.length) fail('VENDOR_PARITY_FAILED', `${vendorId} 메타 조회 실패: ${errors[0].error}`);
  const catalog = {};
  kinds.forEach((kind, index) => {
    const names = (sections.get(index) ?? []).map(line => line.trim().match(NAME_VALUE)?.[1]).filter(Boolean);
    catalog[kind] = [...new Set(names)];
  });
  return catalog;
}
