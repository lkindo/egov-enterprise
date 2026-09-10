import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { hasPageResponse } from '../test/load-tests/response-contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.slice(2).some(arg => arg !== '--recovery-only')) throw new Error('Unknown isolated drill option');
const recoveryOnly = process.argv.includes('--recovery-only');
const output = path.join(root, 'build/readiness-followups');
mkdirSync(output, { recursive: true });
const classpath = readFileSync(path.join(output, 'runtime-classpath.txt'), 'utf8').trim();
const username = process.env.TEST_USERNAME;
const password = process.env.TEST_PASSWORD;
if (!username || !password) throw new Error('Supply disposable seed credentials through TEST_USERNAME/TEST_PASSWORD');
const name = `egov-readiness-${randomBytes(6).toString('hex')}`;
const label = 'readiness-followups';
const dbPassword = randomBytes(24).toString('hex');
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const k6 = process.env.K6_BINARY || 'k6';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let api;
let dbCreated = false;
let dbPaused = false;
let locker;

function docker(args, extra = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, ...extra });
}
function assertOwned() {
  const actual = docker(['inspect', '--format', '{{index .Config.Labels "egov.task"}}', name]).trim();
  if (actual !== label) throw new Error('Disposable database ownership mismatch');
}
function sql(statement) {
  assertOwned();
  return docker(['exec', name, 'psql', '-U', 'drill', '-d', 'drill', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement]).trim();
}
async function waitUntil(predicate, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { /* retry transient startup/recovery errors */ }
    await pause(250);
  }
  throw new Error('Disposable runtime readiness deadline exceeded');
}
async function assertFreePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('Disposable API port is already occupied')));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
async function stopApi() {
  if (!api || api.exitCode !== null) return;
  const ended = new Promise(resolve => api.once('exit', resolve));
  api.kill();
  await Promise.race([ended, pause(10000)]);
  if (api.exitCode === null) { api.kill('SIGKILL'); await ended; }
}
function runK6(scenario) {
  return new Promise((resolve, reject) => {
    const log = openSync(path.join(output, `mixed-${scenario}.log`), 'w');
    const child = spawn(k6, ['run', 'test/load-tests/scenarios/mixed-workload.js'], {
      cwd: root, windowsHide: true,
      env: { ...process.env, BASE_URL: 'http://127.0.0.1:8080', K6_SCENARIO: scenario,
        NO_PROXY: '127.0.0.1,localhost',
        K6_SUMMARY_PATH: `build/readiness-followups/mixed-${scenario}.json` },
      stdio: ['ignore', log, log],
    });
    closeSync(log);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Mixed workload threshold failed')));
  });
}

try {
  await assertFreePort(8080);
  docker(['run', '-d', '--rm', '--name', name, '--label', `egov.task=${label}`, '-p', '127.0.0.1::5432',
    '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=drill', '-e', 'POSTGRES_DB=drill', 'postgres:17-alpine'],
  { env: { ...process.env, POSTGRES_PASSWORD: dbPassword } });
  dbCreated = true;
  await waitUntil(() => { docker(['exec', name, 'pg_isready', '-U', 'drill', '-d', 'drill']); return true; });
  const port = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', name]))['5432/tcp'][0].HostPort;
  const args = path.join(output, 'readiness-java.args');
  writeFileSync(args, `-cp\n"${classpath.replaceAll('\\', '/')}"\nnuri.ApiServerApplication\n`);
  const inheritedEnvironment = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !/^(SPRING_|DB_|NURI_|GLOBALS_|JWT_|ALGORITHM_|MAIL_|SMS_|MANAGEMENT_)/i.test(key)));
  const environment = {
    ...inheritedEnvironment, DB_URL: `jdbc:postgresql://127.0.0.1:${port}/drill?socketTimeout=3&connectTimeout=3&ApplicationName=readiness-api`,
    DB_USERNAME: 'drill', DB_PASSWORD: dbPassword, SPRING_PROFILES_ACTIVE: 'e2e', SERVER_ADDRESS: '127.0.0.1', SERVER_PORT: '8080',
    ALGORITHM_KEY: randomBytes(24).toString('hex'), JWT_SECRET: randomBytes(64).toString('base64'),
    NURI_LOG_RETENTION_ENABLED: 'false', NURI_ATTACHMENT_INTEGRITY_ENABLED: 'false',
    GLOBALS_FILE_STOREPATH: path.join(output, 'runtime-uploads'),
    SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT: '1000',
  };
  async function startApi(poolSize) {
    const log = openSync(path.join(output, `readiness-api-pool-${poolSize}.log`), 'w');
    api = spawn(java, [`@${args}`], { cwd: root, windowsHide: true,
      env: { ...environment, SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE: String(poolSize), SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE: String(poolSize) },
      stdio: ['ignore', log, log] });
    closeSync(log);
    await waitUntil(async () => {
      if (api.exitCode !== null) throw new Error('Disposable API exited');
      return (await fetch('http://127.0.0.1:8080/actuator/health', { signal: AbortSignal.timeout(2000) })).ok;
    }, 120000);
  }
  if (!recoveryOnly) {
    await startApi(10);
    console.log('Disposable API ready; running mixed smoke workload');
    await runK6('smoke');
    console.log('Mixed smoke passed; running 100 VU workload');
    await runK6('users-100');
    await stopApi();
  }
  console.log('Verifying pool exhaustion and database recovery');
  await startApi(2);
  const leftovers = Number(sql("SELECT count(*) FROM tb_schdl_info WHERE schdl_nm LIKE 'k6-%'"));
  if (leftovers !== 0) throw new Error('Synthetic schedule cleanup did not complete');
  const login = await fetch('http://127.0.0.1:8080/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: username, password }), signal: AbortSignal.timeout(6000),
  });
  const token = (await login.json())?.data?.accessToken;
  if (!login.ok || typeof token !== 'string') throw new Error('Disposable authentication failed');
  async function requestUsers() {
    const started = Date.now();
    try {
      const response = await fetch('http://127.0.0.1:8080/api/v1/admin/system/users?page=1&size=10', {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
      });
      // Persist only fixed diagnostic categories, never raw response headers/content.
      const status = response.status === 200 ? 200 : response.status === 503 ? 503 : response.status === 401 ? 401 : 0;
      return { status, durationMs: Date.now() - started,
        retryAfterFiveSeconds: response.headers.get('Retry-After') === '5', validPage: hasPageResponse(await response.text()) };
    } catch { return { status: 0, durationMs: Date.now() - started }; }
  }
  const control = await requestUsers();
  if (control.status !== 200 || !control.validPage) throw new Error('Recovery control request failed');
  assertOwned();
  locker = spawn('docker', ['exec', '-i', name, 'psql', '-U', 'drill', '-d', 'drill', '-At', '-v', 'ON_ERROR_STOP=1'],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let lockReady = false;
  locker.stdout.on('data', chunk => { if (chunk.toString().includes('READINESS_LOCKED')) lockReady = true; });
  locker.stdin.write("BEGIN; LOCK TABLE tb_user_info IN ACCESS EXCLUSIVE MODE; SELECT 'READINESS_LOCKED';\n");
  await waitUntil(() => lockReady, 10000);
  const blocked = [requestUsers(), requestUsers()];
  await waitUntil(() => Number(sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='readiness-api' AND wait_event_type='Lock'")) >= 2, 5000);
  const exhausted = await requestUsers();
  if (exhausted.status !== 503 || !exhausted.retryAfterFiveSeconds || exhausted.durationMs > 6000) throw new Error('Pool exhaustion did not return retryable 503 within the HTTP budget');
  locker.stdin.end('ROLLBACK;\n');
  await new Promise(resolve => locker.once('exit', resolve));
  locker = null;
  await Promise.all(blocked);
  await waitUntil(async () => (await requestUsers()).status === 200, 15000);
  const poolRecovered = await requestUsers();
  assertOwned(); docker(['pause', name]); dbPaused = true;
  const unavailable = await requestUsers();
  assertOwned(); docker(['unpause', name]); dbPaused = false;
  if (unavailable.status !== 503 || !unavailable.retryAfterFiveSeconds || unavailable.durationMs > 9000) throw new Error('Database interruption did not return retryable 503 within the client budget');
  await waitUntil(async () => (await requestUsers()).status === 200, 20000);
  const databaseRecovered = await requestUsers();
  if (!poolRecovered.validPage || !databaseRecovered.validPage) throw new Error('Recovered response contract failed');
  writeFileSync(path.join(output, 'resilience-summary.json'), JSON.stringify({
    isolated: true, mixedWorkloadRan: !recoveryOnly, poolSize: 2, exhausted, poolRecovered, unavailable, databaseRecovered, syntheticSchedulesRemaining: leftovers,
  }, null, 2));
  console.log('Pool and database recovery checks passed; synthetic schedules remaining: 0');
} catch {
  console.error('Isolated readiness drill failed; inspect bounded local evidence files.');
  writeFileSync(path.join(output, 'readiness-failure.json'), JSON.stringify({ outcome: 'FAILED' }));
  process.exitCode = 1;
} finally {
  if (locker) { locker.stdin.end('ROLLBACK;\n'); locker.kill(); }
  if (dbCreated) {
    if (dbPaused) { assertOwned(); docker(['unpause', name]); }
    await stopApi();
    assertOwned(); docker(['stop', name]);
  }
}
