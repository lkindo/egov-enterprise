// [DEC-OPS-413] 무거운 검증 대기열의 판정(순수)과 실제 프로세스 동작(Windows). 비Windows 에서는 대기열이 direct 로 그대로 도는지 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV_LOCK, ENV_SWITCH, ENV_TEST_ACTIVE, OWNER_LABELS, cmdLine, dockerOutcome, entryRoute, exitCodeFor, orderedWaiters, parseLockEnv,
  runTreeAlive, shouldAttempt, startDecision } from './heavy-run-queue.mjs';
import { lockPipeName, parseWaiterPipe, repositoryHash, waiterPipeName, waitingSupervisorPids } from './heavy-run-pipes.mjs';
import { heavyProcessKinds, waitingExclusions } from './verification-record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const QUEUE = path.join(HERE, 'heavy-run-queue.mjs');
const WINDOWS = process.platform === 'win32';
const HASH = 'a'.repeat(16);
const TOKEN = 'b'.repeat(32);

// ---------------------------------------------------------------------------------------------------------------------
// 순수 판정

test('lock tokens parse only as <16 hex>:<32 hex>', () => {
  assert.deepEqual(parseLockEnv(`${HASH}:${TOKEN}`), { hash: HASH, token: TOKEN });
  for (const value of [undefined, '', `${HASH}`, `${HASH}:short`, `${HASH.toUpperCase()}:${TOKEN}`, ` ${HASH}:${TOKEN}`]) assert.equal(parseLockEnv(value), null, value);
});

test('entry route: direct off Windows, in tests, when switched off or outside Git; queue without a same-repository token', () => {
  const env = (extra = {}) => ({ ...extra });
  assert.deepEqual(entryRoute({ platform: 'linux', env: env(), hash: HASH }), { route: 'direct', reason: 'platform' });
  assert.deepEqual(entryRoute({ platform: 'win32', env: env({ NODE_TEST_CONTEXT: 'child' }), hash: HASH }), { route: 'direct', reason: 'test' });
  assert.equal(entryRoute({ platform: 'win32', env: env({ NODE_TEST_CONTEXT: 'child', [ENV_TEST_ACTIVE]: '1' }), hash: HASH }).route, 'queue');
  assert.deepEqual(entryRoute({ platform: 'win32', env: env({ [ENV_SWITCH]: 'off' }), hash: HASH }), { route: 'direct', reason: 'off' });
  assert.deepEqual(entryRoute({ platform: 'win32', env: env(), hash: null }), { route: 'direct', reason: 'no-git' });
  assert.deepEqual(entryRoute({ platform: 'win32', env: env(), hash: HASH }), { route: 'queue', reason: 'no-token' });
  assert.deepEqual(entryRoute({ platform: 'win32', env: env({ [ENV_LOCK]: `${'c'.repeat(16)}:${TOKEN}` }), hash: HASH }), { route: 'queue', reason: 'other-repository' });
  // 같은 저장소 토큰은 보유자의 확인을 거친다 — 확인 실패는 classify 가 fail 로 돌려주고 다시 줄을 서지 않는다.
  assert.deepEqual(entryRoute({ platform: 'win32', env: env({ [ENV_LOCK]: `${HASH}:${TOKEN}` }), hash: HASH }), { route: 'check', token: TOKEN });
  assert.equal(entryRoute({ platform: 'win32', env: env({ [ENV_LOCK]: 'garbage' }), hash: HASH }).route, 'queue');
});

test('waiter pipes order by start time then PID; first in line tries only while the lock is free', () => {
  const names = [waiterPipeName(HASH, 2000, 7), waiterPipeName(HASH, 1000, 9), waiterPipeName(HASH, 1000, 3), waiterPipeName('c'.repeat(16), 1, 1), 'unrelated'];
  assert.deepEqual(orderedWaiters(names, HASH).map((waiter) => [waiter.startedMs, waiter.pid]), [[1000, 3], [1000, 9], [2000, 7]]);
  assert.deepEqual(parseWaiterPipe(waiterPipeName(HASH, 42, 5)), { hash: HASH, startedMs: 42, pid: 5, name: waiterPipeName(HASH, 42, 5) });
  assert.equal(parseWaiterPipe(`${lockPipeName(HASH)}-w-1-1`), null);
  assert.deepEqual([...waitingSupervisorPids(names)].sort((a, b) => a - b), [1, 3, 7, 9]);
  const first = waiterPipeName(HASH, 1000, 3);
  const second = waiterPipeName(HASH, 1000, 9);
  assert.equal(shouldAttempt({ names, hash: HASH, selfName: first, freeSinceMs: 0, nowMs: 1 }), true);
  assert.equal(shouldAttempt({ names: [...names, lockPipeName(HASH)], hash: HASH, selfName: first, freeSinceMs: null, nowMs: 1 }), false, 'a held lock is never tried');
  assert.equal(shouldAttempt({ names, hash: HASH, selfName: second, freeSinceMs: 0, nowMs: 29_999 }), false, 'later waiters wait for the first');
  assert.equal(shouldAttempt({ names, hash: HASH, selfName: second, freeSinceMs: 0, nowMs: 30_000 }), true, 'a first waiter that never takes a free lock is passed');
});

test('exit codes: the status, 128 + signal number, 1 otherwise', () => {
  assert.equal(exitCodeFor({ status: 7 }), 7);
  assert.equal(exitCodeFor({ status: 0 }), 0);
  assert.equal(exitCodeFor({ status: null, signal: 'SIGINT' }), 130);
  assert.equal(exitCodeFor({ status: null, signal: 'SIGTERM' }), 143);
  assert.equal(exitCodeFor({ status: null, signal: 'SIGBREAK' }), 149);
  assert.equal(exitCodeFor({ status: null, signal: null, error: new Error('x') }), 1);
});

test('start decision: anything visible waits, anything unknown never starts unless a person confirmed that reason', () => {
  const none = { visible: [], running: [], unknown: [] };
  assert.equal(startDecision(none), 'start');
  assert.equal(startDecision({ ...none, visible: ['vitest'] }), 'busy');
  assert.equal(startDecision({ ...none, running: ['egov.heavy-run=x'] }), 'busy');
  assert.equal(startDecision({ ...none, visible: ['vitest'], unknown: [{ code: 'process-list-failed' }] }, new Set(['process-list-failed'])), 'busy', 'confirmation never overrides a visible run');
  for (const code of ['process-list-failed', 'process-list-blind', 'previous-run-unverified', 'marker-unreadable', 'docker-unavailable']) {
    assert.equal(startDecision({ ...none, unknown: [{ code }] }), 'unknown', code);
    assert.equal(startDecision({ ...none, unknown: [{ code }] }, new Set([code])), 'start', code);
  }
});

test('docker answers: running ids wait, a missing CLI or a stopped engine runs nothing, any other failure is unknown', () => {
  assert.deepEqual(dockerOutcome({ stdout: 'abc\ndef\n' }), { running: ['abc', 'def'] });
  assert.deepEqual(dockerOutcome({ stdout: '\n' }), { none: true });
  assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('x'), { code: 'ENOENT' }) }), { none: true, reason: 'docker-missing' });
  for (const stderr of ['Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?',
    'error during connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.47/containers/json": open //./pipe/docker_engine: The system cannot find the file specified.']) {
    assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('x'), { code: 1 }), stderr }), { none: true, reason: 'engine-down' }, stderr);
  }
  assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('timeout'), { killed: true, signal: 'SIGTERM' }), stderr: '' }), { unknown: true });
  assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('x'), { code: 1 }), stderr: 'permission denied while trying to connect' }), { unknown: true });
  // 2026-11-10 Codex 43차: 엔진이 도는데 연결만 거부된 모양을 '엔진 꺼짐'으로 읽으면 실행 중인 컨테이너를 놓친다.
  for (const stderr of ['error during connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.47/containers/json": open //./pipe/docker_engine: Access is denied.',
    'error during connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/_ping": context deadline exceeded (Client.Timeout exceeded while awaiting headers) timed out',
    'error during connect: This error may indicate that the docker daemon is not running.', 'Cannot connect to the Docker daemon at tcp://10.0.0.1:2375. Is the docker daemon running?']) {
    assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('x'), { code: 1 }), stderr }), { unknown: true }, stderr);
  }
  assert.deepEqual(dockerOutcome({ error: Object.assign(new Error('x'), { code: 1 }),
    stderr: 'error during connect: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.' }), { none: true, reason: 'engine-down' });
  // 소유 라벨은 단독 실행 대상이 컨테이너에 이미 붙이는 표식이다 — 생성 코드(벤더 증거 입력)를 바꾸지 않고 남은 컨테이너를 찾는다.
  assert.deepEqual([...OWNER_LABELS], ['egov.task', 'egov.project-composer', 'egov.reusable-verification', 'egov.composer.vendor']);
  for (const [file, label] of [['run-isolated-e2e.mjs', "'egov.task=isolated-e2e'"], ['project-composer-postgres.mjs', "'egov.project-composer'"],
    ['verify-reusable-base.mjs', "'egov.reusable-verification'"], ['project-composer-vendor-engine.mjs', "'egov.composer.vendor'"]]) {
    assert.ok(fs.readFileSync(path.join(HERE, file), 'utf8').includes(label), `${file} still labels its containers with ${label}`);
  }
});

test('run tree: a process the child started is alive until it ends; older PIDs and daemons are not the run; no start times is unknown', () => {
  const at = 1_000_000;
  const child = 100;
  const grandchild = { pid: 101, ppid: child, name: 'java.exe', command: 'java org.gradle.wrapper.GradleWrapperMain test', started: at + 500 };
  const great = { pid: 105, ppid: 101, name: 'cmd.exe', command: 'cmd /c x', started: at + 900 };
  const reused = { pid: 102, ppid: child, name: 'svchost.exe', command: 'svchost', started: at - 60_000 };
  const daemon = { pid: 103, ppid: child, name: 'java.exe', command: 'java -cp x org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.14', started: at + 700 };
  const worker = { pid: 104, ppid: 103, name: 'java.exe', command: 'java GradleWorkerMain', started: at + 800 };
  const other = { pid: 200, ppid: 1, name: 'node.exe', command: 'node x', started: at + 100 };
  assert.deepEqual(runTreeAlive([grandchild, great, reused, daemon, worker, other], child, at).alive.map((entry) => entry.pid), [101, 105]);
  assert.deepEqual(runTreeAlive([reused, daemon, worker, other], child, at), { gone: true });
  assert.deepEqual(runTreeAlive([{ ...grandchild, started: undefined }, other], child, at), { unknown: true });
  assert.deepEqual(runTreeAlive([], child, at), { unknown: true });
});

test('cmd.exe lines quote what cmd splits and refuse what it would expand', () => {
  assert.equal(cmdLine('C:\\p q\\gradlew.bat', [':api-server:test', '--tests', '*Foo*', 'a&b']), '""C:\\p q\\gradlew.bat" :api-server:test --tests *Foo* "a&b""');
  for (const bad of ['%PATH%', '!x!', 'say "hi"']) assert.throws(() => cmdLine('x.bat', [bad]), /cmd\.exe/);
});

// 실행 기록의 대기자 제외: 대기 감독 하나와 그 직속 진입점 부모만 빠진다.
const processes = ({ waiting = [] } = {}) => ({ waiting: new Set(waiting) });
test('recorder leaves out a waiting supervisor and its direct entry parent, nothing above or beside them', () => {
  const recorder = { pid: 11, ppid: 1, name: 'node.exe', command: 'node scripts/verify.mjs post-push' };
  const outer = { pid: 20, ppid: 1, name: 'node.exe', command: '"C:\\node.exe" C:\\r\\scripts\\verify.mjs push' };
  const waiter = { pid: 21, ppid: 20, name: 'node.exe', command: '"C:\\node.exe" C:\\r\\scripts\\heavy-run-queue.mjs run --kind verify -- "C:\\node.exe" C:\\r\\scripts\\verify.mjs push' };
  const list = [recorder, outer, waiter];
  assert.deepEqual(heavyProcessKinds(list, 11), ['verify'], 'without the waiter pipe both look like a verify run');
  assert.deepEqual(heavyProcessKinds(list, 11, processes({ waiting: [21] }).waiting), []);
  assert.deepEqual([...waitingExclusions(list, new Set([21]))].sort(), [20, 21]);
  // PID 재사용: 대기 파이프의 PID 라도 감독 모양이 아니면 빼지 않는다.
  const reused = { ...waiter, command: 'node C:\\r\\node_modules\\vitest\\vitest.mjs run' };
  assert.deepEqual(heavyProcessKinds([recorder, outer, reused], 11, new Set([21])), ['verify', 'vitest']);
  // 대기자를 띄운 node --test 는 진입점 모양이 아니라 그대로 보인다.
  const runner = { pid: 30, ppid: 1, name: 'node.exe', command: 'node --test scripts/x.test.mjs' };
  const spawned = { ...outer, pid: 31, ppid: 30 };
  const nested = { ...waiter, pid: 32, ppid: 31 };
  assert.deepEqual(heavyProcessKinds([recorder, runner, spawned, nested], 11, new Set([32])), ['node-test']);
  // 다른 저장소 토큰으로 줄을 선 안쪽 진입점: 그 위의 실행 중인 바깥 실행은 조부모 이상이라 빠지지 않는다.
  const holder = { pid: 50, ppid: 1, name: 'node.exe', command: 'node C:\\a\\scripts\\heavy-run-queue.mjs run --kind verify -- node C:\\a\\scripts\\verify.mjs push' };
  const inner = { pid: 51, ppid: 50, name: 'node.exe', command: 'node C:\\a\\scripts\\verify.mjs push' };
  const otherEntry = { pid: 52, ppid: 51, name: 'node.exe', command: 'node C:\\b\\scripts\\verify.mjs docs' };
  const otherWaiter = { pid: 53, ppid: 52, name: 'node.exe', command: 'node C:\\b\\scripts\\heavy-run-queue.mjs run --kind verify -- node C:\\b\\scripts\\verify.mjs docs' };
  assert.deepEqual([...waitingExclusions([recorder, holder, inner, otherEntry, otherWaiter], new Set([53]))].sort(), [52, 53]);
  assert.deepEqual(heavyProcessKinds([recorder, holder, inner, otherEntry, otherWaiter], 11, new Set([53])), ['verify']);
  // 대기 중인 pre-push: 훅을 실행한 sh 가 감독의 직속 부모다(실측: exec 한 sh 가 그대로 남는다).
  const hook = { pid: 60, ppid: 1, name: 'sh.exe', command: 'sh .githooks/pre-push origin https://example.invalid/r.git' };
  const hookWaiter = { pid: 61, ppid: 60, name: 'node.exe', command: '"C:\\node.exe" scripts/heavy-run-queue.mjs run --kind pre-push -- sh .githooks/pre-push origin https://example.invalid/r.git' };
  assert.deepEqual(heavyProcessKinds([recorder, hook, hookWaiter], 11), ['pre-push']);
  assert.deepEqual(heavyProcessKinds([recorder, hook, hookWaiter], 11, new Set([61])), []);
  assert.deepEqual([...waitingExclusions([recorder, hook, hookWaiter], new Set())], []);
});

test('repository hashes ignore case, separators and a trailing slash', () => {
  assert.equal(repositoryHash('D:\\Project\\Repo\\.git'), repositoryHash('d:/project/repo/.git/'));
  assert.match(repositoryHash('x'), /^[0-9a-f]{16}$/);
  assert.notEqual(repositoryHash('d:/a/.git'), repositoryHash('d:/b/.git'));
});

// ---------------------------------------------------------------------------------------------------------------------
// 실제 프로세스(Windows) — 시험용 임시 저장소마다 잠금이 따로라 이 checkout 의 잠금과 섞이지 않는다.

const FAST = JSON.stringify({ pollMs: 100, jitterMs: 50, recheckMs: 300, reportMs: 600_000, parentPollMs: 100, staleFirstMs: 5000, rpcClientMs: 3000,
  treeRecheckMs: 300 });

/**
 * 비Windows 에는 대기열이 없다 — Windows 시험들이 거기서 단언 없이 끝나지 않도록, 같은 진입이 감독 없이 그대로 돌고(토큰 없음)
 * 종료 코드를 지키며 classify 가 direct 인지를 대신 본다(Codex 43 지적 9).
 */
function assertDirectOffWindows() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-run-queue-off-'));
  try {
    const env = { ...process.env, [ENV_TEST_ACTIVE]: '1' };
    delete env[ENV_LOCK];
    execFileSync('git', ['init', '-q', dir], { env, stdio: 'ignore' });
    const classified = spawnSync(process.execPath, [QUEUE, 'classify'], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(classified.stdout.trim(), 'direct');
    const ran = spawnSync(process.execPath, [QUEUE, 'run', '--kind', 'probe', '--', process.execPath, '-e', `process.exit(process.env.${ENV_LOCK} ? 9 : 4)`], { cwd: dir, env });
    assert.equal(ran.status, 4);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-run-queue-'));
  const env = { ...process.env, [ENV_TEST_ACTIVE]: '1', EGOV_HEAVY_RUN_QUEUE_TIMING: FAST };
  for (const key of [ENV_LOCK, ENV_SWITCH, 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY']) delete env[key];
  execFileSync('git', ['init', '-q', dir], { env, stdio: 'ignore' });
  const processesFile = path.join(dir, 'observed-processes.json');
  const dockerFile = path.join(dir, 'observed-docker.json');
  fs.writeFileSync(processesFile, '[]');
  fs.writeFileSync(dockerFile, '{}');
  env.EGOV_HEAVY_RUN_QUEUE_TEST_PROCESSES = processesFile;
  env.EGOV_HEAVY_RUN_QUEUE_TEST_DOCKER = dockerFile;
  const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: dir, env, encoding: 'utf8' }).trim();
  const state = path.join(commonDir, 'egov-heavy-run');
  const work = path.join(dir, 'work.mjs');
  fs.writeFileSync(work, `import fs from 'node:fs';
import { spawn } from 'node:child_process';
const [log, id, ms, code, mode] = process.argv.slice(2);
// orphan: 부모가 죽어도 남는 손자를 띄운다(Gradle 실행기 JVM 이 cmd.exe 보다 오래 사는 경우의 대역).
if (mode === 'orphan') {
  const grandchild = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { detached: true, stdio: 'ignore' });
  fs.writeFileSync(log + '.' + id + '.pids', process.pid + ' ' + grandchild.pid);
}
fs.appendFileSync(log, \`start \${id} \${Date.now()}\\n\`);
await new Promise((resolve) => setTimeout(resolve, Number(ms)));
fs.appendFileSync(log, \`end \${id} \${Date.now()}\\n\`);
process.exit(Number(code));
`);
  const children = new Set();
  // 정리 실패(남은 프로세스의 cwd 로 EBUSY)가 시험의 원래 실패를 가리지 않게 한다.
  const cleanup = () => {
    for (const child of children) { try { execFileSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' }); } catch { /* 이미 끝났다 */ } }
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch (error) { process.stderr.write(`cleanup: ${error.code} ${dir}\n`); }
  };
  return { dir, env, state, work, log: path.join(dir, 'work.log'), processesFile, dockerFile, children, cleanup,
    hash: repositoryHash(commonDir) };
}

function startRun(fx, args, { kind = 'probe' } = {}) {
  const child = spawn(process.execPath, [QUEUE, 'run', '--kind', kind, '--', process.execPath, ...args], { cwd: fx.dir, env: fx.env, stdio: ['ignore', 'pipe', 'pipe'] });
  fx.children.add(child);
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exited = new Promise((resolve) => child.once('exit', (status, signal) => resolve({ status, signal, output })));
  return { child, exited, output: () => output };
}

function queueCli(fx, args, env = fx.env) {
  return spawnSync(process.execPath, [QUEUE, ...args], { cwd: fx.dir, env, encoding: 'utf8' });
}

async function until(predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(100);
  }
}

const phaseOf = (fx) => /보유자: \S+ · (\S+) · (\S+)/.exec(queueCli(fx, ['status']).stdout);

test('runs off Windows (and outside the test switch) go straight through without a queue', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-run-queue-direct-'));
  try {
    const env = { ...process.env };
    delete env[ENV_TEST_ACTIVE];
    delete env[ENV_LOCK];
    const classified = spawnSync(process.execPath, [QUEUE, 'classify'], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(classified.status, 0, classified.stderr);
    assert.equal(classified.stdout.trim(), 'direct', 'node --test (and non-Windows, and Git-less) runs are direct');
    const ran = spawnSync(process.execPath, [QUEUE, 'run', '--kind', 'probe', '--', process.execPath, '-e', `process.exit(process.env.${ENV_LOCK} ? 9 : 5)`], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(ran.status, 5, 'a direct run passes no token and keeps the exit code');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Windows: concurrent runs are serialized, keep their exit codes and leave no marker', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const runs = [1, 2, 3].map((id) => startRun(fx, [fx.work, fx.log, String(id), '1500', String(id + 10)]));
    // 배타성은 잠금 파이프 하나가 맡는다 — 실행 중에는 보유자 하나와 대기 파이프 둘이 보인다(앞 실행의 표식이 겹침을 막는 것과 따로 본다).
    await until(() => { const status = queueCli(fx, ['status']).stdout; return /보유자: probe · running/.test(status) && /대기: 2/.test(status); },
      'one running holder with two waiters');
    const results = await Promise.all(runs.map((run) => run.exited));
    assert.deepEqual(results.map((result) => result.status), [11, 12, 13], results.map((result) => result.output).join('\n'));
    const events = fs.readFileSync(fx.log, 'utf8').trim().split('\n').map((line) => line.split(' '));
    const spans = new Map();
    for (const [kind, id, at] of events) spans.set(id, { ...spans.get(id), [kind]: Number(at) });
    const ordered = [...spans.values()].sort((a, b) => a.start - b.start);
    for (let index = 1; index < ordered.length; index++) assert.ok(ordered[index].start >= ordered[index - 1].end, `run ${index} started before the previous one ended`);
    assert.equal(fs.existsSync(path.join(fx.state, 'active.json')), false, 'a verified end removes the marker');
  } finally { fx.cleanup(); }
});

test('Windows: a nested entry is inside; a same-repository token the holder does not confirm fails without queueing', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const nested = await startRun(fx, [QUEUE, 'classify']).exited;
    assert.equal(nested.status, 0, nested.output);
    assert.match(nested.output, /^inside$/m);
    const forged = queueCli(fx, ['classify'], { ...fx.env, [ENV_LOCK]: `${fx.hash}:${'0'.repeat(32)}` });
    assert.equal(forged.status, 1, 'no holder answers for this token');
    assert.equal(forged.stdout, '', 'classify prints nothing on stdout when it fails');
    const elsewhere = queueCli(fx, ['classify'], { ...fx.env, [ENV_LOCK]: `${'f'.repeat(16)}:${'0'.repeat(32)}` });
    assert.equal(elsewhere.stdout.trim(), 'queue', 'another repository\'s token does not make this one inside');
  } finally { fx.cleanup(); }
});

test('Windows: after a holder is killed the next run never starts on its own; confirm-idle by the holder releases it', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const first = startRun(fx, [fx.work, fx.log, 'a', '60000', '0']);
    await until(() => fs.existsSync(fx.log) && fs.readFileSync(fx.log, 'utf8').includes('start a'), 'the first run');
    execFileSync('taskkill', ['/F', '/PID', String(first.child.pid)], { stdio: 'ignore' });
    await first.exited;
    assert.ok(fs.existsSync(path.join(fx.state, 'active.json')), 'an unverified end keeps the marker');

    const second = startRun(fx, [fx.work, fx.log, 'b', '10', '0']);
    const waiting = await until(() => { const match = phaseOf(fx); return match?.[1] === 'unknown-wait' && match; }, 'unknown-wait');
    await sleep(800);
    assert.equal(fs.readFileSync(fx.log, 'utf8').includes('start b'), false, 'unknown state never starts automatically');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', 'not-this-run']).status, 1, 'another run id is refused');
    const confirmed = queueCli(fx, ['confirm-idle', '--run', waiting[2]]);
    assert.equal(confirmed.status, 0, confirmed.stderr);
    const result = await second.exited;
    assert.equal(result.status, 0, result.output);
    const log = fs.readFileSync(path.join(fx.state, 'log.jsonl'), 'utf8');
    assert.match(log, /"event":"confirm-idle"/);
    assert.match(log, /"previous-run-unverified"/);
    assert.match(log, /"event":"confirm-idle-marker"/, 'the killed run\'s marker is kept in the log');
    assert.equal(fs.existsSync(path.join(fx.state, 'active.json')), false);
  } finally { fx.cleanup(); }
});

test('Windows: a visible heavy run or running container keeps the holder waiting, and confirm-idle cannot override it', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    fs.writeFileSync(fx.processesFile, JSON.stringify([{ pid: 999_001, ppid: 1, name: 'node.exe', command: 'node C:\\x\\node_modules\\vitest\\vitest.mjs run' }]));
    const run = startRun(fx, [fx.work, fx.log, 'v', '10', '0']);
    const waiting = await until(() => { const match = phaseOf(fx); return match?.[1] === 'busy-wait' && match; }, 'busy-wait');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', waiting[2]]).status, 1, 'a visible run is not confirmable');
    fs.writeFileSync(fx.processesFile, '[]');
    assert.equal((await run.exited).status, 0);

    // 소유 라벨이 붙은 컨테이너가 돌고 있으면(정리되지 않은 앞 실행의 DB 등) 그것이 없어질 때까지 기다린다.
    fs.writeFileSync(fx.dockerFile, JSON.stringify({ 'egov.task': 1 }));
    const next = startRun(fx, [fx.work, fx.log, 'd', '10', '0']);
    const containerWait = await until(() => { const match = phaseOf(fx); return match?.[1] === 'busy-wait' && match; }, 'busy-wait on the container');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', containerWait[2]]).status, 1, 'a running container is not confirmable');
    fs.writeFileSync(fx.dockerFile, '{}');
    assert.equal((await next.exited).status, 0);

    // Docker 를 알 수 없으면(엔진이 꺼진 것과 다른 실패) 자동으로 시작하지 않는다.
    fs.writeFileSync(fx.dockerFile, JSON.stringify({ unknown: true }));
    const dockerUnknown = startRun(fx, [fx.work, fx.log, 'u', '10', '0']);
    const unknownDocker = await until(() => { const match = phaseOf(fx); return match?.[1] === 'unknown-wait' && match; }, 'unknown-wait on docker');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', unknownDocker[2]]).status, 0);
    assert.equal((await dockerUnknown.exited).status, 0);
    fs.writeFileSync(fx.dockerFile, '{}');

    // 프로세스 목록을 볼 수 없으면 앞 실행이 정상이어도 자동으로 시작하지 않는다.
    fs.writeFileSync(fx.processesFile, 'blind');
    const blind = startRun(fx, [fx.work, fx.log, 'e', '10', '0']);
    const unknown = await until(() => { const match = phaseOf(fx); return match?.[1] === 'unknown-wait' && match; }, 'unknown-wait on a blind listing');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', unknown[2]]).status, 0);
    assert.equal((await blind.exited).status, 0);
  } finally { fx.cleanup(); }
});

test('Windows: confirm-idle re-checks — a run that became visible while the holder waited on an unknown state is not confirmable', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  // 다시 보는 주기를 길게 둬 보유자가 'unknown-wait' 에 머무는 동안 확인 요청이 스스로 다시 판정하는지 본다.
  fx.env.EGOV_HEAVY_RUN_QUEUE_TIMING = JSON.stringify({ ...JSON.parse(FAST), recheckMs: 600_000 });
  try {
    fs.writeFileSync(fx.processesFile, 'fail');
    const run = startRun(fx, [fx.work, fx.log, 'r', '10', '0']);
    const waiting = await until(() => { const match = phaseOf(fx); return match?.[1] === 'unknown-wait' && match; }, 'unknown-wait');
    fs.writeFileSync(fx.processesFile, JSON.stringify([{ pid: 999_002, ppid: 1, name: 'java.exe', command: 'java GradleWorkerMain \'Gradle Test Executor 1\'' }]));
    const refused = queueCli(fx, ['confirm-idle', '--run', waiting[2]]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /visible: gradle-test-worker|gradle-test-worker/);
    assert.equal(fs.existsSync(fx.log) && fs.readFileSync(fx.log, 'utf8').includes('start r'), false);
    fs.writeFileSync(fx.processesFile, 'fail');
    assert.equal(queueCli(fx, ['confirm-idle', '--run', waiting[2]]).status, 0, 'only the unknown reason is confirmable');
    assert.equal((await run.exited).status, 0);
  } finally { fx.cleanup(); }
});

test('Windows: a waiting supervisor ends with its caller', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const holder = startRun(fx, [fx.work, fx.log, 'h', '60000', '0']);
    await until(() => phaseOf(fx)?.[1] === 'running', 'the holder running');
    const caller = spawn(process.execPath, ['-e', `require('node:child_process').spawnSync(process.execPath, [${JSON.stringify(QUEUE)}, 'run', '--kind', 'probe', '--', process.execPath, '-e', '0'], { stdio: 'ignore' })`],
      { cwd: fx.dir, env: fx.env, stdio: 'ignore' });
    fx.children.add(caller);
    await until(() => /대기: 1/.test(queueCli(fx, ['status']).stdout), 'one waiter');
    execFileSync('taskkill', ['/F', '/PID', String(caller.pid)], { stdio: 'ignore' });
    await until(() => /대기: 0/.test(queueCli(fx, ['status']).stdout), 'the waiter gone with its caller', 10_000);
    execFileSync('taskkill', ['/T', '/F', '/PID', String(holder.child.pid)], { stdio: 'ignore' });
  } finally { fx.cleanup(); }
});

test('Windows: a direct child killed from outside while the supervisor lives is not a verified end when its tree survives', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  let grandchild = null;
  try {
    const run = startRun(fx, [fx.work, fx.log, 'o', '60000', '0', 'orphan']);
    await until(() => fs.existsSync(`${fx.log}.o.pids`) && fs.existsSync(fx.log) && fs.readFileSync(fx.log, 'utf8').includes('start o'), 'the child with an orphan');
    const [childPid, orphanPid] = fs.readFileSync(`${fx.log}.o.pids`, 'utf8').split(' ').map(Number);
    grandchild = orphanPid;
    // 감독이 아니라 직접 자식만 끝낸다 — 감독은 살아 있고, 자식이 띄운 손자는 남는다.
    execFileSync('taskkill', ['/F', '/PID', String(childPid)], { stdio: 'ignore' });
    const result = await run.exited;
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /그 아래 프로세스 1개가 남아 있다/);
    assert.ok(fs.existsSync(path.join(fx.state, 'active.json')), 'a surviving tree keeps the marker');
    assert.match(fs.readFileSync(path.join(fx.state, 'log.jsonl'), 'utf8'), /"event":"tree-unverified"/);
    // 트리를 볼 수 없어도 끝나지 않은 것으로 본다.
    execFileSync('taskkill', ['/F', '/PID', String(orphanPid)], { stdio: 'ignore' });
    grandchild = null;
    fs.rmSync(path.join(fx.state, 'active.json'));
    const clean = startRun(fx, [fx.work, fx.log, 'b', '10', '0']);
    await clean.exited;
    assert.equal(fs.existsSync(path.join(fx.state, 'active.json')), false, 'a run whose tree is seen gone removes the marker');
    const treeFile = path.join(fx.dir, 'tree.txt');
    fs.writeFileSync(treeFile, 'fail');
    const unseen = spawn(process.execPath, [QUEUE, 'run', '--kind', 'probe', '--', process.execPath, fx.work, fx.log, 'n', '10', '0'],
      { cwd: fx.dir, env: { ...fx.env, EGOV_HEAVY_RUN_QUEUE_TEST_TREE: treeFile }, stdio: 'ignore' });
    fx.children.add(unseen);
    await new Promise((resolve) => unseen.once('exit', resolve));
    assert.ok(fs.existsSync(path.join(fx.state, 'active.json')), 'an unseen tree keeps the marker');
  } finally {
    if (grandchild) { try { execFileSync('taskkill', ['/F', '/PID', String(grandchild)], { stdio: 'ignore' }); } catch { /* 이미 끝났다 */ } }
    fx.cleanup();
  }
});

test('a repository that cannot be read fails instead of running without the queue', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-run-queue-git-'));
  try {
    const env = { ...process.env, [ENV_TEST_ACTIVE]: '1' };
    delete env[ENV_LOCK];
    execFileSync('git', ['init', '-q', dir], { env, stdio: 'ignore' });
    // 잘못된 설정은 git 을 128 로 실패시키지만 '저장소 밖'은 아니다.
    const broken = { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.bare', GIT_CONFIG_VALUE_0: 'not-a-boolean' };
    // 정상 저장소 안에서 GIT_DIR 이 없는 경로를 가리키면 git 은 'not a git repository' 로 실패하지만 이것도 설정 오류다(Codex 44 지적 3).
    const misdirected = { ...env, GIT_DIR: path.join(dir, 'missing-git-dir') };
    for (const [label, badEnv] of [['bad config', broken], ['missing GIT_DIR', misdirected]]) {
      const classified = spawnSync(process.execPath, [QUEUE, 'classify'], { cwd: dir, env: badEnv, encoding: 'utf8' });
      if (WINDOWS) {
        assert.equal(classified.status, 1, `${label}: ${classified.stdout}`);
        assert.match(classified.stderr, /저장소를 확인하지 못했다/, label);
      } else {
        assert.equal(classified.stdout.trim(), 'direct', 'off Windows the queue never reads the repository');
      }
    }
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-run-queue-nogit-'));
    try {
      const plain = spawnSync(process.execPath, [QUEUE, 'classify'], { cwd: outside, env: { ...env, GIT_CEILING_DIRECTORIES: path.dirname(outside) }, encoding: 'utf8' });
      assert.equal(plain.stdout.trim(), 'direct', 'outside a repository the queue is not used');
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function gitShell() {
  const located = spawnSync('git', ['--exec-path'], { encoding: 'utf8' }).stdout.trim();
  const gitRoot = path.resolve(located, '..', '..', '..');
  // Git 은 훅을 usr/bin/sh.exe 로 띄운다(실측). bin/sh.exe 는 그것을 띄우는 래퍼라 부모 관계가 한 단계 다르다.
  return [path.join(gitRoot, 'usr', 'bin', 'sh.exe'), path.join(gitRoot, 'bin', 'sh.exe')].find((candidate) => fs.existsSync(candidate));
}
const posix = (value) => value.replaceAll('\\', '/');

test('Windows: a running supervisor whose shell caller vanished ends the child tree and keeps the marker (unverified end)', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const node = posix(process.execPath);
    const caller = spawn(gitShell(), ['-c', `exec "${node}" "${posix(QUEUE)}" run --kind probe -- "${node}" "${posix(fx.work)}" "${posix(fx.log)}" s 60000 0`],
      { cwd: fx.dir, env: fx.env, stdio: 'ignore' });
    fx.children.add(caller);
    await until(() => fs.existsSync(fx.log) && fs.readFileSync(fx.log, 'utf8').includes('start s'), 'the child running');
    execFileSync('taskkill', ['/F', '/PID', String(caller.pid)], { stdio: 'ignore' });
    await until(() => /보유자: 없음/.test(queueCli(fx, ['status']).stdout), 'the lock released', 15_000);
    assert.equal(fs.readFileSync(fx.log, 'utf8').includes('end s'), false, 'the child tree was ended, not waited for');
    assert.ok(fs.existsSync(path.join(fx.state, 'active.json')), 'an end the supervisor forced is not a verified end');
    assert.match(fs.readFileSync(path.join(fx.state, 'log.jsonl'), 'utf8'), /"event":"unverified-end"/);
  } finally { fx.cleanup(); }
});

test('Windows: the pre-push header re-runs the hook under a supervisor with the same stdin, argv and exit code', async () => {
  if (!WINDOWS) return assertDirectOffWindows();
  const fx = fixture();
  try {
    const hook = fs.readFileSync(path.join(ROOT, '.githooks', 'pre-push'), 'utf8').replace(/\r\n/g, '\n');
    const start = hook.indexOf('# [DEC-OPS-413]');
    const end = hook.indexOf('esac\n', start) + 'esac\n'.length;
    assert.ok(start > 0 && end > start, 'the queue header is in the hook');
    const header = hook.slice(start, end);
    fs.mkdirSync(path.join(fx.dir, 'scripts'));
    for (const file of ['heavy-run-queue.mjs', 'heavy-run-pipes.mjs', 'verification-record.mjs']) fs.copyFileSync(path.join(HERE, file), path.join(fx.dir, 'scripts', file));
    fs.mkdirSync(path.join(fx.dir, '.githooks'));
    const out = path.join(fx.dir, 'hook.out');
    fs.writeFileSync(path.join(fx.dir, '.githooks', 'pre-push'), `#!/bin/sh\n${header}printf '%s|%s|%s|' "$EGOV_QUEUE_STATE" "$1" "\${${ENV_LOCK}:+token}" > hook.out\ncat >> hook.out\nexit 7\n`);
    const shell = gitShell();
    const refs = 'refs/heads/a 1111111111111111111111111111111111111111 refs/heads/a 2222222222222222222222222222222222222222\nrefs/heads/b 3333333333333333333333333333333333333333 refs/heads/b 0000000000000000000000000000000000000000\n';
    const result = spawnSync(shell, ['.githooks/pre-push', 'origin', 'https://example.invalid/space path.git'], { cwd: fx.dir, env: fx.env, input: refs, encoding: 'utf8' });
    assert.equal(result.status, 7, result.stderr);
    assert.equal(fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n'), `inside|origin|token|${refs}`);
    // 시험 밖 판정(direct)이면 감독 없이 그대로 본문으로 간다.
    const direct = spawnSync(shell, ['.githooks/pre-push', 'origin', 'x'], { cwd: fx.dir, env: { ...fx.env, [ENV_SWITCH]: 'off' }, input: refs, encoding: 'utf8' });
    assert.equal(direct.status, 7, direct.stderr);
    assert.equal(fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n'), `direct|origin||${refs}`);
    // 같은 저장소의 확인되지 않는 토큰이면 본문에 가지 않고 멈춘다.
    fs.rmSync(out);
    const forged = spawnSync(shell, ['.githooks/pre-push', 'origin', 'x'], { cwd: fx.dir, env: { ...fx.env, [ENV_LOCK]: `${fx.hash}:${'0'.repeat(32)}` }, input: refs, encoding: 'utf8' });
    assert.equal(forged.status, 1);
    assert.equal(fs.existsSync(out), false);
  } finally { fx.cleanup(); }
});
