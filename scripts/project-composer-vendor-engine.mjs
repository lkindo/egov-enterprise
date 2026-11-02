/**
 * 벤더 일회용 컨테이너의 수명과 문장 실행(설계서 D-4). 번역이 문장 성공에 그치지 않도록
 * 대상 DB 에 적용한 뒤 메타를 다시 읽는다. 비밀번호는 실행마다 만들어 컨테이너 환경으로만 넘긴다.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMPOSER_OWNER_LABEL } from './project-composer-postgres.mjs';

export const VENDOR_CONTAINER_LABEL = 'egov.composer.vendor';
const SCHEMA = 'vendorcheck';
// 설계서 §9 의 권장값이다. 검증과 겹치는 실제 필요량은 재지 않았으므로 사전 점검은 경고만 한다.
const MEMORY_HINT_BYTES = 2 * 1024 ** 3;

const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1 << 29, ...options });
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };

/** 끝까지 실행했다는 표식. 문장 표식만으로는 마지막 문장 뒤의 단절을 알 수 없다. */
const COMPLETED = '@@COMPLETED';

const oracleBatch = {
  errors: /^(ORA-\d+|SP2-\d+|PLS-\d+)/, fatal: /^(ORA-0?3113|ORA-0?3114|ORA-0?1012|SP2-0640|SP2-0306|SP2-0157)\b/,
  finish: `PROMPT ${COMPLETED}`,
  wrap: body => `SET DEFINE OFF\nSET SQLBLANKLINES ON\nSET FEEDBACK OFF\nSET PAGESIZE 0\nSET HEADING OFF\nSET LINESIZE 300\nSET LONG 100000\nSET ECHO OFF\n${body}\nCOMMIT;\nEXIT\n`,
  mark: (index, statement) => (statement.raw ? `PROMPT @@${index}\n${statement.sql}\n/` : `PROMPT @@${index}\n${statement.sql};`),
};

const mysqlBatch = {
  errors: /^ERROR \d+/, fatal: /^ERROR (2002|2003|2006|2013)\b/, finish: `SELECT '${COMPLETED}';`,
  wrap: body => `SET NAMES utf8mb4;\nSET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;\n${body}\nCOMMIT;\n`,
  mark: (index, statement) => (statement.raw ? `SELECT '@@${index}';\nDELIMITER $$\n${statement.sql}$$\nDELIMITER ;` : `SELECT '@@${index}';\n${statement.sql};`),
};

/** 벤더별 기동·실행 방법. image 는 개발용이며 운영 라이선스는 기관 몫이다. */
/** 통합 시험의 접속 값. 시험이 세션 잠금을 관측하고 실패 주입 트리거를 만들 권한을 준다. */
const oracleIntegration = (service, administrator = 'sqlplus -S / as sysdba') => ({
  port: 1521,
  url: port => `jdbc:oracle:thin:@//127.0.0.1:${port}/${service}`,
  username: SCHEMA,
  driver: 'oracle.jdbc.OracleDriver',
  dialect: 'nuri.foundation.core.persistence.NuriOracleDialect',
  administrator,
  grants: [`ALTER SESSION SET CONTAINER=${service}`, ...['sys.v_$session', 'sys.v_$sql'].map(view => `GRANT SELECT ON ${view} TO ${SCHEMA}`),
    `GRANT EXECUTE ON sys.dbms_session TO ${SCHEMA}`, `GRANT CREATE TRIGGER TO ${SCHEMA}`],
});

export const VENDOR_ENGINES = Object.freeze({
  oracle: {
    image: 'gvenzl/oracle-free:23-slim-faststart', maxWaitSeconds: 300, memoryHintBytes: MEMORY_HINT_BYTES,
    environment: password => ({ ORACLE_PASSWORD: password, APP_USER: SCHEMA, APP_USER_PASSWORD: password }),
    ready: name => /DATABASE IS READY TO USE/.test(logs(name)),
    command: file => `NLS_LANG=AMERICAN_AMERICA.AL32UTF8 sqlplus -S ${SCHEMA}/"$APP_USER_PASSWORD"@//localhost/FREEPDB1 @${file}`,
    batch: oracleBatch,
    integration: oracleIntegration('FREEPDB1'),
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
    // 이 이미지는 exec 환경에 ORACLE_SID 가 없어 로컬 접속이 안 된다(ORA-12162).
    integration: oracleIntegration('ORCLPDB1', 'sqlplus -S sys/"$ORACLE_PWD"@//localhost/ORCLPDB1 as sysdba'),
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
    image: 'mcr.microsoft.com/mssql/server:2022-latest', maxWaitSeconds: 180, memoryHintBytes: MEMORY_HINT_BYTES,
    environment: password => ({ ACCEPT_EULA: 'Y', MSSQL_SA_PASSWORD: password, MSSQL_PID: 'Developer' }),
    ready: name => docker(['exec', name, 'sh', '-c', `/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "IF DB_ID('${SCHEMA}') IS NULL CREATE DATABASE ${SCHEMA}; ALTER DATABASE ${SCHEMA} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE"`]).status === 0,
    command: file => `/opt/mssql-tools18/bin/sqlcmd -C -I -f 65001 -h -1 -W -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d ${SCHEMA} -i ${file}`,
    batch: { errors: /^Msg \d+, Level (1[1-9]|2\d)/, fatal: /^(Sqlcmd: Error|Msg \d+, Level 2\d)/, finish: `PRINT '${COMPLETED}'\nGO`, wrap: body => `SET NOCOUNT ON\nGO\n${body}\n`, mark: (index, statement) => `PRINT '@@${index}'\nGO\n${statement.sql}\nGO` },
  },
  cubrid: {
    image: 'cubrid/cubrid:latest', maxWaitSeconds: 120, user: 'cubrid',
    environment: () => ({ CUBRID_DB: SCHEMA, CUBRID_LOCALE: 'ko_KR.utf8', CUBRID_VOLUME_SIZE: '512M' }),
    ready: name => docker(['exec', '-u', 'cubrid', name, 'sh', '-c', `csql -u dba -c "select 1 from db_root" ${SCHEMA}@localhost`]).status === 0,
    command: file => `csql -u dba -e -l -i ${file} ${SCHEMA}@localhost`,
    batch: { errors: /^(ERROR:|Execute:.*error)/i, fatal: /(Failed to connect|Server .* is not running|connection (has been )?(lost|closed|aborted))/i, finish: `SELECT '${COMPLETED}' AS m FROM db_root;`, wrap: body => `${body}\nCOMMIT;\n`, mark: (index, statement) => `SELECT '@@${index}' AS m FROM db_root;\n${statement.sql};` },
  },
});

function logs(name) {
  const result = docker(['logs', name]);
  return `${result.stdout}${result.stderr}`;
}

/**
 * 벤더 컨테이너의 표식. 생성 작업이 부른 실행이면 작업 토큰도 붙인다. 취소는 이 프로세스를 강제로 끝내 아래 정리가 돌지 않으므로
 * 부모의 정리와 다음 기동의 복구가 이 표식으로 회수한다.
 */
export function vendorContainerLabels(engineId, token = process.env.COMPOSER_CONTAINER_TOKEN) {
  if (token && !/^[a-f0-9]{16}$/.test(token)) fail('VENDOR_ENGINE_NOT_READY', '작업 토큰 형식이 아니다.');
  return ['--label', `${VENDOR_CONTAINER_LABEL}=${engineId}`, ...(token ? ['--label', `${COMPOSER_OWNER_LABEL}=${token}`] : [])];
}

export function startVendorEngine(engineId, { publishPort, runDocker = docker } = {}) {
  const engine = VENDOR_ENGINES[engineId];
  if (!engine) fail('VENDOR_ENGINE_NOT_READY', `모르는 엔진: ${engineId}`);
  const name = `egov-vendor-${engineId}-${randomBytes(4).toString('hex')}`;
  const password = `Vd1_${randomBytes(10).toString('hex')}`;
  // 값은 자식 프로세스 환경으로 넘긴다. 인자에 두면 호스트의 프로세스 목록에 보인다.
  const variables = engine.environment(password);
  const environment = Object.keys(variables).flatMap(key => ['--env', key]);
  const labels = vendorContainerLabels(engineId);
  let dockerMissing = false;
  try {
    // docker run -d 는 시작에 실패해도 만든 컨테이너와 익명 볼륨을 남긴다. 그래서 여기서부터 정리 범위다.
    const started = runDocker(['run', '-d', '--name', name, ...labels, ...environment,
      ...(publishPort ? ['-p', `127.0.0.1::${publishPort}`] : []), engine.image, ...(engine.serverArgs ?? [])],
    { env: { ...process.env, ...variables } });
    // 실행 파일이 없으면 만들어진 컨테이너도 없다. 다른 실행 오류는 컨테이너를 만든 뒤일 수 있어 그대로 정리한다.
    dockerMissing = started.error?.code === 'ENOENT';
    // docker 를 실행하지 못하면 stderr 가 없다. 그 경우에도 코드가 남아야 부모가 원인을 안다.
    if (started.status !== 0) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 컨테이너를 띄우지 못했다: ${String(started.stderr ?? started.error?.message).slice(0, 300)}`);
    const deadline = Date.now() + engine.maxWaitSeconds * 1000;
    for (;;) {
      if (engine.ready(name)) return { id: engineId, name, engine, password, port: publishPort ? publishedPort(name, publishPort) : null };
      if (Date.now() > deadline) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 가 ${engine.maxWaitSeconds}초 안에 준비되지 않았다.`);
      sleep(2000);
    }
  } catch (failure) {
    // 호출자는 핸들을 받기 전이라 지울 수 없다.
    if (!dockerMissing) stopVendorEngineReporting({ name }, failure, () => runDocker(['rm', '-f', '-v', name]));
    throw failure;
  }
}

export const stopVendorEngine = handle => docker(['rm', '-f', '-v', handle.name]);

/**
 * 컨테이너를 지우고 앞선 실패를 이어 던진다. 지우지 못하면 남은 이름을 알린다. 앞선 실패가 있으면 그 실패를 가리지 않고 덧붙인다.
 * `remove` 는 시험에서 바꾼다.
 */
export function stopVendorEngineReporting(handle, failure = null, remove = stopVendorEngine) {
  const stopped = remove(handle);
  if (stopped.status === 0) {
    if (failure) throw failure;
    return;
  }
  // 시험을 모두 통과한 뒤에도 난다. 대상 DB 가 준비되지 않았다는 뜻이 아니다.
  const message = `시험 DB 컨테이너가 남았다: ${handle.name}`;
  if (failure) {
    failure.message = `${failure.message} (${message})`;
    throw failure;
  }
  fail('VENDOR_CONTAINER_LEFT', message);
}

function publishedPort(name, port) {
  const mapped = docker(['port', name, String(port)]).stdout.match(/:(\d+)\s*$/m)?.[1];
  if (!mapped) fail('VENDOR_ENGINE_NOT_READY', `${name} 의 ${port} 포트를 찾지 못했다.`);
  return Number(mapped);
}

/** 관리자 세션에서 문장을 돌린다. 어느 하나라도 실패하면 멈춘다. */
export function runAsAdministrator(handle, statements, runDocker = docker) {
  const { administrator } = handle.engine.integration;
  const script = `WHENEVER SQLERROR EXIT FAILURE\n${statements.map(statement => `${statement};`).join('\n')}\nEXIT\n`;
  const result = runDocker(['exec', '-i', handle.name, 'sh', '-c', administrator], { input: script });
  if (result.status !== 0) fail('VENDOR_ADMIN_FAILED', `${handle.id} 관리자 문장 실패: ${`${result.stdout}${result.stderr}`.slice(0, 300)}`);
}

/** COUNT 한 줄을 읽는다. csql 은 `<00001> count(*): 3` 으로 낸다. */
export const parseCount = lines => {
  const value = (lines ?? []).map(line => line.trim().match(/^(?:<\d+>.*:\s*)?(\d+)$/)?.[1]).find(item => item !== undefined);
  return value === undefined ? null : Number(value);
};

/**
 * 클라이언트 출력을 문장별로 나눈다. 값 거부는 문장 오류로 돌려주고, 실행 자체의 실패는 던진다.
 * 접속이 끊긴 클라이언트도 종료 코드 0 을 낼 수 있어 문장마다 표식이 나왔는지 본다.
 * 끊김이 드러난 경우만 VENDOR_ENGINE_NOT_READY 다. 표식이 빠진 것은 앞 문장이 스크립트를 삼킨 번역 결함일 수도 있어 나누지 못한다.
 */
export function collectResults(result, statements, batch, label) {
  if (result.error || result.status === null) fail('VENDOR_ENGINE_NOT_READY', `${label} 실행이 끝나지 않았다: ${result.error?.message ?? result.signal}`);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const sections = new Map();
  let current = -1;
  for (const line of output.split(/\r?\n/)) {
    const marker = line.match(/@@(\d+)/);
    if (marker) { current = Number(marker[1]); if (!sections.has(current)) sections.set(current, []); continue; }
    if (current >= 0) sections.get(current).push(line);
  }
  const fatal = output.split(/\r?\n/).find(line => batch.fatal.test(line.trim()));
  if (fatal) fail('VENDOR_ENGINE_NOT_READY', `${label}: 실행 중 연결이 끊겼다 — ${fatal.trim().slice(0, 200)}`);
  if (!output.includes(COMPLETED)) fail('VENDOR_RUN_INCOMPLETE', `${label}: 끝까지 실행하지 못했다(종료 ${result.status}) — ${output.trim().slice(-300)}`);
  const unreached = statements.findIndex((_, index) => !sections.has(index));
  if (unreached >= 0) fail('VENDOR_RUN_INCOMPLETE', `${label}: ${statements.length}문장 가운데 ${unreached}번째에 닿지 못했다 — ${output.trim().slice(-300)}`);
  const errors = [];
  for (const [index, lines] of sections) {
    const at = lines.findIndex(line => batch.errors.test(line.trim()));
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
    writeFileSync(script, engine.batch.wrap([...sessionPrefix, ...statements.map((statement, index) => engine.batch.mark(index, statement)), engine.batch.finish].join('\n')), 'utf8');
    const copied = docker(['cp', script, `${name}:/tmp/run.sql`]);
    if (copied.status !== 0) fail('VENDOR_ENGINE_NOT_READY', String(copied.stderr ?? copied.error?.message).slice(0, 300));
    docker(['exec', name, 'sh', '-c', 'chmod 644 /tmp/run.sql']);
    const result = docker(['exec', ...(engine.user ? ['-u', engine.user] : []), name, 'sh', '-c', `${engine.command('/tmp/run.sql')} 2>&1`], { timeout: 3_600_000 });
    return collectResults(result, statements, engine.batch, name);
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

/**
 * 유니크마다 `표.이름=값` 을 낸다. 값은 그 유니크를 다시 만들면 달라지므로 같은 이름으로 다른 컬럼에 다시 만들어도 구분된다.
 * 통합 시험을 여는 벤더는 여기에도 더한다. 위 메타 조회와 나눈 이유는 기준선 정확 대조가 그 조회의 종류를 그대로 읽기 때문이다.
 */
export const VENDOR_UNIQUE_SIGNATURES = Object.freeze({
  oracle: "SELECT LOWER(i.table_name) || '.' || LOWER(i.index_name) || '=' || o.object_id FROM user_indexes i JOIN user_objects o ON o.object_name = i.index_name AND o.object_type = 'INDEX' WHERE i.uniqueness = 'UNIQUE'",
});

/** 표별 다음 식별 값. 각 문장은 `표:값` 을 낸다. `inclusive` 는 값이 이미 쓰인 마지막 번호라는 뜻이다. */
const VENDOR_NEXT_VALUES = Object.freeze({
  oracle: { sql: "SELECT LOWER(c.table_name) || ':' || s.last_number FROM user_tab_identity_cols c JOIN user_sequences s ON s.sequence_name = c.sequence_name" },
  mysql: { prefix: ['SET SESSION information_schema_stats_expiry = 0;'], sql: "SELECT CONCAT(LOWER(table_name), ':', auto_increment) FROM information_schema.tables WHERE table_schema = DATABASE() AND auto_increment IS NOT NULL" },
  mariadb: { sql: "SELECT CONCAT(LOWER(table_name), ':', auto_increment) FROM information_schema.tables WHERE table_schema = DATABASE() AND auto_increment IS NOT NULL" },
  mssql: { sql: "SELECT LOWER(OBJECT_NAME(object_id)) + ':' + CAST(last_value AS VARCHAR(30)) FROM sys.identity_columns WHERE last_value IS NOT NULL AND OBJECTPROPERTY(object_id, 'IsUserTable') = 1", inclusive: true },
  cubrid: { sql: "SELECT LOWER(class_name) || ':' || CAST(current_val AS VARCHAR(40)) FROM db_serial WHERE class_name IS NOT NULL" },
});

export function readNextValues(handle, vendorId, run = runStatements) {
  const query = VENDOR_NEXT_VALUES[vendorId];
  const { sections, errors } = run(handle, [{ sql: query.sql }], { sessionPrefix: query.prefix ?? [] });
  // 조회 문장의 실패는 조회 자체의 문제다. 대조 결과가 나오기 전이라 대조 실패로 말하지 않는다.
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 다음 값 조회 실패: ${errors[0].error}`);
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

const UNIQUE_SIGNATURE_VALUE = /(?:^|[\s:'])([a-z0-9_$#]+\.[a-z0-9_$#]+=[a-z0-9_$#]+)'?$/;

export function readUniqueSignatures(handle, vendorId, run = runStatements) {
  const sql = VENDOR_UNIQUE_SIGNATURES[vendorId];
  if (!sql) fail('VENDOR_QUERY_FAILED', `${vendorId} 유니크 서명 조회가 없다`);
  const { sections, errors } = run(handle, [{ sql }]);
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 유니크 서명 조회 실패: ${errors[0].error}`);
  return [...new Set((sections.get(0) ?? []).map(line => line.trim().match(UNIQUE_SIGNATURE_VALUE)?.[1]).filter(Boolean))];
}

/** 메타를 읽어 번역 기대치와 같은 모양으로 돌려준다. */
export function readCatalog(handle, vendorId, run = runStatements) {
  const queries = VENDOR_INTROSPECTION[vendorId];
  const kinds = Object.keys(queries).filter(kind => queries[kind]);
  const { sections, errors } = run(handle, kinds.map(kind => ({ sql: queries[kind] })));
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 메타 조회 실패: ${errors[0].error}`);
  const catalog = {};
  kinds.forEach((kind, index) => {
    const names = (sections.get(index) ?? []).map(line => line.trim().match(NAME_VALUE)?.[1]).filter(Boolean);
    catalog[kind] = [...new Set(names)];
  });
  return catalog;
}
