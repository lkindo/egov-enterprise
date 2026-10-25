import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { basename, delimiter, dirname, extname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { devNull } from 'node:os';
import { WorkspaceError } from './store.mjs';
import { readBoundedFile } from './inputs.mjs';

const MAX_BYTES = 16 * 1024 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$#]{0,127}$/;
const VENDORS = {
  postgresql: { port: 5432, driver: 'org.postgresql.Driver', adapter: 'postgresql-pg-catalog' },
  oracle: { port: 1521, driver: 'oracle.jdbc.OracleDriver', adapter: 'oracle-catalog' },
  mysql: { port: 3306, driver: 'com.mysql.cj.jdbc.Driver', adapter: 'mysql-catalog' },
  mariadb: { port: 3306, driver: 'org.mariadb.jdbc.Driver', adapter: 'mariadb-catalog' },
  sqlserver: { port: 1433, driver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver', adapter: 'sqlserver-catalog' },
};
const OPERATIONS = new Set(['discover', 'profile', 'app-scan', 'term-suggest', 'mapping-generate', 'plan', 'validate', 'dry-run', 'commit']);
const LOADS = new Set(['dry-run', 'commit']);
const IMPORTS = new Set(['skeleton', 'ledger', 'confirmed-ledger', 'review', 'standard-columns']);
const DIAGNOSTIC = /\bMW_DIAGNOSTIC=(DB_TLS_UNSUPPORTED|DB_TLS_CERTIFICATE|DB_AUTH_FAILED|DB_DATABASE_NOT_FOUND|DB_ACCESS_DENIED|DB_CONNECTION_REFUSED|DB_CONNECTION_TIMEOUT|DB_HOST_NOT_FOUND|DB_DRIVER_UNAVAILABLE)\b/;
const ENVELOPES = { inventory: ['catalog-inventory', 'schemaVersion', 4], profile: ['source-profile', 'envelopeVersion', 1], appUsage: ['app-usage', 'envelopeVersion', 1], suggestions: ['term-suggestions', 'envelopeVersion', 1], plan: ['migration-plan', 'schemaVersion', 2] };
const JOB_ROLES = { discover: ['source'], profile: ['source'], 'app-scan': [], 'term-suggest': ['target'], 'mapping-generate': [], plan: ['source', 'target'], validate: [], 'dry-run': ['source', 'target'], commit: ['source', 'target'] };
const REQUIRED_ARTIFACTS = { profile: ['inventory'], 'term-suggest': ['profile'], 'mapping-generate': ['skeleton', 'confirmedLedger', 'inventory', 'standardColumns'], plan: ['mapping', 'inventory', 'standardColumns'], validate: ['plan'], 'dry-run': ['mapping', 'inventory', 'plan', 'standardColumns'], commit: ['mapping', 'inventory', 'plan', 'standardColumns'] };
const ARTIFACT_BLOCKERS = { inventory: 'INVENTORY_REQUIRED', profile: 'PROFILE_ARTIFACT_REQUIRED', skeleton: 'SKELETON_REQUIRED', confirmedLedger: 'CONFIRMED_LEDGER_REQUIRED', standardColumns: 'STANDARD_COLUMNS_REQUIRED', mapping: 'MAPPING_REQUIRED', plan: 'PLAN_REQUIRED' };
// Retire current aliases, never immutable files or a person's local/Git ledger.
const RETIRE_ARTIFACTS = {
  discover: ['inventory', 'profile', 'suggestions', 'ledgerDraft', 'mapping', 'plan', 'review', 'execution'],
  profile: ['profile', 'suggestions', 'ledgerDraft', 'mapping', 'plan', 'review', 'execution'],
  'app-scan': ['appUsage', 'suggestions', 'ledgerDraft', 'mapping', 'plan', 'review', 'execution'],
  'term-suggest': ['suggestions', 'ledgerDraft', 'mapping', 'plan', 'review', 'execution'],
  'mapping-generate': ['mapping', 'plan', 'review', 'execution'],
  plan: ['plan', 'execution'], 'dry-run': ['execution'], commit: ['execution'],
};
const ENDPOINT_IDENTITY = ['vendor', 'host', 'port', 'database', 'username', 'oracleMode', 'instance', 'driverJar', 'driverClass'];
// 결과 불명 작업 하나에 대조하는 실행 증거 파일 수의 상한. 실제 적재 한 번은 증거 파일 하나를 만든다.
const EVIDENCE_LIMIT = 20;
const EVIDENCE_TIME = /^\d{4}-\d{2}-\d{2}T[0-9:.]{2,18}(?:Z|[+-]\d{2}:\d{2})$/;
const fail = (code, message) => { throw new WorkspaceError(code, message); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value);
const clone = value => structuredClone(value);
function exact(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('INVALID_INPUT', '입력 형식 또는 허용 필드를 확인하세요.');
}
function text(value, maximum = 256) {
  if (typeof value !== 'string' || !value.length || value.length > maximum || /[\x00-\x1f\x7f]/.test(value)) fail('INVALID_INPUT', '입력 값의 형식과 길이를 확인하세요.');
  return value;
}
function safeContent(value, { placeholders = false } = {}) {
  function inspect(node, depth = 0) {
    if (depth > 64) fail('INVALID_ARTIFACT', '산출물 구조가 너무 깊습니다.');
    if (typeof node === 'string') {
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|access[_-]?token|api[_-]?key)\s*[=:]\s*[^\s$"']+/i.test(node)) fail('SENSITIVE_CONTENT', '비밀정보가 포함된 자료는 저장할 수 없습니다.');
    } else if (node && typeof node === 'object') {
      for (const [key, entry] of Object.entries(node)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('INVALID_ARTIFACT', '허용하지 않는 산출물 필드입니다.');
        if (/^(?:password|passwd|token|accessToken|refreshToken|apiKey|privateKey|secret)$/i.test(key)
          && !(placeholders && key === 'password' && /^\$\{MW_(?:SOURCE|TARGET)_PASSWORD\}$/.test(entry))) fail('SENSITIVE_CONTENT', '비밀정보 필드는 저장할 수 없습니다.');
        inspect(entry, depth + 1);
      }
    }
  }
  inspect(value);
}

// Parse without duplicate-key ambiguity and preserve the exact canonical payload bytes written by Java.
function parseJson(content) {
  let position = 0;
  let payloadText;
  const ws = () => { while (/\s/.test(content[position] ?? '') && position < content.length) position++; };
  function value(depth = 0) {
    if (depth > 64) throw new Error();
    ws(); const start = position, ch = content[position];
    if (ch === '{') {
      position++; ws(); const result = {}, keys = new Set();
      if (content[position] === '}') { position++; return result; }
      while (true) {
        ws(); const key = string();
        if (keys.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error();
        keys.add(key); ws(); if (content[position++] !== ':') throw new Error(); ws(); const begin = position;
        result[key] = value(depth + 1);
        if (depth === 0 && key === 'payload') payloadText = content.slice(begin, position);
        ws(); const next = content[position++]; if (next === '}') break; if (next !== ',') throw new Error();
      }
      return result;
    }
    if (ch === '[') {
      position++; ws(); const result = [];
      if (content[position] === ']') { position++; return result; }
      while (true) { result.push(value(depth + 1)); ws(); const next = content[position++]; if (next === ']') break; if (next !== ',') throw new Error(); }
      return result;
    }
    if (ch === '"') return string();
    const match = content.slice(position).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
    if (!match) throw new Error(); position += match[0].length;
    const result = JSON.parse(content.slice(start, position));
    if (typeof result === 'number' && !Number.isFinite(result)) throw new Error();
    return result;
  }
  function string() {
    if (content[position++] !== '"') throw new Error(); const begin = position - 1;
    while (position < content.length) { const ch = content[position++]; if (ch === '\\') position++; else if (ch === '"') return JSON.parse(content.slice(begin, position)); }
    throw new Error();
  }
  try { const parsed = value(); ws(); if (position !== content.length) throw new Error(); return { parsed, payloadText }; }
  catch { fail('INVALID_ARTIFACT', '중복 키 없이 올바른 JSON 자료를 선택하세요. YAML 가져오기는 아직 지원하지 않습니다.'); }
}
async function regularPath(path, { directory = false, outsideGit = false } = {}) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) fail('INVALID_PATH', '절대 로컬 경로가 필요합니다.');
  const absolute = resolve(path);
  let cursor = parse(absolute).root;
  try {
    for (const part of absolute.slice(cursor.length).split(sep).filter(Boolean)) {
      cursor = join(cursor, part);
      if ((await lstat(cursor)).isSymbolicLink()) fail('UNSAFE_PATH', '링크 경로는 사용할 수 없습니다.');
    }
    const stat = await lstat(absolute);
    if (directory ? !stat.isDirectory() : !stat.isFile()) fail('INVALID_PATH', '요청한 파일 또는 폴더 형식이 아닙니다.');
    if (outsideGit && await inGit(absolute)) fail('UNSAFE_PATH', 'Git 작업트리 밖의 보관 폴더가 필요합니다.');
    return await realpath(absolute);
  } catch (error) { if (error instanceof WorkspaceError) throw error; fail('PATH_UNAVAILABLE', '선택한 로컬 파일 또는 폴더를 확인하세요.'); }
}
async function inGit(path) {
  let cursor = path;
  while (true) { try { await lstat(join(cursor, '.git')); return true; } catch {} const parent = dirname(cursor); if (parent === cursor) return false; cursor = parent; }
}
async function boundedFile(path) {
  const checked = await regularPath(path);
  try {
    return await readBoundedFile(checked, MAX_BYTES, 'ARTIFACT_TOO_LARGE');
  } catch (error) {
    if (error.code === 'ARTIFACT_TOO_LARGE') fail('ARTIFACT_TOO_LARGE', '산출물은 16 MiB 이하여야 합니다.');
    if (error.code === 'INPUT_CHANGED') fail('ARTIFACT_CHANGED', '읽는 동안 산출물이 변경되었습니다. 다시 선택하세요.');
    fail('ARTIFACT_READ_FAILED', '선택한 산출물을 안전하게 읽지 못했습니다.');
  }
}
async function writeNew(path, bytes) {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
// 사람이 실행 증거를 확인했다고 기록하지 않은 결과 불명 작업. 확인 기록은 결과를 성공으로 바꾸지 않는다.
const unresolvedUnknown = job => job.status === 'unknown' && !job.acknowledgement;
// 이전 프로세스가 아직 대상에 쓰고 있을 수 있는 작업. 실행기 재시작 복구(store.mjs 의 recoverJobs)는 끊긴 읽기를
// interrupted, 끊긴 적재를 unknown 으로 두되 pid 는 그대로 남긴다. Linux·macOS 에서는 부모 Node 가 죽어도 Java 자식이
// 계속 쓸 수 있으므로 unknown 적재도 pid 의 생존을 본다. 확인 기록이 있는 unknown 작업은 기록할 때 그 pid 의 종료를
// 확인했으므로 다시 보지 않는다(나중에 같은 pid 를 받은 다른 프로세스를 이전 작업으로 오인하지 않는다).
const lingeringCandidate = job => Number.isSafeInteger(job.pid) && (job.status === 'interrupted' || unresolvedUnknown(job));
// 이전 프로세스의 생존 판정. 신호 0 은 프로세스를 건드리지 않고 존재만 묻는다. ESRCH 만 종료로 보고, 권한 부족(EPERM)처럼
// 판정할 수 없는 경우는 살아 있는 것과 같이 막는다(fail closed).
function previousProcess(pid) {
  try { process.kill(pid, 0); return 'alive'; } catch (error) { return error.code === 'ESRCH' ? 'exited' : 'undetermined'; }
}
// 실행 증거에서 판정에 필요한 고정 항목만 옮긴다. 행 값·키·경로·원문은 작업 색인에 들이지 않는다.
function evidenceSummary(record) {
  const value = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
  const time = item => typeof item === 'string' && EVIDENCE_TIME.test(item) ? item : null;
  const tables = Array.isArray(value.tables) ? value.tables : null;
  const written = tables?.every(table => Number.isSafeInteger(table?.written) && table.written >= 0) ? tables.reduce((sum, table) => sum + table.written, 0) : null;
  return {
    schemaVersion: Number.isSafeInteger(value.schemaVersion) ? value.schemaVersion : null,
    mode: ['DRY_RUN', 'COMMIT'].includes(value.mode) ? value.mode : null,
    status: ['STARTED', 'PASS', 'FAILED'].includes(value.status) ? value.status : 'UNREADABLE',
    startedAt: time(value.startedAt), updatedAt: time(value.updatedAt),
    tables: tables ? tables.length : null, written: Number.isSafeInteger(written) ? written : null,
  };
}

export function buildJdbcProfile(role, input) {
  exact(input, ['vendor', 'host', 'port', 'database', 'schema', 'username', 'tlsMode', 'oracleMode', 'driverJar', 'driverClass', 'instance'], ['vendor', 'host', 'database', 'schema', 'username']);
  for (const key of ['vendor', 'schema', 'tlsMode', 'oracleMode', 'driverJar', 'driverClass', 'instance']) {
    if (Object.hasOwn(input, key) && typeof input[key] !== 'string') fail('INVALID_INPUT', '접속 항목은 지정한 문자열 형식이어야 합니다.');
  }
  if (!['source', 'target'].includes(role) || !Object.hasOwn(VENDORS, input.vendor) || (role === 'target' && input.vendor !== 'postgresql')) fail('UNSUPPORTED_DATABASE', '지원하는 원천 DB와 PostgreSQL 대상만 선택할 수 있습니다.');
  const spec = VENDORS[input.vendor], host = text(input.host), database = text(input.database), username = text(input.username);
  if (!/^(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[A-Fa-f0-9:]+\])$/.test(host)
    || !/^[A-Za-z0-9_$#.-]{1,128}$/.test(database) || !IDENTIFIER.test(input.schema) || /[;{}\r\n]/.test(username)) fail('INVALID_CONNECTION', '접속 항목에 허용되지 않는 문자가 있습니다.');
  const port = input.port ?? spec.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('INVALID_PORT', '포트는 1~65535 정수여야 합니다.');
  const tlsMode = input.tlsMode ?? 'verify-full';
  if (!['disable', 'require', 'verify-full'].includes(tlsMode)) fail('INVALID_TLS', '지원하는 TLS 모드를 선택하세요.');
  if (input.driverClass && input.driverClass !== spec.driver) fail('INVALID_DRIVER', '선택한 DB에 맞는 고정 드라이버 클래스가 필요합니다.');
  if (input.vendor !== 'oracle' && input.oracleMode) fail('INVALID_CONNECTION', 'Oracle 연결 방식은 Oracle에만 사용할 수 있습니다.');
  if (input.vendor !== 'sqlserver' && input.instance) fail('INVALID_CONNECTION', '인스턴스는 SQL Server에만 사용할 수 있습니다.');
  let url;
  if (input.vendor === 'postgresql') url = `jdbc:postgresql://${host}:${port}/${database}?sslmode=${tlsMode}`;
  if (input.vendor === 'mysql') url = `jdbc:mysql://${host}:${port}/${database}?sslMode=${{ disable: 'DISABLED', require: 'REQUIRED', 'verify-full': 'VERIFY_IDENTITY' }[tlsMode]}&allowLoadLocalInfile=false&allowUrlInLocalInfile=false&autoDeserialize=false`;
  if (input.vendor === 'mariadb') url = `jdbc:mariadb://${host}:${port}/${database}?sslMode=${{ disable: 'disable', require: 'trust', 'verify-full': 'verify-full' }[tlsMode]}&allowLocalInfile=false`;
  if (input.vendor === 'sqlserver') {
    if (input.instance && !IDENTIFIER.test(input.instance)) fail('INVALID_CONNECTION', '인스턴스 이름 형식이 맞지 않습니다.');
    url = `jdbc:sqlserver://${host}${input.instance ? '' : `:${port}`};databaseName=${database};encrypt=${tlsMode !== 'disable'};trustServerCertificate=${tlsMode !== 'verify-full'}${input.instance ? `;instanceName=${input.instance}` : ''}`;
  }
  if (input.vendor === 'oracle') {
    const mode = input.oracleMode ?? 'service';
    if (!['service', 'sid'].includes(mode)) fail('UNSUPPORTED_ORACLE_MODE', '첫 버전은 Oracle service/SID 연결만 지원합니다.');
    if (tlsMode === 'require' || (mode === 'sid' && tlsMode !== 'disable')) fail('UNSUPPORTED_TLS', 'Oracle TLS는 service 방식의 verify-full만 지원합니다.');
    url = mode === 'sid' ? `jdbc:oracle:thin:@${host}:${port}:${database}` : tlsMode === 'disable' ? `jdbc:oracle:thin:@//${host}:${port}/${database}` : `jdbc:oracle:thin:@tcps://${host}:${port}/${database}?ssl_server_dn_match=true`;
  }
  return { profile: { ...input, port, tlsMode, driverClass: spec.driver }, url, adapter: spec.adapter, driver: spec.driver };
}

export function createEngine({ store, jarPath, javaPath, gitPath, spawnImpl = spawn }) {
  const credentials = new Map();
  const active = new Map();
  let serial = Promise.resolve();
  const exclusive = work => { const result = serial.then(work, work); serial = result.catch(() => {}); return result; };
  const requireIdle = state => { if (state.activeJobId) fail('JOB_ACTIVE', '실행 중인 작업이 끝난 뒤 변경하세요.'); };
  const checkRevision = (state, revision) => { if (!Number.isSafeInteger(revision) || state.revision !== revision) fail('REVISION_CONFLICT', '다른 변경이 있습니다. 최신 상태를 다시 확인하세요.'); };
  function retire(state, operation) {
    for (const key of RETIRE_ARTIFACTS[operation] ?? []) delete state.artifacts[key];
  }
  function invalidate(state, scope) {
    state.inputRevision = (state.inputRevision ?? 0) + 1;
    state.readiness = {};
    retire(state, scope === 'source' ? 'discover' : scope === 'target' ? 'term-suggest' : 'app-scan');
    if (scope === 'target') delete state.artifacts.standardColumns;
  }
  function invalidateReview(state, kind) {
    state.inputRevision = (state.inputRevision ?? 0) + 1;
    state.readiness = {};
    for (const key of kind === 'review' ? ['plan', 'execution'] : ['mapping', 'plan', 'review', 'execution']) delete state.artifacts[key];
  }
  async function artifact(kind, state = null) {
    state ??= await store.read();
    const metadata = state.artifacts[kind];
    if (!metadata) fail('ARTIFACT_REQUIRED', '앞 단계의 유효한 산출물이 필요합니다.');
    const path = await store.resolveArtifact(metadata.file);
    const bytes = await boundedFile(path);
    if (digest(bytes) !== metadata.sha256) fail('ARTIFACT_CHANGED', '저장된 산출물이 변경되었습니다. 다시 검토하세요.');
    return { metadata, path, bytes };
  }
  async function saveArtifact(name, bytes, format = 'json') {
    const file = `${randomUUID()}-${name}.${format === 'yaml' ? 'yml' : 'json'}`;
    await writeNew(await store.resolveArtifact(file), bytes);
    return { file, sha256: digest(bytes), format, bytes: bytes.length };
  }
  async function reviewedGitFile(path, bytes) {
    let executable = gitPath;
    if (!executable) {
      for (const directory of (process.env.PATH ?? process.env.Path ?? '').split(delimiter)) {
        if (!isAbsolute(directory)) continue;
        try { executable = await regularPath(join(directory, process.platform === 'win32' ? 'git.exe' : 'git')); break; } catch {}
      }
    }
    try { executable = await regularPath(executable); } catch { fail('GIT_UNAVAILABLE', '기관 검토 판 확인을 위한 Git 실행 파일이 필요합니다.'); }
    const env = await profileEnvironment({ profiles: {} }, []);
    // Git for Windows does not accept Node's device namespace path \\.\nul.
    const gitNull = process.platform === 'win32' ? 'NUL' : devNull;
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitNull, GIT_CONFIG_SYSTEM: gitNull, GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
    const query = args => new Promise((resolveQuery, reject) => {
      let length = 0, done = false; const chunks = [];
      const child = spawnImpl(executable, ['-c', `core.hooksPath=${gitNull}`, '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', dirname(path), ...args], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env });
      const timer = setTimeout(() => { child.kill(); finish(new WorkspaceError('GIT_REVIEW_REQUIRED', 'Git 확정 판 조회 시간이 초과되었습니다.')); }, 10_000);
      function finish(error) { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolveQuery(Buffer.concat(chunks)); }
      child.stdout?.on('data', chunk => { length += chunk.length; if (length > MAX_BYTES) { child.kill(); finish(new WorkspaceError('GIT_REVIEW_REQUIRED', 'Git 원장 크기 제한을 초과했습니다.')); } else chunks.push(chunk); });
      child.stderr?.resume(); child.once('error', () => finish(new WorkspaceError('GIT_REVIEW_REQUIRED', 'Git 확정 판을 확인할 수 없습니다.')));
      child.once('close', code => finish(code === 0 ? null : new WorkspaceError('GIT_REVIEW_REQUIRED', '기관 Git에서 추적·확정한 원장을 선택하세요.')));
    });
    const top = (await query(['rev-parse', '--show-toplevel'])).toString('utf8').trim();
    const root = await regularPath(top, { directory: true });
    const repoPath = relative(root, path).split(sep).join('/');
    if (!repoPath || repoPath.startsWith('../') || /[\x00-\x1f]/.test(repoPath)) fail('GIT_REVIEW_REQUIRED', '기관 Git 내부의 원장을 선택하세요.');
    const commit = (await query(['rev-parse', '--verify', 'HEAD^{commit}'])).toString('utf8').trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) fail('GIT_REVIEW_REQUIRED', 'Git 확정 commit을 확인할 수 없습니다.');
    const blob = (await query(['rev-parse', '--verify', `${commit}:${repoPath}`])).toString('utf8').trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(blob)) fail('GIT_REVIEW_REQUIRED', 'Git 확정 blob을 확인할 수 없습니다.');
    const stage = (await query(['ls-files', '--stage', '-z', '--', repoPath])).toString('utf8');
    if (stage !== `100644 ${blob} 0\t${repoPath}\0` && stage !== `100755 ${blob} 0\t${repoPath}\0`) fail('GIT_REVIEW_REQUIRED', '미추적 또는 변경된 Git 원장은 확정본으로 사용할 수 없습니다.');
    const committed = await query(['cat-file', 'blob', blob]);
    if (!committed.equals(bytes) || !(await boundedFile(path)).equals(bytes)) fail('GIT_REVIEW_REQUIRED', '원장 작업 파일이 Git HEAD 확정 판과 다릅니다.');
    return { commit, blob, fileDigest: digest(bytes) };
  }
  async function profileEnvironment(state, roles) {
    const env = {};
    // pgJDBC uses APPDATA/postgresql for its default trusted CA on Windows.
    for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'APPDATA']) if (typeof process.env[key] === 'string') env[key] = process.env[key];
    for (const role of roles) {
      if (!state.profiles[role]) fail('PROFILE_REQUIRED', '원천 및 대상 연결 프로필을 준비하세요.');
      if (!credentials.has(role)) fail('CREDENTIALS_REQUIRED', '현재 실행 세션에 접속 비밀번호를 다시 입력하세요.');
      const built = buildJdbcProfile(role, state.profiles[role]);
      const prefix = `MW_${role.toUpperCase()}_`;
      env[`${prefix}URL`] = built.url;
      env[`${prefix}USERNAME`] = state.profiles[role].username;
      env[`${prefix}PASSWORD`] = credentials.get(role);
    }
    return env;
  }
  function dbReference(role, state) {
    const prefix = `MW_${role.toUpperCase()}_`;
    return { url: '${' + prefix + 'URL}', username: '${' + prefix + 'USERNAME}', password: '${' + prefix + 'PASSWORD}', driver: state.profiles[role]?.driverClass ?? VENDORS.postgresql.driver, endpointId: `${role}-${digest(json(state.profiles[role] ?? {})).slice(0, 32)}` };
  }
  async function baseMapping(state, roles) {
    // The CLI requires both endpoint bindings even for a source-only read. An unused
    // endpoint has no connection fields or credential references and cannot connect.
    const reference = role => roles.includes(role) ? dbReference(role, state) : { endpointId: dbReference(role, state).endpointId };
    const mapping = { source: reference('source'), target: reference('target'), tables: [], codemaps: {}, run: { runId: 'workspace-analysis', sourceNamespace: 'workspace' } };
    const metadata = await saveArtifact('connection', Buffer.from(json(mapping)));
    return store.resolveArtifact(metadata.file);
  }
  function inputDigest(state, jarDigest) {
    return digest(json({ profiles: state.profiles, inputs: state.inputs, inputRevision: state.inputRevision ?? 0, artifacts: Object.fromEntries(['skeleton', 'confirmedLedger', 'mapping', 'inventory', 'plan', 'review', 'standardColumns'].map(key => [key, state.artifacts[key]?.sha256 ?? null])), jarDigest }));
  }
  async function preflight() {
    let checkedJar, checkedJava;
    try { if (extname(jarPath ?? '').toLowerCase() !== '.jar') throw new Error(); checkedJar = await regularPath(jarPath); }
    catch { fail('CLI_JAR_UNAVAILABLE', '실행할 기존 migration-tool JAR의 전체 경로를 지정하세요.'); }
    try { checkedJava = await regularPath(javaPath); } catch { fail('JAVA_UNAVAILABLE', 'Java 21 실행 파일의 전체 경로를 지정하세요.'); }
    let jarBytes;
    try { jarBytes = await readBoundedFile(checkedJar, 128 * 1024 * 1024); }
    catch { fail('CLI_JAR_INVALID', '변경 중이지 않은 128 MiB 이하의 migration-tool JAR가 필요합니다.'); }
    if (jarBytes.subarray(0, 2).toString() !== 'PK') fail('CLI_JAR_INVALID', '유효한 migration-tool JAR가 필요합니다.');
    const env = await profileEnvironment({ profiles: {} }, []);
    await new Promise((resolveVersion, reject) => {
      let output = '', finished = false;
      const child = spawnImpl(checkedJava, ['-version'], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env });
      const timer = setTimeout(() => { child.kill(); done(new WorkspaceError('JAVA_UNAVAILABLE', 'Java 버전 확인 시간이 초과되었습니다.')); }, 10_000);
      const done = error => { if (finished) return; finished = true; clearTimeout(timer); error ? reject(error) : resolveVersion(); };
      for (const stream of [child.stdout, child.stderr]) stream?.on('data', bytes => { if (output.length < 4096) output += bytes.toString().slice(0, 4096 - output.length); });
      child.once('error', () => done(new WorkspaceError('JAVA_UNAVAILABLE', 'Java 실행 파일을 시작하지 못했습니다.')));
      child.once('close', code => done(code === 0 && /(?:openjdk|java) version "21(?:\.|"|\s)/.test(output) ? null : new WorkspaceError('JAVA_VERSION_UNSUPPORTED', 'Java 21 런타임이 필요합니다.')));
    });
    return { jarPath: checkedJar, javaPath: checkedJava, jarDigest: digest(jarBytes) };
  }
  async function configureProfile(role, profile, password, revision, credentialAction) {
    return exclusive(async () => {
      const built = buildJdbcProfile(role, profile);
      const action = credentialAction === undefined ? (password === undefined ? 'clear' : 'replace') : credentialAction;
      if (!['replace', 'keep', 'clear'].includes(action) || (action !== 'replace' && password !== undefined)) fail('INVALID_CREDENTIAL_ACTION', '비밀번호 유지·교체·지우기 선택과 입력을 확인하세요.');
      if (action === 'replace' && password === undefined) fail('INVALID_CREDENTIAL', '교체할 비밀번호를 입력하세요.');
      if (password !== undefined && (typeof password !== 'string' || !password.length || password.length > 4096 || /[\x00\r\n]/.test(password))) fail('INVALID_CREDENTIAL', '비밀번호 형식을 확인하세요.');
      if (built.profile.driverJar) { if (extname(built.profile.driverJar).toLowerCase() !== '.jar') fail('INVALID_DRIVER', '로컬 JAR 파일을 선택하세요.'); await regularPath(built.profile.driverJar); }
      const state = await store.read(); checkRevision(state, revision); requireIdle(state);
      if (action === 'keep' && (!credentials.has(role) || !state.profiles[role] || ENDPOINT_IDENTITY.some(key => state.profiles[role][key] !== built.profile[key]))) fail('CREDENTIAL_REENTRY_REQUIRED', '접속 대상이나 계정이 바뀌었거나 현재 세션 비밀번호가 없습니다. 비밀번호를 다시 입력하세요.');
      const applyCredential = () => { if (action === 'replace') credentials.set(role, password); else if (action === 'clear') credentials.delete(role); };
      if (json(state.profiles[role]) === json(built.profile)) {
        applyCredential();
        return publicState(state);
      }
      const updated = await store.update(revision, draft => { draft.profiles[role] = built.profile; invalidate(draft, role); });
      applyCredential();
      return publicState(updated);
    });
  }
  async function configureInputs(input, revision) {
    return exclusive(async () => {
      exact(input, ['sourceRoot', 'sourceFingerprint'], ['sourceRoot', 'sourceFingerprint']);
      if (!SHA.test(input.sourceFingerprint)) fail('INVALID_INPUT', '입력 fingerprint가 필요합니다.');
      const sourceRoot = await regularPath(input.sourceRoot, { directory: true });
      const state = await store.read(); checkRevision(state, revision); requireIdle(state);
      return publicState(await store.update(revision, draft => { draft.inputs = { sourceRoot, sourceFingerprint: input.sourceFingerprint }; invalidate(draft, 'inputs'); }));
    });
  }
  function inspectImport(kind, content) {
    const value = parseJson(content).parsed;
    safeContent(value, { placeholders: kind === 'skeleton' });
    if (kind === 'standard-columns') {
      if (!Array.isArray(value) || !value.length || value.length > 100_000) fail('COLUMNS_FORMAT', '대상 컬럼 스냅샷 JSON 배열이 필요합니다.');
      for (const entry of value) {
        exact(entry, ['table_name', 'column_name'], ['table_name', 'column_name']);
        if (typeof entry.table_name !== 'string' || typeof entry.column_name !== 'string' || !IDENTIFIER.test(entry.column_name) || !entry.table_name.split('.').every(part => IDENTIFIER.test(part)) || entry.table_name.split('.').length > 2) fail('COLUMNS_FORMAT', '테이블·컬럼 식별자만 포함한 대상 컬럼 스냅샷이 필요합니다.');
      }
    } else if (kind === 'ledger' || kind === 'confirmed-ledger') {
      exact(value, ['schemaVersion', 'entries'], ['schemaVersion', 'entries']);
      if (value.schemaVersion !== 2 || !Array.isArray(value.entries)) fail('LEDGER_FORMAT', '형식 2 용어 원장이 필요합니다.');
      for (const entry of value.entries) exact(entry, ['id', 'source', 'mapping', 'via', 'target', 'term', 'nonStandardTarget', 'grade', 'status', 'load', 'conformance', 'archive', 'note', 'history'], ['id', 'source', 'grade', 'status']);
    } else if (kind === 'skeleton') {
      exact(value, ['source', 'target', 'tables', 'codemaps', 'run', 'archives'], ['tables', 'run']);
      if (!Array.isArray(value.tables)) fail('MAPPING_FORMAT', '표 매핑 목록이 필요합니다.');
      exact(value.run, ['runId', 'sourceNamespace'], ['runId', 'sourceNamespace']);
      for (const key of ['runId', 'sourceNamespace']) if (!/^[A-Za-z0-9_-]{1,100}$/.test(value.run[key])) fail('MAPPING_FORMAT', '실행 식별자 형식을 확인하세요.');
      // Imported connection fields are never trusted or used; credentials come from the session profile.
      for (const role of ['source', 'target']) if (value[role]) {
        exact(value[role], ['url', 'username', 'password', 'driver', 'endpointId']);
        for (const key of ['url', 'username', 'password']) if (value[role][key] && !/^\$\{MW_(?:SOURCE|TARGET)_[A-Z]+\}$/.test(value[role][key])) fail('SENSITIVE_CONTENT', '접속정보 대신 실행기 환경 참조를 사용하세요.');
        delete value[role];
      }
    } else {
      exact(value, ['schemaVersion', 'sourceInventoryDigest', 'targetSchemaDigest', 'mappingDigest', 'executionContractDigest', 'decisions'], ['schemaVersion', 'sourceInventoryDigest', 'targetSchemaDigest', 'mappingDigest', 'executionContractDigest', 'decisions']);
      if (value.schemaVersion !== 2 || ['sourceInventoryDigest', 'targetSchemaDigest', 'mappingDigest', 'executionContractDigest'].some(key => !SHA.test(value[key]))) fail('REVIEW_FORMAT', '형식 2 승인 검토 artifact가 필요합니다.');
    }
    return value;
  }
  async function importArtifact(kind, path, revision) {
    return exclusive(async () => {
      if (!IMPORTS.has(kind)) fail('INVALID_ARTIFACT_KIND', '지원하는 가져오기 종류를 선택하세요.');
      const bytes = await boundedFile(path);
      const value = inspectImport(kind, new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      const checkedPath = await regularPath(path);
      if (kind === 'confirmed-ledger' && !await inGit(dirname(checkedPath))) fail('GIT_REVIEW_REQUIRED', '기관 Git 검토 저장소의 확정 원장을 선택하세요.');
      const gitReview = kind === 'confirmed-ledger' ? await reviewedGitFile(checkedPath, bytes) : null;
      const state = await store.read(); checkRevision(state, revision); requireIdle(state);
      const metadata = await saveArtifact(kind, kind === 'skeleton' ? Buffer.from(json(value)) : bytes);
      return publicState(await store.update(revision, draft => {
        invalidateReview(draft, kind); draft.artifacts[kind === 'confirmed-ledger' ? 'confirmedLedger' : kind === 'standard-columns' ? 'standardColumns' : kind] = metadata;
        if (kind === 'ledger') delete draft.artifacts.confirmedLedger;
        if (kind === 'confirmed-ledger') draft.ledger = { reviewSource: 'institution-git-import', confirmedDigest: metadata.sha256, gitCommit: gitReview.commit, gitBlob: gitReview.blob };
      }));
    });
  }
  async function saveLedger(ledger, revision) {
    return exclusive(async () => {
      inspectImport('ledger', json(ledger));
      // Editing a local draft cannot manufacture a human confirmation or institutional approval.
      if (ledger.entries.some(entry => ['CONFIRMED', 'APPROVED_IGNORE', 'ARCHIVE'].includes(entry.status))) fail('GIT_REVIEW_REQUIRED', '확정 상태는 기관 Git 검토 원장을 가져와야 합니다. 로컬 편집은 초안만 저장합니다.');
      const state = await store.read(); checkRevision(state, revision); requireIdle(state);
      const metadata = await saveArtifact('ledger', Buffer.from(json(ledger)));
      return publicState(await store.update(revision, draft => { invalidateReview(draft, 'ledger'); draft.artifacts.ledger = metadata; delete draft.artifacts.confirmedLedger; draft.ledger = { reviewSource: 'local-draft' }; }));
    });
  }
  async function buildJob(operation, options, state, runtime) {
    const roles = JOB_ROLES[operation];
    if (operation === 'mapping-generate' && (!state.profiles.source || !state.profiles.target)) fail('PROFILE_REQUIRED', '매핑에 사용할 원천 및 대상 연결 프로필을 준비하세요.');
    const env = await profileEnvironment(state, roles);
    const args = ['-jar', runtime.jarPath, `--command=${LOADS.has(operation) ? 'load' : operation}`];
    if (['mapping-generate', 'plan', 'dry-run', 'commit'].includes(operation)) {
      args.unshift(`-Dmigration.db-columns-path=${(await artifact('standardColumns', state)).path}`);
    }
    const outputs = {};
    const add = (name, value) => args.push(`--${name}=${value}`);
    const output = async (kind, format = 'json') => { const file = `${randomUUID()}-${kind}.${format === 'yaml' ? 'yml' : 'json'}`; outputs[kind] = { file, format }; return store.resolveArtifact(file); };
    const use = async (kind, option) => add(option, (await artifact(kind, state)).path);
    const source = async (drivers = true) => {
      const profile = state.profiles.source;
      if (!profile) fail('PROFILE_REQUIRED', '원천 프로필을 준비하세요.');
      add('source-adapter', VENDORS[profile.vendor].adapter); add('schemas', profile.schema); add('object-kinds', 'TABLE,COLUMN,PRIMARY_KEY');
      if (drivers && profile.vendor !== 'postgresql') {
        if (!profile.driverJar) fail('DRIVER_REQUIRED', '선택한 DB의 로컬 JDBC JAR가 필요합니다.');
        add('source-driver-jar', await regularPath(profile.driverJar)); add('source-driver-class', profile.driverClass);
      }
    };
    if (operation === 'app-scan') {
      if (!state.inputs.sourceRoot) fail('SOURCE_REQUIRED', '점검한 소스 폴더를 준비하세요.');
      add('app-source', await regularPath(state.inputs.sourceRoot, { directory: true })); add('app-usage', await output('appUsage'));
    } else if (['discover', 'profile', 'term-suggest'].includes(operation)) {
      add('mapping', await baseMapping(state, roles));
      if (operation === 'discover') { await source(); add('inventory', await output('inventory')); }
      if (operation === 'profile') { await source(); await use('inventory', 'inventory'); add('profile', await output('profile')); if (options.rowLimit !== undefined) add('profile-row-limit', options.rowLimit); }
      if (operation === 'term-suggest') { await use('profile', 'profile'); if (state.artifacts.appUsage) await use('appUsage', 'app-usage'); add('suggestions', await output('suggestions')); add('ledger-draft', await output('ledgerDraft')); add('meta-schema', state.profiles.target.schema); }
    } else if (operation === 'mapping-generate') {
      const skeleton = parseJson((await artifact('skeleton', state)).bytes.toString('utf8')).parsed;
      skeleton.source = dbReference('source', state); skeleton.target = dbReference('target', state);
      const prepared = await saveArtifact('prepared-skeleton', Buffer.from(json(skeleton)));
      add('skeleton', await store.resolveArtifact(prepared.file)); await use('confirmedLedger', 'ledger'); await use('inventory', 'inventory'); add('mapping', await output('mapping', 'yaml'));
    } else if (operation === 'plan') {
      await source(false); await use('mapping', 'mapping'); await use('inventory', 'inventory'); add('plan', await output('plan'));
      add('target-schemas', state.profiles.target.schema); if (state.artifacts.review) await use('review', 'review');
    } else if (operation === 'validate') { await use('plan', 'plan'); }
    else {
      await source(); await use('mapping', 'mapping'); await use('inventory', 'inventory'); await use('plan', 'plan');
      add('mode', operation); add('target-schemas', state.profiles.target.schema);
      if (options.ackAdapter !== VENDORS[state.profiles.source.vendor].adapter || options.ackFreeze !== true) fail('ACK_REQUIRED', '선택 adapter와 source freeze의 명시적 확인이 필요합니다.');
      add('ack-adapter', options.ackAdapter); args.push('--ack-source-freeze');
      if (options.ackDriverHash) { if (!SHA.test(options.ackDriverHash)) fail('ACK_REQUIRED', '드라이버 증거 digest를 확인하세요.'); add('ack-source-driver', options.ackDriverHash); }
      if (state.profiles.source.vendor !== 'postgresql' && !options.ackDriverHash) fail('ACK_REQUIRED', '외부 드라이버 증거 digest 확인이 필요합니다.');
      if (operation === 'commit') {
        if (state.profiles.source.vendor !== 'postgresql') fail('COMMIT_UNVERIFIED', '현재 이 adapter는 공개 COMMIT 자격이 없습니다.');
        if (options.confirm !== true || options.targetPhrase !== `COMMIT ${state.profiles.target.database}`) fail('COMMIT_CONFIRMATION_REQUIRED', '대상 이름과 실제 적재 확인 문구가 필요합니다.');
        const binding = inputDigest(state, runtime.jarDigest);
        if (state.readiness.validated?.inputDigest !== binding || state.readiness.dryRun?.inputDigest !== binding) fail('REHEARSAL_REQUIRED', '현재 입력의 validate와 DRY_RUN이 모두 통과해야 합니다.');
        const archive = await regularPath(options.archiveDirectory, { directory: true, outsideGit: true });
        const canonicalBase = await realpath(store.directory);
        const base = process.platform === 'win32' ? canonicalBase.toLowerCase() : canonicalBase;
        const candidate = process.platform === 'win32' ? archive.toLowerCase() : archive;
        if (candidate === base || candidate.startsWith(base + sep) || base.startsWith(candidate + sep)) fail('UNSAFE_ARCHIVE', '작업공간과 분리된 외부 보관 폴더를 지정하세요.');
        add('archive-dir', archive);
        if (options.ackControlSchemaUpgrade === true) args.push('--ack-control-schema-upgrade');
      }
    }
    return { args, env, outputs };
  }
  async function capture(kind, descriptor) {
    const path = await store.resolveArtifact(descriptor.file);
    const bytes = await boundedFile(path);
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!bytes.length) fail('INVALID_ARTIFACT', '완성된 CLI 산출물이 없습니다.');
    for (const secret of credentials.values()) if (secret.length >= 4 && content.includes(secret)) fail('SENSITIVE_CONTENT', '산출물에서 접속 비밀이 탐지되었습니다.');
    if (descriptor.format === 'json') {
      const { parsed, payloadText } = parseJson(content); safeContent(parsed);
      if (kind === 'ledgerDraft') {
        inspectImport('ledger', content);
        if (parsed.entries.some(entry => entry.status !== 'PROPOSED' || (entry.history !== undefined && (!Array.isArray(entry.history) || entry.history.length !== 0)))) fail('ARTIFACT_CONTRACT', '도구가 만든 원장 초안에는 확정·검토 이력을 넣을 수 없습니다.');
      }
      if (ENVELOPES[kind]) {
        const [type, versionKey, version] = ENVELOPES[kind];
        if (parsed.artifactType !== type || parsed[versionKey] !== version || parsed.digestAlgorithm !== 'SHA-256' || !SHA.test(parsed.payloadDigest) || digest(payloadText ?? '') !== parsed.payloadDigest) fail('ARTIFACT_CONTRACT', 'CLI 산출물 판 또는 payload digest가 맞지 않습니다.');
      }
    } else {
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|passwd)\s*:\s*(?!["']?\$\{MW_(?:SOURCE|TARGET)_PASSWORD\})\S+/i.test(content)) fail('SENSITIVE_CONTENT', 'CLI YAML 산출물의 비밀 참조를 확인하세요.');
      if (kind === 'mapping' && (!/^tables:/m.test(content) || !/^ledger:/m.test(content))) fail('ARTIFACT_CONTRACT', '완성된 원장 결속 mapping이 없습니다.');
      if (kind === 'ledgerDraft' && !/^schemaVersion: 2\s*$/m.test(content)) fail('ARTIFACT_CONTRACT', '형식 2 원장 초안이 없습니다.');
    }
    return { ...descriptor, sha256: digest(bytes), bytes: bytes.length };
  }
  async function complete(job, processCode, signal, outputs, beforeFiles, diagnosticCode) {
    const process = active.get(job.id);
    let status = process?.cancelRequested ? 'interrupted' : processCode === 0 && !signal ? 'succeeded' : 'failed';
    let code = status === 'failed' ? (signal === 'spawn-error' ? 'CLI_START_FAILED' : diagnosticCode ?? 'CLI_FAILED') : null;
    const produced = {};
    try {
      if (status === 'succeeded') {
        for (const [kind, descriptor] of Object.entries(outputs)) produced[kind] = await capture(kind, descriptor);
        if (LOADS.has(job.operation)) {
          const state = await store.read(); const plan = await artifact('plan', state);
          const prefix = plan.metadata.file + '.load-';
          const names = (await readdir(dirname(plan.path))).filter(name => name.startsWith(prefix) && name.endsWith('.json') && !beforeFiles.has(name));
          if (names.length !== 1) fail('EXECUTION_EVIDENCE_REQUIRED', '완료된 단일 실행 증거가 필요합니다.');
          const record = await capture('execution', { file: names[0], format: 'json' });
          const execution = parseJson((await boundedFile(await store.resolveArtifact(names[0]))).toString('utf8')).parsed;
          const expectedPlan = parseJson(plan.bytes.toString('utf8')).parsed;
          if (execution.schemaVersion !== 5 || execution.status !== 'PASS' || execution.mode !== (job.operation === 'commit' ? 'COMMIT' : 'DRY_RUN') || execution.planDigest !== expectedPlan.payloadDigest || execution.mappingDigest !== expectedPlan.payload.mappingDigest || execution.targetDigest !== expectedPlan.payload.targetSchemaDigest) fail('EXECUTION_EVIDENCE_INVALID', '실행 증거가 현재 계획·대상·모드와 일치하지 않습니다.');
          produced.execution = record;
        }
      }
    } catch (error) { status = 'failed'; code = error instanceof WorkspaceError ? error.code : 'ARTIFACT_INVALID'; }
    // 시작한 COMMIT 은 프로세스나 증거 수집이 실패해도 앞 chunk 가 커밋됐을 수 있어 결과 불명으로 둔다.
    // DRY_RUN 은 대상 DB·이관 제어 스키마에 쓰지 않으므로 실패를 그대로 failed 로 둔다. migration-tool 근거:
    //   etl.MigrationMode 의 DRY_RUN 정의(변환·카운트만, 쓰기 없음), MigrationWorkflowRunner.fingerprintTarget(대상 연결을
    //   setReadOnly(true) 로 연다)·executeApproved(대상 JDBC·live target 검증·제어 스키마 점검은 mode == COMMIT 일 때만),
    //   etl.EtlExecutor.execute 의 commit 조건(keymap 소유 KeyMapRegistry·MigrationStateStore·requireOriginRole·
    //   initializeCommitState·planTargetSequences 는 commit 일 때만이고, 비어 있는 시퀀스 계획은 synchronizeTargetSequences 가
    //   바로 돌려보낸다)·runTable(대상 쓰기 연결 targetDs.getConnection() 은 commit 일 때만). DRY_RUN 이 남기는 것은 작업공간의
    //   로컬 증거 파일(.load-*.json)뿐이다. CLI 가 바뀌어 DRY_RUN 이 대상에 쓰게 되면 이 판정도 함께 바꾼다.
    if (job.operation === 'commit' && status !== 'succeeded') status = 'unknown';
    await exclusive(async () => {
      const current = await store.read();
      await store.update(current.revision, draft => {
        const saved = draft.jobs.find(entry => entry.id === job.id);
        if (!saved) return;
        Object.assign(saved, { status, errorCode: code, finishedAt: new Date().toISOString() });
        draft.activeJobId = null;
        if (status === 'succeeded') {
          Object.assign(draft.artifacts, produced);
          if (produced.ledgerDraft && !draft.artifacts.ledger && !draft.artifacts.confirmedLedger) {
            draft.artifacts.ledger = { ...produced.ledgerDraft };
            draft.ledger = { reviewSource: 'local-draft' };
          }
          if (job.operation === 'validate') draft.readiness.validated = { inputDigest: job.inputDigest, jobId: job.id };
          if (job.operation === 'dry-run') draft.readiness.dryRun = { inputDigest: job.inputDigest, jobId: job.id };
          if (job.operation === 'commit') draft.readiness.committed = { inputDigest: job.inputDigest, jobId: job.id };
        }
      });
      active.delete(job.id);
    });
  }
  async function startJob(request) {
    return exclusive(async () => {
      exact(request, ['operation', 'requestId', 'revision', 'options'], ['operation', 'requestId', 'revision']);
      if (!OPERATIONS.has(request.operation) || !/^[A-Za-z0-9_-]{8,100}$/.test(request.requestId)) fail('INVALID_JOB', '작업 종류와 요청 식별자를 확인하세요.');
      const options = request.options ?? {};
      exact(options, request.operation === 'profile' ? ['rowLimit'] : request.operation === 'dry-run' ? ['ackAdapter', 'ackFreeze', 'ackDriverHash'] : request.operation === 'commit' ? ['ackAdapter', 'ackFreeze', 'ackDriverHash', 'confirm', 'targetPhrase', 'archiveDirectory', 'ackControlSchemaUpgrade'] : []);
      for (const key of ['ackFreeze', 'confirm', 'ackControlSchemaUpgrade']) if (options[key] !== undefined && typeof options[key] !== 'boolean') fail('INVALID_INPUT', '실행 확인 값은 boolean이어야 합니다.');
      if (options.rowLimit !== undefined && (!Number.isSafeInteger(options.rowLimit) || options.rowLimit < 1 || options.rowLimit > 10_000_000)) fail('INVALID_LIMIT', '표본 행 한도는 1~10000000 정수여야 합니다.');
      const state = await store.read();
      const requestDigest = digest(json({ operation: request.operation, revision: request.revision, options }));
      const prior = state.jobs.find(job => job.requestId === request.requestId);
      if (prior) { if (prior.requestDigest !== requestDigest) fail('REQUEST_ID_REUSED', '같은 요청 ID를 다른 작업에 사용할 수 없습니다.'); return clone(prior); }
      checkRevision(state, request.revision); requireIdle(state);
      // 이전 실행기의 작업 프로세스가 살아 있거나 종료를 판정할 수 없으면 읽기·적재를 가리지 않고 모든 작업을 막는다(ADR-0041 결정 10).
      for (const recovered of state.jobs.filter(lingeringCandidate)) {
        const liveness = previousProcess(recovered.pid);
        if (liveness === 'alive') fail('PREVIOUS_PROCESS_ALIVE', '이전 프로세스가 남아 있습니다. 종료와 산출물을 먼저 확인하세요.');
        if (liveness === 'undetermined') fail('PREVIOUS_PROCESS_ALIVE', '이전 프로세스의 종료 여부를 확인하지 못했습니다.');
      }
      // 결과 불명 작업은 새 적재(DRY_RUN·COMMIT)만 막는다(ADR-0041 결정 10). 읽기 단계는 대상에 쓰지 않아 계속 쓸 수 있다.
      if (LOADS.has(request.operation) && state.jobs.some(unresolvedUnknown)) fail('JOB_RESULT_UNKNOWN', '결과 불명 적재가 있습니다. 실행 증거를 확인하고 확인 기록을 남기기 전에는 새 리허설·적재를 시작할 수 없습니다.');
      if (store.readOnly) fail('WORKSPACE_READ_ONLY', '이 작업공간은 읽기 전용입니다.');
      const runtime = await preflight();
      const prepared = await buildJob(request.operation, options, state, runtime);
      const beforeFiles = new Set(await readdir(join(store.directory, 'artifacts')));
      // 적재는 계획 파일 이름과 시작 전에 있던 그 계획의 증거 파일을 남긴다. 결과가 불명해져도 이 작업이 만든
      // 증거(.load-*.json)만 골라 사람 확인에 대조할 수 있다.
      const loadBinding = LOADS.has(request.operation) ? { planFile: state.artifacts.plan.file, evidenceBefore: [...beforeFiles].filter(name => name.startsWith(`${state.artifacts.plan.file}.load-`)).sort() } : {};
      const job = { id: randomUUID(), requestId: request.requestId, requestDigest, operation: request.operation, status: 'starting', inputDigest: inputDigest(state, runtime.jarDigest), jarDigest: runtime.jarDigest, inputRevision: state.inputRevision ?? 0, startedAt: new Date().toISOString(), capability: LOADS.has(request.operation) ? 'no-safe-pause' : 'cancel-after-process-close', ...loadBinding };
      await store.update(state.revision, draft => {
        draft.jobs.push(job); draft.activeJobId = job.id;
        retire(draft, job.operation);
        if (!['validate', 'dry-run', 'commit'].includes(job.operation)) draft.readiness = {};
        if (job.operation === 'validate') delete draft.readiness.validated;
        if (job.operation === 'dry-run') delete draft.readiness.dryRun;
        delete draft.readiness.committed;
      });
      let child;
      try { child = spawnImpl(runtime.javaPath, prepared.args, { cwd: store.directory, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: prepared.env }); }
      catch { const current = await store.read(); await store.update(current.revision, draft => { const saved = draft.jobs.find(item => item.id === job.id); saved.status = 'failed'; saved.errorCode = 'CLI_START_FAILED'; draft.activeJobId = null; }); return { ...job, status: 'failed', errorCode: 'CLI_START_FAILED' }; }
      active.set(job.id, { child, cancelRequested: false });
      // Only the CLI's fixed diagnostic code crosses the process boundary. Never
      // persist or return raw SQL, paths, credentials, or driver messages.
      let diagnosticCode;
      for (const stream of [child.stdout, child.stderr]) {
        let tail = '';
        stream?.on('data', chunk => {
          const text = tail + chunk.toString('utf8');
          diagnosticCode ??= text.match(DIAGNOSTIC)?.[1];
          tail = text.slice(-96);
        });
        stream?.once('end', () => { tail = ''; });
      }
      let done = false;
      const finish = (code, signal) => {
        if (done) return; done = true;
        complete(job, code, signal, prepared.outputs, beforeFiles, diagnosticCode).catch(error => {
          const runtimeJob = active.get(job.id);
          if (runtimeJob) runtimeJob.completionError = error instanceof WorkspaceError ? error.code : 'COMPLETION_RECORD_FAILED';
        });
      };
      let processError = false;
      child.once('error', () => { processError = true; });
      child.once('close', (code, signal) => finish(code, processError ? 'spawn-error' : signal));
      const current = await store.read();
      await store.update(current.revision, draft => { const saved = draft.jobs.find(item => item.id === job.id); saved.status = 'running'; if (Number.isSafeInteger(child.pid)) saved.pid = child.pid; });
      return { ...job, status: 'running' };
    });
  }
  async function cancelJob(id) {
    return exclusive(async () => {
      text(id, 100); const state = await store.read(); const job = state.jobs.find(item => item.id === id);
      if (!job) fail('JOB_NOT_FOUND', '작업을 찾을 수 없습니다.');
      if (LOADS.has(job.operation)) fail('UNSUPPORTED_SAFE_CANCEL', '현재 CLI에는 적재의 안전 일시정지 명령이 없습니다. 실행·복구 상태를 확인하세요.');
      const running = active.get(id);
      if (!running) fail('JOB_NOT_RUNNING', '이 실행기가 관리하는 실행 중 작업이 아닙니다.');
      await store.update(state.revision, draft => { draft.jobs.find(item => item.id === id).status = 'cancelling'; });
      running.cancelRequested = true;
      running.child.kill('SIGTERM');
      return { id, status: 'cancelling' };
    });
  }
  // 결과 불명 적재가 만든 실행 증거(.load-*.json)를 찾아 digest 와 고정 요약만 돌려준다. 시작 전에 있던 증거는 뺀다.
  async function loadEvidence(job) {
    if (!LOADS.has(job.operation) || typeof job.planFile !== 'string') return { located: false, files: [] };
    const prefix = `${job.planFile}.load-`, before = new Set(Array.isArray(job.evidenceBefore) ? job.evidenceBefore : []);
    const names = (await readdir(join(store.directory, 'artifacts'))).filter(name => name.startsWith(prefix) && name.endsWith('.json') && !before.has(name)).sort();
    if (names.length > EVIDENCE_LIMIT) fail('EXECUTION_EVIDENCE_AMBIGUOUS', '이 작업에 대조할 실행 증거가 너무 많습니다. 작업공간의 증거 파일을 직접 확인하세요.');
    const files = [];
    for (const name of names) {
      const bytes = await boundedFile(await store.resolveArtifact(name));
      const content = bytes.toString('utf8');
      for (const secret of credentials.values()) if (secret.length >= 4 && content.includes(secret)) fail('SENSITIVE_CONTENT', '실행 증거에서 접속 비밀이 탐지되었습니다.');
      let record;
      try { record = parseJson(content).parsed; } catch { record = null; }
      files.push({ file: name, sha256: digest(bytes), bytes: bytes.length, ...evidenceSummary(record) });
    }
    return { located: true, files };
  }
  async function jobEvidence(id) {
    return exclusive(async () => {
      text(id, 100); const state = await store.read(); const job = state.jobs.find(item => item.id === id);
      if (!job) fail('JOB_NOT_FOUND', '작업을 찾을 수 없습니다.');
      if (job.status !== 'unknown') fail('JOB_NOT_UNKNOWN', '결과 불명 작업의 실행 증거만 대조합니다.');
      const evidence = await loadEvidence(job);
      return { id: job.id, operation: job.operation, status: job.status, errorCode: job.errorCode ?? null, startedAt: job.startedAt ?? null, finishedAt: job.finishedAt ?? null, acknowledgement: job.acknowledgement ?? null, evidenceLocated: evidence.located, evidence: evidence.files };
    });
  }
  // 사람이 실행 증거와 대상 상태를 확인했다는 기록이다. 결과를 성공으로 바꾸지도, 적재를 이어 가지도 않는다.
  // 앞서 커밋된 chunk 는 되돌아가지 않으며 전체 복구는 기관 백업·복구 계획을 따른다. 기록 뒤에야 새 적재를 받는다.
  async function acknowledgeJob(id, input) {
    return exclusive(async () => {
      text(id, 100);
      exact(input, ['revision', 'note'], ['revision', 'note']);
      const note = typeof input.note === 'string' ? input.note.trim() : '';
      if (!note || note.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(note)) fail('INVALID_INPUT', '확인 메모를 1~1000자로 적으세요.');
      for (const secret of credentials.values()) if (secret.length >= 4 && note.includes(secret)) fail('SENSITIVE_CONTENT', '확인 메모에 접속 비밀을 적을 수 없습니다.');
      const state = await store.read(); checkRevision(state, input.revision); requireIdle(state);
      if (store.readOnly) fail('WORKSPACE_READ_ONLY', '이 작업공간은 읽기 전용입니다.');
      const job = state.jobs.find(item => item.id === id);
      if (!job) fail('JOB_NOT_FOUND', '작업을 찾을 수 없습니다.');
      if (job.status !== 'unknown') fail('JOB_NOT_UNKNOWN', '결과 불명 작업만 확인 기록을 남길 수 있습니다.');
      if (job.acknowledgement) fail('JOB_ALREADY_ACKNOWLEDGED', '이미 확인 기록을 남긴 작업입니다.');
      // 재시작으로 끊긴 적재의 Java 프로세스가 아직 쓰는 중이면 STARTED 증거는 마지막 상태가 아니다. 그 프로세스가 끝난 것을
      // 확인하기 전에는 기록을 받지 않는다 — 기록 뒤의 새 DRY_RUN→COMMIT 이 고아 COMMIT 과 함께 대상에 쓰지 않게 한다.
      if (Number.isSafeInteger(job.pid)) {
        const liveness = previousProcess(job.pid);
        if (liveness === 'alive') fail('PREVIOUS_PROCESS_ALIVE', '이 작업의 이전 프로세스가 아직 남아 있어 확인 기록을 남길 수 없습니다. 종료와 산출물을 먼저 확인하세요.');
        if (liveness === 'undetermined') fail('PREVIOUS_PROCESS_ALIVE', '이 작업의 이전 프로세스 종료 여부를 확인하지 못해 확인 기록을 남길 수 없습니다.');
      }
      const evidence = await loadEvidence(job);
      const acknowledgement = { at: new Date().toISOString(), note, evidenceLocated: evidence.located, evidence: evidence.files };
      return publicState(await store.update(input.revision, draft => {
        draft.jobs.find(item => item.id === id).acknowledgement = acknowledgement;
        // 확인 기록은 자동 재개가 아니다. 결과 불명 COMMIT 뒤의 다음 COMMIT 은 새 리허설을 다시 통과해야 한다.
        if (job.operation === 'commit') { delete draft.readiness.dryRun; delete draft.readiness.committed; }
      }));
    });
  }
  function publicState(state) {
    const result = clone(state);
    for (const job of result.jobs) if (active.get(job.id)?.completionError) { job.status = 'unknown'; job.errorCode = active.get(job.id).completionError; }
    for (const [role, profile] of Object.entries(result.profiles)) profile.credentialReady = credentials.has(role);
    result.capabilities = { operations: [...OPERATIONS], safeLoadPause: false, importFormats: ['json'], targetVendor: 'postgresql', confirmedLedger: 'institution-git-import', supportedVendors: Object.keys(VENDORS) };
    const common = [];
    if (store.readOnly) common.push('WORKSPACE_READ_ONLY');
    if (result.activeJobId) common.push('JOB_ACTIVE');
    // 재시작으로 복구한 interrupted·확인 기록 없는 unknown 작업의 프로세스가 살아 있거나 판정할 수 없으면 모든 단계를 막는다.
    const lingering = result.jobs.some(job => lingeringCandidate(job) && previousProcess(job.pid) !== 'exited');
    if (lingering) common.push('PREVIOUS_PROCESS_ALIVE');
    // 확인 기록이 없는 결과 불명 작업은 새 적재(DRY_RUN·COMMIT)만 막는다.
    const unknown = result.jobs.some(unresolvedUnknown);
    const currentReadiness = key => {
      const marker = state.readiness[key];
      const job = marker && state.jobs.find(item => item.id === marker.jobId);
      return job?.status === 'succeeded' && job.inputRevision === state.inputRevision && marker.inputDigest === job.inputDigest
        && (!job.jarDigest || inputDigest(state, job.jarDigest) === marker.inputDigest);
    };
    result.operationReadiness = Object.fromEntries([...OPERATIONS].map(operation => {
      const blockers = [...common];
      if (unknown && LOADS.has(operation)) blockers.push('JOB_RESULT_UNKNOWN');
      const profileRoles = operation === 'mapping-generate' ? ['source', 'target'] : JOB_ROLES[operation];
      for (const role of profileRoles) {
        if (!state.profiles[role]) blockers.push(`${role.toUpperCase()}_PROFILE_REQUIRED`);
        else if (JOB_ROLES[operation].includes(role) && !credentials.has(role)) blockers.push(`${role.toUpperCase()}_CREDENTIALS_REQUIRED`);
      }
      if (['discover', 'profile', 'dry-run', 'commit'].includes(operation) && state.profiles.source && state.profiles.source.vendor !== 'postgresql' && !state.profiles.source.driverJar) blockers.push('SOURCE_DRIVER_REQUIRED');
      if (operation === 'app-scan' && !state.inputs.sourceRoot) blockers.push('SOURCE_REQUIRED');
      for (const kind of REQUIRED_ARTIFACTS[operation] ?? []) if (!state.artifacts[kind]) blockers.push(ARTIFACT_BLOCKERS[kind]);
      if (operation === 'commit') {
        if (state.profiles.source && state.profiles.source.vendor !== 'postgresql') blockers.push('COMMIT_UNVERIFIED');
        if (!currentReadiness('validated')) blockers.push('VALIDATION_REQUIRED');
        if (!currentReadiness('dryRun')) blockers.push('DRY_RUN_REQUIRED');
      }
      return [operation, { ready: blockers.length === 0, blockers }];
    }));
    return result;
  }
  return { configureProfile, configureInputs, importArtifact, saveLedger, startJob, cancelJob, jobEvidence, acknowledgeJob, preflight,
    state: async () => publicState(await store.read()),
    getArtifact: async kind => { if (!['inventory', 'profile', 'appUsage', 'suggestions', 'ledgerDraft', 'ledger', 'confirmedLedger', 'mapping', 'skeleton', 'standardColumns', 'plan', 'review', 'execution'].includes(kind)) fail('INVALID_ARTIFACT_KIND', '지원하는 산출물 종류가 아닙니다.'); const found = await artifact(kind); return { kind, ...found.metadata, content: found.bytes.toString('utf8') }; },
    close: async () => { if (active.size) fail('JOB_ACTIVE', '실행 중 작업이 있어 종료할 수 없습니다.'); credentials.clear(); await store.close(); },
  };
}
