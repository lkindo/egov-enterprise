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
import { VENDOR_SOURCE } from './project-composer-vendor-source.mjs';

export const VENDOR_CONTAINER_LABEL = 'egov.composer.vendor';
const SCHEMA = 'vendorcheck';
// 설계서 §9 의 권장값이다. 검증과 겹치는 실제 필요량은 재지 않았으므로 사전 점검은 경고만 한다.
const MEMORY_HINT_BYTES = 2 * 1024 ** 3;

const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1 << 29, ...options });
/** 호출자가 판정한 데몬과 같은 데몬을 보도록 환경을 고정한 docker 실행기. */
export const dockerIn = environment => (args, options = {}) => docker(args, { env: environment, ...options });
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

// 세션 시간대는 앱 접속 인자(VENDOR_SOURCE 의 sessionVariables)와 같게 둔다. 클라이언트가 넣은 행의 CURRENT_TIMESTAMP 기본값이 앱이 넣은 행과 같은 시계를 쓴다.
const mysqlBatch = {
  errors: /^ERROR \d+/, fatal: /^ERROR (2002|2003|2006|2013)\b/, finish: `SELECT '${COMPLETED}';`,
  wrap: body => `SET NAMES utf8mb4;\nSET time_zone = '+09:00';\nSET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;\n${body}\nCOMMIT;\n`,
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
  // sqlplus 는 오류 뒤에도 다음 문장으로 가므로 첫 오류에서 실패 코드로 끝낸다.
  administratorScript: statements => `WHENEVER SQLERROR EXIT FAILURE\n${statements.map(statement => `${statement};`).join('\n')}\nEXIT\n`,
  grants: [`ALTER SESSION SET CONTAINER=${service}`, ...['sys.v_$session', 'sys.v_$sql'].map(view => `GRANT SELECT ON ${view} TO ${SCHEMA}`),
    `GRANT EXECUTE ON sys.dbms_session TO ${SCHEMA}`, `GRANT CREATE TRIGGER TO ${SCHEMA}`],
});

/**
 * MySQL 계열의 통합 시험 접속 값. 접속 인자는 생성물 접속 주소와 같다(세션 시간대·연결 콜레이션). 앱 계정은 이미지의 앱 계정 변수로 초기화 때 만들어진다 —
 * 관리자 문장은 Flyway 적용 뒤에 돌지만 Flyway 와 격리 E2E 의 앱이 그 전에 이 계정으로 붙는다. 관리자 문장은 그 DB 의 전권과 시험의 잠금 관측 권한만 준다.
 */
const innoDbIntegration = (vendorId, { driver, dialect, administrator, observation }) => ({
  port: 3306,
  url: port => `jdbc:${vendorId}://127.0.0.1:${port}/${SCHEMA}?${VENDOR_SOURCE[vendorId].urlParameters}`,
  username: SCHEMA,
  driver,
  dialect,
  administrator,
  // 클라이언트는 --force 가 없으면 첫 오류에서 멈추고 실패 코드로 끝난다.
  administratorScript: statements => `${statements.map(statement => `${statement};`).join('\n')}\n`,
  grants: [`GRANT ALL PRIVILEGES ON ${SCHEMA}.* TO '${SCHEMA}'@'%'`, ...observation],
});

/** 앱 계정이 TCP 로 붙어야 준비다. 초기화 중의 임시 서버는 TCP 를 열지 않고 앱 계정은 초기화 끝에 생긴다. */
const innoDbReady = (client, passwordVariable) => (name, run = docker) => run(['exec', name, 'sh', '-c',
  `MYSQL_PWD=$${passwordVariable} ${client} -h127.0.0.1 --protocol=TCP -u${SCHEMA} -e "select 1" ${SCHEMA}`]).status === 0;

/**
 * 인증 증거가 image 를 그대로 적어 대조하므로 인증할 엔진은 digest 로 고정한다.
 * imageOrigin 은 이미지 출처다. 공식 레지스트리 이미지가 아니면 community 로 그 게시자를 적는다(설계서 §7). version 은 원장 행과 대조한다(vendorEngineProblem).
 */
export const VENDOR_ENGINES = Object.freeze({
  oracle: {
    version: '23',
    image: 'gvenzl/oracle-free:23-slim-faststart@sha256:f5ff19033860d662c821cb04eb10483fa94f14f78eae252d054291ea07028093', imageOrigin: 'community:gvenzl', maxWaitSeconds: 300, memoryHintBytes: MEMORY_HINT_BYTES,
    environment: password => ({ ORACLE_PASSWORD: password, APP_USER: SCHEMA, APP_USER_PASSWORD: password }),
    ready: (name, run = docker) => /DATABASE IS READY TO USE/.test(logs(name, run)),
    command: file => `NLS_LANG=AMERICAN_AMERICA.AL32UTF8 sqlplus -S ${SCHEMA}/"$APP_USER_PASSWORD"@//localhost/FREEPDB1 @${file}`,
    batch: oracleBatch,
    integration: oracleIntegration('FREEPDB1'),
  },
  oracle19: {
    version: '19',
    image: 'fugeritorg/oracle-19.3.0-ee:2025.0@sha256:6a29a3c7924de980b9cf10ef8c7e6120fe2db8e3fc32b2087aa59a845e4c63ac', imageOrigin: 'community:fugeritorg', maxWaitSeconds: 1500, vendor: 'oracle',
    environment: password => ({ ORACLE_PWD: password }),
    ready: (name, run = docker) => {
      if (!/DATABASE IS READY TO USE/.test(logs(name, run))) return false;
      const result = run(['exec', name, 'sh', '-c', `printf 'CREATE USER ${SCHEMA} IDENTIFIED BY "%s" QUOTA UNLIMITED ON USERS;\\nGRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER TO ${SCHEMA};\\nEXIT\\n' "$ORACLE_PWD" | sqlplus -S sys/"$ORACLE_PWD"@//localhost/ORCLPDB1 as sysdba`]);
      return /Grant succeeded/.test(`${result.stdout}${result.stderr}`);
    },
    command: file => `NLS_LANG=AMERICAN_AMERICA.AL32UTF8 sqlplus -S ${SCHEMA}/"$ORACLE_PWD"@//localhost/ORCLPDB1 @${file}`,
    batch: oracleBatch,
    // 이 이미지는 exec 환경에 ORACLE_SID 가 없어 로컬 접속이 안 된다(ORA-12162).
    integration: oracleIntegration('ORCLPDB1', 'sqlplus -S sys/"$ORACLE_PWD"@//localhost/ORCLPDB1 as sysdba'),
  },
  mysql: {
    version: '8.4',
    image: 'mysql:8.4@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902', imageOrigin: 'official:docker-library', maxWaitSeconds: 120,
    // 바이너리 로그가 켜진 8.4 에서 SUPER 없는 앱 계정이 트리거를 만들려면 마지막 인자가 필요하다(없으면 1419, 2026-11-04 실측).
    serverArgs: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_0900_bin', '--log-bin-trust-function-creators=1'],
    environment: password => ({ MYSQL_ROOT_PASSWORD: password, MYSQL_DATABASE: SCHEMA, MYSQL_USER: SCHEMA, MYSQL_PASSWORD: password }),
    ready: innoDbReady('mysql', 'MYSQL_PASSWORD'),
    command: file => `MYSQL_PWD=$MYSQL_ROOT_PASSWORD mysql -uroot --force -N -B --default-character-set=utf8mb4 ${SCHEMA} < ${file}`,
    batch: mysqlBatch,
    // 잠금 관측은 performance_schema 의 대기·스레드 표이고, 세션 이름(사용자 변수)과 잠근 표 이름은 나머지 두 표에서 읽는다(2026-11-04 실측 최소 권한).
    integration: innoDbIntegration('mysql', { driver: 'com.mysql.cj.jdbc.Driver', dialect: 'org.hibernate.dialect.MySQLDialect',
      administrator: `MYSQL_PWD=$MYSQL_ROOT_PASSWORD mysql -uroot --default-character-set=utf8mb4 ${SCHEMA}`,
      observation: ['data_lock_waits', 'threads', 'user_variables_by_thread', 'data_locks'].map(table => `GRANT SELECT ON performance_schema.${table} TO '${SCHEMA}'@'%'`) }),
  },
  mariadb: {
    version: '11.4',
    image: 'mariadb:11.4@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620', imageOrigin: 'official:docker-library', maxWaitSeconds: 120,
    serverArgs: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_nopad_bin'],
    environment: password => ({ MARIADB_ROOT_PASSWORD: password, MARIADB_DATABASE: SCHEMA, MARIADB_USER: SCHEMA, MARIADB_PASSWORD: password }),
    ready: innoDbReady('mariadb', 'MARIADB_PASSWORD'),
    command: file => `MYSQL_PWD=$MARIADB_ROOT_PASSWORD mariadb -uroot --force -N -B --default-character-set=utf8mb4 ${SCHEMA} < ${file}`,
    batch: mysqlBatch,
    // 잠금 관측의 information_schema.INNODB_* 표는 DB 단위가 아닌 PROCESS 권한을 요구한다(2026-11-04 실측). 일회용 시험 DB 에만 준다.
    integration: innoDbIntegration('mariadb', { driver: 'org.mariadb.jdbc.Driver', dialect: 'org.hibernate.dialect.MariaDBDialect',
      administrator: `MYSQL_PWD=$MARIADB_ROOT_PASSWORD mariadb -uroot --default-character-set=utf8mb4 ${SCHEMA}`,
      observation: [`GRANT PROCESS ON *.* TO '${SCHEMA}'@'%'`] }),
  },
  mssql: {
    version: '2022',
    image: 'mcr.microsoft.com/mssql/server:2022-latest', maxWaitSeconds: 180, memoryHintBytes: MEMORY_HINT_BYTES,
    environment: password => ({ ACCEPT_EULA: 'Y', MSSQL_SA_PASSWORD: password, MSSQL_PID: 'Developer' }),
    ready: (name, run = docker) => run(['exec', name, 'sh', '-c', `/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "IF DB_ID('${SCHEMA}') IS NULL CREATE DATABASE ${SCHEMA}; ALTER DATABASE ${SCHEMA} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE"`]).status === 0,
    command: file => `/opt/mssql-tools18/bin/sqlcmd -C -I -f 65001 -h -1 -W -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d ${SCHEMA} -i ${file}`,
    batch: { errors: /^Msg \d+, Level (1[1-9]|2\d)/, fatal: /^(Sqlcmd: Error|Msg \d+, Level 2\d)/, finish: `PRINT '${COMPLETED}'\nGO`, wrap: body => `SET NOCOUNT ON\nGO\n${body}\n`, mark: (index, statement) => `PRINT '@@${index}'\nGO\n${statement.sql}\nGO` },
  },
  cubrid: {
    version: '11.4',
    image: 'cubrid/cubrid:latest', maxWaitSeconds: 120, user: 'cubrid',
    environment: () => ({ CUBRID_DB: SCHEMA, CUBRID_LOCALE: 'ko_KR.utf8', CUBRID_VOLUME_SIZE: '512M' }),
    ready: (name, run = docker) => run(['exec', '-u', 'cubrid', name, 'sh', '-c', `csql -u dba -c "select 1 from db_root" ${SCHEMA}@localhost`]).status === 0,
    command: file => `csql -u dba -e -l -i ${file} ${SCHEMA}@localhost`,
    batch: { errors: /^(ERROR:|Execute:.*error)/i, fatal: /(Failed to connect|Server .* is not running|connection (has been )?(lost|closed|aborted))/i, finish: `SELECT '${COMPLETED}' AS m FROM db_root;`, wrap: body => `${body}\nCOMMIT;\n`, mark: (index, statement) => `SELECT '@@${index}' AS m FROM db_root;\n${statement.sql};` },
  },
});

/**
 * 원장 행이 이 벤더·버전의 엔진을 가리키지 않으면 그 사유를, 맞으면 null 을 돌려준다. 적재와 증거 기록이 같은 판정을 쓴다.
 * 벤더 이름만 대조하면 19 행에 23 엔진을 이어도 통과해 23 실행이 19 증거가 된다.
 */
export function vendorEngineProblem(vendorId, row) {
  const definition = Object.hasOwn(VENDOR_ENGINES, row.engine ?? '') ? VENDOR_ENGINES[row.engine] : undefined;
  if (!definition?.integration || (definition.vendor ?? row.engine) !== vendorId) return `통합 시험을 돌릴 엔진(${row.engine ?? '없음'})이 아니다`;
  return definition.version === row.version ? null : `엔진(${row.engine})의 버전(${definition.version ?? '없음'})이 원장 버전과 다르다`;
}

function logs(name, run = docker) {
  const result = run(['logs', name]);
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

/**
 * 컨테이너만 띄운다. 준비 대기는 호출자가 정한다. 기다리는 동안 신호를 처리해야 하는 격리 E2E 실행기가 따로 기다린다.
 * 환경은 `baseEnvironment` 만 물려주고, 표식은 `extraLabels` 로 더한다.
 */
export function launchVendorContainer(engineId, { publishPort, runDocker = docker, baseEnvironment = process.env, extraLabels = [], requireContainerId = false } = {}) {
  const engine = VENDOR_ENGINES[engineId];
  if (!engine) fail('VENDOR_ENGINE_NOT_READY', `모르는 엔진: ${engineId}`);
  const name = `egov-vendor-${engineId}-${randomBytes(4).toString('hex')}`;
  const password = `Vd1_${randomBytes(10).toString('hex')}`;
  // 값은 자식 프로세스 환경으로 넘긴다. 인자에 두면 호스트의 프로세스 목록에 보인다.
  const variables = engine.environment(password);
  const environment = Object.keys(variables).flatMap(key => ['--env', key]);
  const labels = [...vendorContainerLabels(engineId, baseEnvironment.COMPOSER_CONTAINER_TOKEN ?? ''), ...extraLabels];
  let dockerMissing = false;
  try {
    // docker run -d 는 시작에 실패해도 만든 컨테이너와 익명 볼륨을 남긴다. 그래서 여기서부터 정리 범위다.
    const started = runDocker(['run', '-d', '--name', name, ...labels, ...environment,
      ...(publishPort ? ['-p', `127.0.0.1::${publishPort}`] : []), engine.image, ...(engine.serverArgs ?? [])],
    { env: { ...baseEnvironment, ...variables } });
    // 실행 파일이 없으면 만들어진 컨테이너도 없다. 다른 실행 오류는 컨테이너를 만든 뒤일 수 있어 그대로 정리한다.
    dockerMissing = started.error?.code === 'ENOENT';
    // 실행 오류를 앞에 둔다. 이미지를 받다 시간이 다 되면 stderr 에는 받던 중의 출력만 남아, 뒤에 두면 잘려서 원인이 안 보인다.
    const detail = [started.error?.message, started.stderr].filter(Boolean).join(' ') || `종료 코드 ${started.status}`;
    if (started.status !== 0) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 컨테이너를 띄우지 못했다: ${detail.slice(0, 300)}`);
    const containerId = String(started.stdout ?? '').trim().match(/^[a-f0-9]{64}$/m)?.[0] ?? null;
    if (requireContainerId && !containerId) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 컨테이너의 ID 를 받지 못했다.`);
    return { id: engineId, name, engine, password, containerId };
  } catch (failure) {
    // 호출자는 핸들을 받기 전이라 지울 수 없다.
    if (!dockerMissing) stopVendorEngineReporting({ name }, failure, () => runDocker(['rm', '-f', '-v', name]));
    throw failure;
  }
}

export function startVendorEngine(engineId, { publishPort, runDocker = docker } = {}) {
  const handle = launchVendorContainer(engineId, { publishPort, runDocker });
  const { engine, name } = handle;
  try {
    const deadline = Date.now() + engine.maxWaitSeconds * 1000;
    for (;;) {
      if (engine.ready(name, runDocker)) return { ...handle, port: publishPort ? publishedPort(name, publishPort, runDocker) : null };
      if (Date.now() > deadline) fail('VENDOR_ENGINE_NOT_READY', `${engineId} 가 ${engine.maxWaitSeconds}초 안에 준비되지 않았다.`);
      sleep(2000);
    }
  } catch (failure) {
    stopVendorEngineReporting({ name, password: handle.password }, failure, () => runDocker(['rm', '-f', '-v', name]), runDocker);
    throw failure;
  }
}

export const stopVendorEngine = handle => docker(['rm', '-f', '-v', handle.name]);

// 작업 실패의 로그 끝부분이 40줄(project-composer-job-failure.mjs)이라 Gradle 실패 요약을 밀어내지 않을 만큼만 낸다.
const FAILURE_LOG_LINES = 20;
const FAILURE_LOG_WIDTH = 300;
const FAILURE_LOG_TIMEOUT_MS = 30_000;

/**
 * 컨테이너를 지우면 DB 쪽 원인 근거도 사라지고, CI 와 생성 작업에는 이 출력밖에 남지 않는다. 비밀번호는 이 프로세스가 만들어 부모의 가림 규칙이 모르므로 여기서 가린다.
 * 모르면 가릴 수 없어 내지 않는다. 로그를 못 읽어도 원래 실패와 정리를 막지 않는다.
 */
function reportVendorLogTail(handle, runDocker) {
  if (!handle.password) return;
  try {
    const logs = runDocker(['logs', '--tail', String(FAILURE_LOG_LINES), handle.name], { timeout: FAILURE_LOG_TIMEOUT_MS });
    if (logs.status !== 0) return;
    const lines = `${logs.stdout ?? ''}${logs.stderr ?? ''}`.replaceAll(handle.password, '[password]').split(/\r?\n/).filter(line => line.trim());
    if (lines.length) console.error([`[vendor-engine] ${handle.name} 로그 끝부분:`, ...lines.slice(-FAILURE_LOG_LINES).map(line => line.slice(0, FAILURE_LOG_WIDTH))].join('\n'));
  } catch { /* 위 설명대로 원래 결과를 지킨다. */ }
}

/**
 * 컨테이너를 지우고 앞선 실패를 이어 던진다. 지우지 못하면 남은 이름을 알린다. 앞선 실패가 있으면 그 실패를 가리지 않고 덧붙인다.
 * 앞선 실패가 있으면 지우기 전에 로그 끝부분을 남긴다. `remove` 와 `readLogs` 는 시험에서 바꾼다. 다른 컨테이너를 지우는 호출자는 `remove` 만 넘겨 로그를 읽지 않는다.
 */
export function stopVendorEngineReporting(handle, failure = null, remove = stopVendorEngine, readLogs = remove === stopVendorEngine ? docker : null) {
  if (failure && readLogs) reportVendorLogTail(handle, readLogs);
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

function publishedPort(name, port, run = docker) {
  const mapped = run(['port', name, String(port)]).stdout.match(/:(\d+)\s*$/m)?.[1];
  if (!mapped) fail('VENDOR_ENGINE_NOT_READY', `${name} 의 ${port} 포트를 찾지 못했다.`);
  return Number(mapped);
}

/** 관리자 세션에서 문장을 돌린다. 어느 하나라도 실패하면 멈춘다. 첫 오류에서 끝내는 방법은 클라이언트마다 달라 엔진의 스크립트 형식을 쓴다. */
export function runAsAdministrator(handle, statements, runDocker = docker) {
  const { administrator, administratorScript } = handle.engine.integration;
  const result = runDocker(['exec', '-i', handle.name, 'sh', '-c', administrator], { input: administratorScript(statements) });
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
    // DROP TABLE 뒤의 제약은 휴지통 이름(BIN$...==$0)으로 이 조회에 남는다(23.26 실측). 인덱스·트리거는 나타나지 않았지만 같은 경계를 둔다.
    constraints: "SELECT LOWER(table_name) || '.' || LOWER(constraint_name) FROM user_constraints WHERE constraint_type IN ('P','R','U','C') AND constraint_name NOT LIKE 'SYS\\_%' ESCAPE '\\' AND constraint_name NOT LIKE 'BIN$%'",
    indexes: "SELECT LOWER(table_name) || '.' || LOWER(index_name) FROM user_indexes WHERE index_name NOT LIKE 'SYS\\_%' ESCAPE '\\' AND index_name NOT LIKE 'BIN$%' AND index_type <> 'LOB' AND index_name NOT IN (SELECT constraint_name FROM user_constraints WHERE constraint_type IN ('P','U'))",
    triggers: "SELECT LOWER(table_name) || '.' || LOWER(trigger_name) FROM user_triggers WHERE trigger_name NOT LIKE 'BIN$%'",
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
 * Oracle 의 유니크 제약은 일반 인덱스로 집행될 수 있어(기존 인덱스 재사용, DEFERRABLE) 인덱스만 읽으면 보이지 않는다. 제약에는 object_id 가 없어
 * 정렬한 컬럼 목록을 값으로 쓴다 — 같은 이름·같은 컬럼으로 다시 만든 것은 구분하지 못하지만 미러 판정은 컬럼 집합만 본다.
 */
export const VENDOR_UNIQUE_SIGNATURES = Object.freeze({
  oracle: "SELECT LOWER(i.table_name) || '.' || LOWER(i.index_name) || '=' || o.object_id FROM user_indexes i JOIN user_objects o ON o.object_name = i.index_name AND o.object_type = 'INDEX' WHERE i.uniqueness = 'UNIQUE'"
    + " UNION ALL SELECT LOWER(c.table_name) || '.' || LOWER(c.constraint_name) || '=' || LISTAGG(LOWER(k.column_name), '#') WITHIN GROUP (ORDER BY k.column_name) FROM user_constraints c JOIN user_indexes i ON i.index_name = c.index_name"
    + " JOIN user_cons_columns k ON k.constraint_name = c.constraint_name AND k.table_name = c.table_name WHERE c.constraint_type = 'U' AND i.uniqueness = 'NONUNIQUE' GROUP BY c.table_name, c.constraint_name",
  // InnoDB 의 인덱스 ID 는 표 재빌드(ADD COLUMN·MODIFY·FORCE)마다 바뀌어 쓸 수 없다. 정렬한 키 목록이 값이다 — 재빌드에는 그대로이고 컬럼·접두·식을 바꾸면 달라진다(2026-11-04 실측).
  // MySQL 은 접두 길이를 `$n` 으로, 함수 키 부분을 식의 해시로 붙인다.
  mysql: "SELECT CONCAT(LOWER(s.table_name), '.', LOWER(s.index_name), '=', GROUP_CONCAT(CONCAT(COALESCE(LOWER(s.column_name), CONCAT('expr_', LEFT(SHA2(s.expression, 256), 12))), IF(s.sub_part IS NULL, '', CONCAT('$', s.sub_part)))"
    + " ORDER BY COALESCE(LOWER(s.column_name), s.expression) SEPARATOR '#')) FROM information_schema.statistics s WHERE s.table_schema = DATABASE() AND s.non_unique = 0 GROUP BY s.table_name, s.index_name",
  // MariaDB 의 긴 유니크(HASH)도 같은 컬럼 목록으로 나온다.
  mariadb: "SELECT CONCAT(LOWER(table_name), '.', LOWER(index_name), '=', GROUP_CONCAT(LOWER(column_name) ORDER BY column_name SEPARATOR '#')) FROM information_schema.statistics"
    + " WHERE table_schema = DATABASE() AND non_unique = 0 GROUP BY table_name, index_name",
});

/**
 * 유니크 서명 조회 앞의 세션 설정. GROUP_CONCAT 의 기본 상한(MySQL 1,024자)이 긴 키 목록을 자르지 않게 늘린다. 세미콜론이 없으면 클라이언트가 다음 표식 줄과
 * 한 문장으로 읽어 표식이 사라진다(2026-11-04 실측).
 */
const UNIQUE_SIGNATURE_PREFIX = Object.freeze({
  oracle: ['SET LINESIZE 4000'],
  mysql: ['SET SESSION group_concat_max_len = 1048576;'],
  mariadb: ['SET SESSION group_concat_max_len = 1048576;'],
});

/** 줄이 없는 조회. 종류마다 문장 하나를 돌려 표식 순서를 맞추되 값은 내지 않는다. */
const NO_ROWS = "SELECT 'none.none=none' FROM DUAL WHERE 1 = 0";

/**
 * 키와 유니크의 컬럼을 줄마다 `표.이름=컬럼` 으로 낸다. 함수 인덱스는 `표.이름=식` 이다. 이름 대조는 컬럼이 달라져도 통과하므로 기준선 단계에서 어댑터 기대치와 맞춘다.
 * 식 컬럼(user_ind_expressions)은 LONG 이라 문자열로 이을 수 없어 PL/SQL 로 읽는다. 통합 시험을 여는 벤더는 여기에도 더한다.
 */
export const VENDOR_UNIQUE_COLUMNS = Object.freeze({
  oracle: {
    prefix: ['SET LINESIZE 4000', 'SET SERVEROUTPUT ON SIZE UNLIMITED'],
    constraints: "SELECT LOWER(c.table_name) || '.' || LOWER(c.constraint_name) || '=' || LOWER(k.column_name) FROM user_constraints c JOIN user_cons_columns k ON k.constraint_name = c.constraint_name AND k.table_name = c.table_name"
      + " WHERE c.constraint_type IN ('P','U') AND c.constraint_name NOT LIKE 'SYS\\_%' ESCAPE '\\' AND c.constraint_name NOT LIKE 'BIN$%'",
    indexes: "SELECT LOWER(i.table_name) || '.' || LOWER(i.index_name) || '=' || LOWER(k.column_name) FROM user_indexes i JOIN user_ind_columns k ON k.index_name = i.index_name"
      + " WHERE i.uniqueness = 'UNIQUE' AND i.index_name NOT LIKE 'SYS\\_%' ESCAPE '\\' AND i.index_name NOT IN (SELECT constraint_name FROM user_constraints WHERE constraint_type IN ('P','U')) AND k.column_name NOT LIKE 'SYS\\_NC%' ESCAPE '\\'",
    expressions: `BEGIN
  FOR item IN (SELECT e.table_name, e.index_name, e.column_expression FROM user_ind_expressions e JOIN user_indexes i ON i.index_name = e.index_name WHERE i.uniqueness = 'UNIQUE') LOOP
    DBMS_OUTPUT.PUT_LINE(LOWER(item.table_name) || '.' || LOWER(item.index_name) || '=' || item.column_expression);
  END LOOP;
END;`,
  },
  // MySQL 계열은 CREATE UNIQUE INDEX 도 제약 표에 UNIQUE 로 나와 제약과 독립 인덱스를 가를 수 없다(2026-11-04 실측). 모든 유니크가 첫 조회에 들고 둘째는 늘 빈다.
  // 함수 키 유니크는 어댑터가 만들지 않는다(번역 불가). MySQL 의 식 열은 역따옴표로 나와 식 참조 파서가 읽지 못하므로 조회하지 않는다.
  mysql: {
    constraints: "SELECT CONCAT(LOWER(s.table_name), '.', LOWER(s.index_name), '=', LOWER(s.column_name)) FROM information_schema.statistics s WHERE s.table_schema = DATABASE() AND s.non_unique = 0 AND s.column_name IS NOT NULL",
    indexes: NO_ROWS,
    expressions: NO_ROWS,
  },
  mariadb: {
    constraints: "SELECT CONCAT(LOWER(c.table_name), '.', LOWER(c.constraint_name), '=', LOWER(k.column_name)) FROM information_schema.table_constraints c JOIN information_schema.key_column_usage k"
      + " ON k.constraint_schema = c.constraint_schema AND k.table_name = c.table_name AND k.constraint_name = c.constraint_name WHERE c.constraint_schema = DATABASE() AND c.constraint_type IN ('PRIMARY KEY','UNIQUE')",
    indexes: NO_ROWS,
    expressions: NO_ROWS,
  },
});

/**
 * 독립 시퀀스의 다음 값. 각 문장은 `시퀀스:값` 을 낸다. 시퀀스마다 표 이름이 달라 MySQL 계열은 문장을 만들어 돌린다(2026-11-04 실측).
 * MySQL 은 Hibernate 표 시퀀스(next_val 컬럼 하나인 표)를 읽는다. MariaDB 는 시퀀스의 next_not_cached_value 다 — 어댑터가 NOCACHE 로 만들어 정확한 다음 값이다.
 * MariaDB 의 EXECUTE IMMEDIATE 는 부분 조회를 받지 않아 사용자 변수로 나눈다.
 */
export const VENDOR_SEQUENCE_NEXT_VALUES = Object.freeze({
  oracle: "SELECT LOWER(sequence_name) || ':' || last_number FROM user_sequences WHERE sequence_name NOT LIKE 'ISEQ$$%'",
  mysql: "SET SESSION group_concat_max_len = 1048576; SET @nuri_seq_sql = COALESCE((SELECT GROUP_CONCAT(CONCAT('SELECT CONCAT(''', LOWER(t.table_name), ':'', next_val) FROM `', t.table_name, '`') SEPARATOR ' UNION ALL ')"
    + " FROM information_schema.tables t WHERE t.table_schema = DATABASE() AND t.table_type = 'BASE TABLE' AND (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) = 1"
    + " AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.column_name = 'next_val')), 'SELECT 1 FROM DUAL WHERE 1 = 0');"
    + ' PREPARE nuri_seq FROM @nuri_seq_sql; EXECUTE nuri_seq; DEALLOCATE PREPARE nuri_seq',
  mariadb: "SET @q = (SELECT GROUP_CONCAT(CONCAT('SELECT CONCAT(''', LOWER(table_name), ':'', next_not_cached_value) FROM `', table_name, '`') SEPARATOR ' UNION ALL ')"
    + " FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'SEQUENCE'); EXECUTE IMMEDIATE COALESCE(@q, 'SELECT 1 FROM DUAL WHERE 0')",
});

/**
 * 바이트 길이 문자 컬럼. 각 문장은 `표.컬럼=바이트` 를 낸다. Oracle 드라이버의 COLUMN_SIZE 는 VARCHAR2(100) 과 VARCHAR2(100 CHAR) 에 똑같이 100 이라(23.26 실측)
 * 메타데이터로는 구분되지 않는다. 다른 벤더는 없어서 빈 목록이다.
 */
export const VENDOR_BYTE_COLUMNS = Object.freeze({
  oracle: "SELECT LOWER(table_name) || '.' || LOWER(column_name) || '=' || data_length FROM user_tab_columns WHERE char_used = 'B' AND data_type IN ('VARCHAR2','CHAR') AND table_name NOT LIKE 'BIN$%'",
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

/** 머리 줄 없이 값만 내는 배치. sqlplus 와 -N -B 로 부른 mysql·mariadb 클라이언트다. */
const VALUE_ONLY_BATCHES = new Set(['oracle', 'mysql', 'mariadb']);

/**
 * 줄에서 값을 읽는다. 값만 내는 배치는 줄 전체가 형식에 맞아야 한다. 버리면 따옴표로 만든 이름이 목록에서 사라져 그 이름의 규칙을 통째로
 * 건너뛴다. csql 은 머리 줄을 내므로 다른 벤더는 줄 끝만 읽는다.
 */
function readValues(lines, vendorId, pattern, label) {
  const values = [];
  for (const line of (lines ?? []).map(item => item.trim()).filter(item => item && item !== COMPLETED)) {
    const value = line.match(pattern)?.[1];
    if (VALUE_ONLY_BATCHES.has(vendorId) && value !== line) fail('VENDOR_QUERY_FAILED', `${vendorId} ${label} 조회의 줄을 해석하지 못했다: ${line.slice(0, 200)} — 따옴표로 만든 이름이면 따옴표 없는 표준 이름으로 바꾼다.`);
    if (value) values.push(value);
  }
  return values;
}

export function readUniqueSignatures(handle, vendorId, run = runStatements) {
  const sql = VENDOR_UNIQUE_SIGNATURES[vendorId];
  if (!sql) fail('VENDOR_QUERY_FAILED', `${vendorId} 유니크 서명 조회가 없다`);
  const { sections, errors } = run(handle, [{ sql }], { sessionPrefix: UNIQUE_SIGNATURE_PREFIX[vendorId] });
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 유니크 서명 조회 실패: ${errors[0].error}`);
  return [...new Set(readValues(sections.get(0), vendorId, UNIQUE_SIGNATURE_VALUE, '유니크 서명'))];
}

const BYTE_COLUMN_VALUE = /^([a-z0-9_$#]+\.[a-z0-9_$#]+=\d+)$/;

export function readByteColumns(handle, vendorId, run = runStatements) {
  const sql = VENDOR_BYTE_COLUMNS[vendorId];
  if (!sql) return [];
  const { sections, errors } = run(handle, [{ sql }]);
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 바이트 컬럼 조회 실패: ${errors[0].error}`);
  return readValues(sections.get(0), vendorId, BYTE_COLUMN_VALUE, '바이트 컬럼');
}

const UNIQUE_COLUMN_LINE = /^([a-z0-9_$#]+\.[a-z0-9_$#]+=[a-z0-9_$#]+)$/;
const UNIQUE_EXPRESSION_LINE = /^([a-z0-9_$#]+\.[a-z0-9_$#]+=.+)$/;

/**
 * `표.이름` → 값을 결정하는 컬럼(`keys`)과 식이 참조하는 모든 컬럼(`references`). `CASE WHEN .. THEN "A" END` 의 값은 A 뿐이라 묶음 조건의 컬럼까지 키로 세면
 * CASE 하나가 빠진 번역을 놓친다. 일반 컬럼은 둘이 같다.
 */
export function readUniqueColumns(handle, vendorId, run = runStatements) {
  const query = VENDOR_UNIQUE_COLUMNS[vendorId];
  if (!query) return null;
  const { sections, errors } = run(handle, [{ sql: query.constraints }, { sql: query.indexes }, { sql: query.expressions, raw: true }], { sessionPrefix: query.prefix });
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 유니크 컬럼 조회 실패: ${errors[0].error}`);
  const found = new Map();
  const add = (name, keys, references) => {
    const entry = found.get(name) ?? { keys: new Set(), references: new Set() };
    keys.forEach(item => entry.keys.add(item));
    references.forEach(item => entry.references.add(item));
    found.set(name, entry);
  };
  const plain = [...readValues(sections.get(0), vendorId, UNIQUE_COLUMN_LINE, '유니크 컬럼'), ...readValues(sections.get(1), vendorId, UNIQUE_COLUMN_LINE, '유니크 컬럼')];
  for (const line of plain) {
    const at = line.indexOf('=');
    add(line.slice(0, at), [line.slice(at + 1)], [line.slice(at + 1)]);
  }
  for (const line of readValues(sections.get(2), vendorId, UNIQUE_EXPRESSION_LINE, '유니크 식')) {
    const at = line.indexOf('=');
    const expression = line.slice(at + 1);
    const references = [...expression.matchAll(/"([^"]+)"/g)].map(match => match[1].toLowerCase());
    const output = expression.match(/\bTHEN\s+"([^"]+)"\s+END\b/);
    add(line.slice(0, at), output ? [output[1].toLowerCase()] : references, references);
  }
  return found;
}

const SEQUENCE_VALUE = /^([a-z0-9_$#]+:\d+)$/;

/** 독립 시퀀스의 다음 값. 조회가 없는 벤더는 null 이다. */
export function readSequenceNextValues(handle, vendorId, run = runStatements) {
  const sql = VENDOR_SEQUENCE_NEXT_VALUES[vendorId];
  if (!sql) return null;
  const { sections, errors } = run(handle, [{ sql }]);
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 시퀀스 다음 값 조회 실패: ${errors[0].error}`);
  return new Map(readValues(sections.get(0), vendorId, SEQUENCE_VALUE, '시퀀스 다음 값').map(line => [line.slice(0, line.indexOf(':')), Number(line.slice(line.indexOf(':') + 1))]));
}

/** 메타를 읽어 번역 기대치와 같은 모양으로 돌려준다. */
export function readCatalog(handle, vendorId, run = runStatements) {
  const queries = VENDOR_INTROSPECTION[vendorId];
  const kinds = Object.keys(queries).filter(kind => queries[kind]);
  const { sections, errors } = run(handle, kinds.map(kind => ({ sql: queries[kind] })));
  if (errors.length) fail('VENDOR_QUERY_FAILED', `${vendorId} 메타 조회 실패: ${errors[0].error}`);
  const catalog = {};
  kinds.forEach((kind, index) => {
    catalog[kind] = [...new Set(readValues(sections.get(index), vendorId, NAME_VALUE, kind))];
  });
  return catalog;
}
