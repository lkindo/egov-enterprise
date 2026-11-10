#!/usr/bin/env node
/**
 * [DEC-OPS-413] 무거운 검증 대기열 — 같은 저장소(Git common dir)의 SOP §6.3 단독 실행 대상을 같은 기계에서 한 번에 하나씩 돈다.
 *
 * - 잠금은 Windows 명명된 파이프 `\\.\pipe\egov-heavy-run-<h>` 이고, 그것을 listen 한 감독(이 스크립트의 `run`)이 보유자다.
 *   보유자가 살아 있는 동안(멈춰 있어도) 아무도 얻지 못하고, 죽으면 운영체제가 이름을 푼다 — 시간·PID 로 회수하지 않는다.
 * - 기다리는 감독은 대기 파이프를 연다. 순서는 이름(시작 시각·PID)으로 정하는 공정성 힌트이고 배타성은 잠금 파이프가 맡는다.
 * - 잠금을 얻으면 자식을 띄우기 전에 무거운 프로세스(실행 기록과 같은 분류)·소유 라벨이 붙은 실행 중 컨테이너·앞 실행의 표식을
 *   본다. 보이면 기다리고, 알 수 없으면(조회 실패·감독이 강제 종료됐거나 호출자가 사라진 앞 실행·손상된 표식) 자동으로 시작하지
 *   않는다 — 사람이 `confirm-idle --run <runId>` 로 확인한다. 강제 종료된 실행이 만들던 컨테이너도 그 표식이 덮는다.
 * - 안쪽 실행은 EGOV_HEAVY_RUN_LOCK 의 토큰을 보유자에게 확인한 뒤에만 같은 실행으로 친다. 같은 저장소 토큰의 확인이 실패하면
 *   다시 줄을 서지 않고 실패한다(자기 조상을 기다리는 교착 방지).
 * - 증거 판정은 바꾸지 않는다. 병합 증거는 지금처럼 실행 기록(scripts/verification-record.mjs)과 pr-checks-wait 가 정한다.
 * - 비Windows·Git 밖·시험 안(NODE_TEST_CONTEXT)·EGOV_HEAVY_RUN_QUEUE=off 는 대기열 없이 그대로 돈다.
 *
 * 명령: run --kind <k> -- <명령…> | classify | confirm-idle --run <runId> | status
 */
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { constants as osConstants } from 'node:os';
import { randomBytes } from 'node:crypto';
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { listQueuePipeNamesSync, lockPipeName, parseWaiterPipe, PIPE_PREFIX, PIPE_ROOT, pipePath, repositoryHash, waiterPipeName } from './heavy-run-pipes.mjs';
import { heavyProcessKinds, listProcessesAsync, waitingQueuePids } from './verification-record.mjs';

export const QUEUE_SCRIPT = fileURLToPath(import.meta.url);
export const ENV_LOCK = 'EGOV_HEAVY_RUN_LOCK';
export const ENV_SWITCH = 'EGOV_HEAVY_RUN_QUEUE';
/** Lets the queue's own tests run the real path inside node --test (temporary repositories, never this checkout's lock). */
export const ENV_TEST_ACTIVE = 'EGOV_HEAVY_RUN_QUEUE_TEST';
const TAG = '[heavy-run-queue]';
const STATE_DIR = 'egov-heavy-run';
const MARKER = 'active.json';
const LOG = 'log.jsonl';

const DEFAULT_TIMING = {
  pollMs: 1500, jitterMs: 500, staleFirstMs: 30_000, maxWaitMs: 180 * 60_000, recheckMs: 30_000, reportMs: 30_000,
  parentPollMs: 500, treeChecks: 3, treeRecheckMs: 2_000, daemonSampleMs: 3_000, rpcServerMs: 5_000, rpcClientMs: 10_000, rpcAttempts: 3, listRetries: 3, inUseLimit: 10,
};
/** The queue's own process tests shorten the intervals (EGOV_HEAVY_RUN_QUEUE_TIMING, JSON) — only with the test switch on. */
function timing() {
  if (process.env[ENV_TEST_ACTIVE] !== '1' || !process.env.EGOV_HEAVY_RUN_QUEUE_TIMING) return DEFAULT_TIMING;
  const override = JSON.parse(process.env.EGOV_HEAVY_RUN_QUEUE_TIMING);
  return { ...DEFAULT_TIMING, ...Object.fromEntries(Object.entries(override).filter(([key, value]) => key in DEFAULT_TIMING && Number.isInteger(value) && value > 0)) };
}
export const TIMING = Object.freeze(timing());
/** confirm-idle 은 보유자가 프로세스(최대 15초)·Docker(최대 20초)를 다시 보므로 연결·응답 기한을 그보다 길게 둔다. */
const CONFIRM_MS = 90_000;

// ---------------------------------------------------------------------------------------------------------------------
// 순수 판정(시험 대상)

/** {hash, token} of EGOV_HEAVY_RUN_LOCK (`<16 hex>:<32 hex>`), or null. */
export function parseLockEnv(value) {
  const match = /^([0-9a-f]{16}):([0-9a-f]{32})$/.exec(String(value ?? ''));
  return match ? { hash: match[1], token: match[2] } : null;
}

/**
 * Entry classification before any check over the pipe: direct (run as is), queue (re-run under a supervisor) or check
 * (a same-repository token that the holder must confirm; failure means fail, never queue again).
 */
export function entryRoute({ platform, env, hash }) {
  if (platform !== 'win32') return { route: 'direct', reason: 'platform' };
  if (env.NODE_TEST_CONTEXT && env[ENV_TEST_ACTIVE] !== '1') return { route: 'direct', reason: 'test' };
  if (env[ENV_SWITCH] === 'off') return { route: 'direct', reason: 'off' };
  if (!hash) return { route: 'direct', reason: 'no-git' };
  const lock = parseLockEnv(env[ENV_LOCK]);
  if (!lock || lock.hash !== hash) return { route: 'queue', reason: lock ? 'other-repository' : 'no-token' };
  return { route: 'check', token: lock.token };
}

/** Waiters of one repository in queue order (start time, then PID). */
export function orderedWaiters(names, hash) {
  return names.map(parseWaiterPipe).filter((waiter) => waiter && waiter.hash === hash)
    .sort((a, b) => a.startedMs - b.startedMs || a.pid - b.pid);
}

/** Whether a waiter should try to listen now: first in line with the lock free, or the lock free for staleFirstMs. */
export function shouldAttempt({ names, hash, selfName, freeSinceMs, nowMs, staleFirstMs = TIMING.staleFirstMs }) {
  if (names.includes(lockPipeName(hash))) return false;
  const first = orderedWaiters(names, hash)[0];
  if (!first || first.name === selfName) return true;
  return freeSinceMs !== null && nowMs - freeSinceMs >= staleFirstMs;
}

/** 128 + signal number for a signal exit, the status otherwise, 1 when the child could not be waited for. */
export function exitCodeFor({ status, signal }) {
  if (Number.isInteger(status)) return status;
  const number = signal === 'SIGBREAK' ? 21 : osConstants.signals[signal];
  return Number.isInteger(number) ? 128 + number : 1;
}

/**
 * Start decision from one assessment. visible: heavy kinds seen; running: containers still running; unknown: reasons the
 * state cannot be known. Anything visible means wait; anything unknown (not confirmed by a person) means no automatic start.
 */
export function startDecision({ visible, running, unknown }, confirmed = new Set()) {
  if (visible.length || running.length) return 'busy';
  if (unknown.some((reason) => !confirmed.has(reason.code))) return 'unknown';
  return 'start';
}

/**
 * Owner labels the heavy runs already put on their containers (isolated E2E and its vendor DBs, the generator's PostgreSQL,
 * the reusable-base verification DB). A running container with any of them is a run still going or a leftover; either way
 * the holder waits. Containers being created by a run whose supervisor was killed are covered by that run's marker (unknown).
 */
export const OWNER_LABELS = Object.freeze(['egov.task', 'egov.project-composer', 'egov.reusable-verification', 'egov.composer.vendor']);

/**
 * One `docker ps --filter label=<key>` outcome: running container ids, none, or unknown. A missing CLI or an engine that is
 * not running means nothing can be running; any other failure (time-out, unexpected error) is unknown, never "none".
 */
export function dockerOutcome({ error, stdout = '', stderr = '' }, { liveRestore = 'off' } = {}) {
  if (!error) {
    const ids = stdout.split(/\s+/).filter(Boolean);
    return ids.length ? { running: ids } : { none: true };
  }
  if (error.code === 'ENOENT') return { none: true, reason: 'docker-missing' };
  const text = String(stderr);
  // 엔진이 꺼진 것으로 확정할 수 있는 모양만 '실행 없음'이다 — 엔진 파이프가 없음(Windows), 로컬 소켓에 연결하지 못함(POSIX).
  // 접근 거부·연결 끊김·시간 초과·원격 엔진처럼 엔진이 돌고 있을 수 있는 실패는 모두 알 수 없음이다(Codex 43 지적 1).
  const engineDown = /open \/\/\.\/pipe\/[\w.-]+: The system cannot find the file specified/i.test(text)
    || /Cannot connect to the Docker daemon at unix:\/\/\S+\. Is the docker daemon running\?/i.test(text);
  if (!engineDown) return { unknown: true };
  // live-restore 가 켜져 있으면 엔진이 내려가도 컨테이너가 돈다 — 켜졌거나 설정을 읽지 못하면 알 수 없음이다(DEC-OPS-413 ③).
  return liveRestore === 'off' ? { none: true, reason: 'engine-down' } : { unknown: true, reason: `live-restore-${liveRestore}` };
}

/**
 * live-restore 설정(pure): files 는 [{ text } | { missing: true } | { error }]. 설정은 JSON 으로 읽고, 판정은 해석한 키와 불리언으로만
 * 한다 — 원문 정규식은 이스케이프(`\n`·`l`)로 쓴 키를 놓친다(Codex 46 지적 2·47). 관리 설정의 엔진 옵션(`dockerDaemonOptions`,
 * 그 `value`)은 JSON 문자열이라 늘 다시 파싱하고, 파싱하지 못하면 unknown 이다. 그 밖의 `{` 로 시작하는 문자열은 파싱을 시도해 되면
 * 따라 들어가고, 안 되면 설정이 아닌 글로 본다. 파일을 읽거나 파싱하지 못하면 unknown, 어디서든 `live-restore` 가 true 면 on, 그 밖에는
 * off(Docker 기본값). 이 세 파일 밖(레지스트리·MDM)에서 켠 경우는 수용한 남은 위험이다(DEC-OPS-413 ⑦).
 */
export function liveRestoreState(files) {
  let on = false;
  const visit = (value, depth, options = false) => {
    if (depth > 8 || value === null) return;
    if (typeof value === 'string') {
      const text = value.trim();
      // 엔진 옵션 문자열은 반드시 파싱한다(실패는 바깥에서 unknown). 빈 문자열은 옵션 없음이다.
      if (options) { if (text) visit(JSON.parse(text), depth + 1); return; }
      if (!text.startsWith('{')) return;
      let parsed;
      try { parsed = JSON.parse(text); } catch { return; }
      visit(parsed, depth + 1);
      return;
    }
    if (typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      const name = key.toLowerCase();
      if (name === 'live-restore' && item === true) on = true;
      // dockerDaemonOptions 는 JSON 문자열이거나 { value: JSON 문자열, locked } 다.
      visit(item, depth + 1, name === 'dockerdaemonoptions' || (options && name === 'value'));
    }
  };
  for (const file of files) {
    if (file.error) return 'unknown';
    if (typeof file.text !== 'string') continue;
    try { visit(JSON.parse(file.text.replace(/^\uFEFF/, '')), 0); } catch { return 'unknown'; }
  }
  return on ? 'on' : 'off';
}

/** 이 실행이 띄웠을 수 있는 도구 프로세스의 이름(부모가 사라져도 남아 일을 이어 갈 수 있는 것). */
const TOOL_NAMES = /^(?:java|javaw|node|cmd|sh|bash|powershell|pwsh|gradle|docker)(?:\.exe)?$/i;

/**
 * 일하는 Gradle 데몬(pure): 두 표본 사이에 CPU 시간(100ns 단위 합)이 thresholdMs 보다 많이 는 데몬 — 기본은 조금이라도 늘면 일하는
 * 중이다(2026-11-10 실측: 유휴 데몬은 3초 표본 두 번 모두 0.0ms, Codex 46 지적 1). 첫 표본에 있던 데몬이 둘째 표본에서 CPU 를 보이지
 * 않으면 판정할 수 없다(null).
 */
export function busyDaemons(first, second, thresholdMs = 0) {
  const before = new Map(first.filter((entry) => typeof entry.command === 'string' && DAEMONS.test(entry.command)).map((entry) => [entry.pid, entry.cpu]));
  const busy = [];
  for (const [pid, cpu] of before) {
    const later = second.find((entry) => entry.pid === pid);
    if (!later) continue;
    if (!Number.isFinite(cpu) || !Number.isFinite(later.cpu)) return null;
    if ((later.cpu - cpu) / 10_000 > thresholdMs) busy.push(pid);
  }
  return busy;
}

/** Long-lived helpers a run may start that do no run work of their own (their own children are theirs, not the run's). */
const DAEMONS = /\b(?:org\.gradle\.launcher\.daemon\.bootstrap\.GradleDaemon|GradleDaemon|KotlinCompileDaemon)\b/;

/**
 * Whether anything the run started may still run (pure; processes carry `started` epoch ms when known). Descendants are
 * processes whose parent chain reaches the child and that started after it (a PID reused by an older process is not its
 * descendant); daemons and their subtrees are not run work. A middle process that ended first cuts the chain, so a tool
 * process that started during the run and has no live parent (or a parent younger than itself — a reused PID) counts too:
 * it may be this run's (Codex 44 지적 1). Other sessions' orphans of that window are counted the same way — the safe side.
 * The listing must show start times, or the answer is unknown.
 */
export function runTreeAlive(processes, childPid, childSpawnedAt) {
  if (!processes.length || processes.some((entry) => entry.started === undefined)) return { unknown: true };
  const after = childSpawnedAt - 2000;
  const frontier = [childPid];
  const seen = new Set(frontier);
  const alive = [];
  while (frontier.length) {
    const parent = frontier.shift();
    for (const entry of processes) {
      if (entry.ppid !== parent || seen.has(entry.pid) || !(entry.started >= after)) continue;
      seen.add(entry.pid);
      if (typeof entry.command === 'string' && DAEMONS.test(entry.command)) continue;
      alive.push(entry);
      frontier.push(entry.pid);
    }
  }
  const byPid = new Map(processes.map((entry) => [entry.pid, entry]));
  for (const entry of processes) {
    if (seen.has(entry.pid) || entry.pid === childPid || !(entry.started >= after) || !TOOL_NAMES.test(entry.name ?? '')) continue;
    if (typeof entry.command === 'string' && DAEMONS.test(entry.command)) continue;
    const parent = byPid.get(entry.ppid);
    if (parent && parent.started <= entry.started) continue;
    alive.push({ ...entry, orphan: true });
  }
  return alive.length ? { alive } : { gone: true };
}

// ---------------------------------------------------------------------------------------------------------------------
// 환경

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (message) => { try { process.stderr.write(`${TAG} ${message}\n`); } catch { /* 출력 실패는 결과를 바꾸지 않는다 */ } };

/**
 * The absolute Git common dir, null only when this is certainly not a repository (git says so, or git is not installed).
 * Any other failure — a time-out, a permission or configuration error — throws: "could not tell" must not become "no queue"
 * (Codex 43 지적 3).
 */
export function gitCommonDir(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000 }).trim() || null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    // 저장소 경로를 환경으로 지정했는데 실패하면(지운 경로·오타 GIT_DIR) 설정 오류다 — 저장소 밖이 아니다(Codex 44 지적 3).
    const pinned = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR'].some((key) => process.env[key]);
    if (!pinned && error.status === 128 && /not a git repository/i.test(String(error.stderr ?? ''))) return null;
    throw Object.assign(new Error(`저장소를 확인하지 못했다(${error.code ?? error.status ?? error.message})`), { queueFailure: true });
  }
}

async function listNames() {
  let lastError;
  for (let attempt = 0; attempt <= TIMING.listRetries; attempt++) {
    try {
      return (await fs.promises.readdir(PIPE_ROOT)).filter((name) => name.startsWith(PIPE_PREFIX));
    } catch (error) { lastError = error; await sleep(200 * (attempt + 1)); }
  }
  throw Object.assign(new Error(`파이프 목록을 읽지 못했다: ${lastError?.code ?? lastError?.message}`), { queueFailure: true });
}

function listen(pipe) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => resolve({ error }));
    server.listen(pipe, () => { server.removeAllListeners('error'); resolve({ server }); });
  });
}

function closeServer(server, sockets = new Set()) {
  for (const socket of sockets) socket.destroy();
  return new Promise((resolve) => server.close(() => resolve()));
}

/** One-line JSON request over the lock pipe; resolves to the parsed answer or rejects (refused, timed out, unreadable). */
export function rpc(hash, request, { timeoutMs = TIMING.rpcClientMs } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(pipePath(lockPipeName(hash)));
    let buffer = '';
    const timer = setTimeout(() => { socket.destroy(); reject(Object.assign(new Error('응답 기한 초과'), { code: 'ETIMEDOUT' })); }, timeoutMs);
    socket.setEncoding('utf8');
    socket.on('connect', () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on('data', (chunk) => {
      buffer += chunk;
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      clearTimeout(timer);
      socket.destroy();
      try { resolve(JSON.parse(buffer.slice(0, end))); } catch (error) { reject(error); }
    });
    socket.on('error', (error) => { clearTimeout(timer); reject(error); });
    socket.on('close', () => { clearTimeout(timer); reject(Object.assign(new Error('응답 없이 연결이 닫혔다'), { code: 'ECONNRESET' })); });
  });
}

async function rpcWithRetry(hash, request) {
  let lastError;
  for (let attempt = 0; attempt < TIMING.rpcAttempts; attempt++) {
    try { return await rpc(hash, request); } catch (error) { lastError = error; if (error.code === 'ENOENT') break; }
  }
  throw lastError;
}

/** direct | inside | queue, or fail (a same-repository token the holder did not confirm). Warnings go to stderr only. */
export async function classify({ env = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  // 플랫폼·시험 안·우회는 저장소를 보지 않고 정한다. 저장소를 확인하지 못하면 대기열 없이 돌지 않고 실패한다.
  const early = entryRoute({ platform, env, hash: 'unresolved' });
  let commonDir = null;
  if (early.route !== 'direct') {
    try { commonDir = gitCommonDir(cwd); } catch (error) { return { state: 'fail', reason: error.message }; }
  }
  const hash = commonDir ? repositoryHash(commonDir) : null;
  const decision = early.route === 'direct' ? early : entryRoute({ platform, env, hash });
  if (decision.route === 'direct') {
    if (decision.reason === 'off') say(`${ENV_SWITCH}=off — 대기열 없이 실행한다(실행 기록의 겹침 판정은 그대로다).`);
    return { state: 'direct', reason: decision.reason, hash, commonDir };
  }
  if (decision.route === 'queue') return { state: 'queue', reason: decision.reason, hash, commonDir };
  try {
    const answer = await rpcWithRetry(hash, { op: 'check', token: decision.token });
    if (answer?.ok) return { state: 'inside', hash, commonDir, runId: answer.runId };
    return { state: 'fail', hash, commonDir, reason: answer?.reason ?? 'refused' };
  } catch (error) {
    return { state: 'fail', hash, commonDir, reason: error.code ?? error.message };
  }
}

function stateDir(commonDir) {
  const dir = path.join(commonDir, STATE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Write-then-rename with short retries for Windows sharing violations (antivirus, indexers). */
function writeAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(temporary, file); return; } catch (error) {
      if (attempt >= 9 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) { try { fs.unlinkSync(temporary); } catch { /* 남은 임시 파일은 다음 쓰기와 무관하다 */ } throw error; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (attempt + 1));
    }
  }
}

function removeWithRetry(file) {
  for (let attempt = 0; ; attempt++) {
    try { fs.unlinkSync(file); return; } catch (error) {
      if (error.code === 'ENOENT') return;
      if (attempt >= 9 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (attempt + 1));
    }
  }
}

/** {exists:false} | {exists:true, value} | {exists:true, corrupt:true}. */
function readJson(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (error) { return error.code === 'ENOENT' ? { exists: false } : { exists: true, corrupt: true }; }
  try { return { exists: true, value: JSON.parse(text) }; } catch { return { exists: true, corrupt: true }; }
}

function appendLog(dir, event) {
  try { fs.appendFileSync(path.join(dir, LOG), `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`); } catch { /* 기록 실패는 판정을 바꾸지 않는다 */ }
}

function dockerPs(label, liveRestore) {
  return new Promise((resolve) => {
    execFile('docker', ['ps', '--quiet', '--filter', `label=${label}`], { encoding: 'utf8', windowsHide: true, timeout: 20_000 },
      (error, stdout, stderr) => resolve(dockerOutcome({ error, stdout, stderr }, { liveRestore })));
  });
}

/**
 * The queue's own process tests replace the machine-wide observations with files they control, so another run on the
 * developer's machine cannot change their outcome. Only with the test switch on; never in a real run.
 *   EGOV_HEAVY_RUN_QUEUE_TEST_PROCESSES — JSON list ("self"/"parent" stand for this process and its parent), or "blind"/"fail"
 *   EGOV_HEAVY_RUN_QUEUE_TEST_DOCKER    — JSON {"<owner label>": n} running containers, or {"unknown": true}
 */
function testObservation(name) {
  if (process.env[ENV_TEST_ACTIVE] !== '1' || !process.env[name]) return undefined;
  return fs.readFileSync(process.env[name], 'utf8').trim();
}

async function observeProcesses() {
  const text = testObservation('EGOV_HEAVY_RUN_QUEUE_TEST_PROCESSES');
  if (text === undefined) return listProcessesAsync();
  if (text === 'fail') throw new Error('test: listing failed');
  const self = { pid: process.pid, ppid: process.ppid, name: 'node.exe', command: `node ${QUEUE_SCRIPT} run` };
  if (text === 'blind') return [];
  return [self, ...JSON.parse(text).map((entry) => ({ ...entry, pid: entry.pid === 'self' ? process.pid : entry.pid, ppid: entry.ppid === 'parent' ? process.ppid : entry.ppid }))
    .filter((entry) => entry.pid !== process.pid)];
}

const TREE_LISTING = ['-NoProfile', '-NonInteractive', '-Command',
  'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,'
  + '@{n="Started";e={if ($_.CreationDate) { [DateTimeOffset]::new($_.CreationDate).ToUnixTimeMilliseconds() }}},'
  + '@{n="Cpu";e={[double]$_.KernelModeTime + [double]$_.UserModeTime}} | ConvertTo-Json -Compress'];

/**
 * Processes with their start time (epoch ms), for the end-of-run tree check. The queue's tests may force an unknown answer,
 * and keep only processes whose command line names their fixture (EGOV_HEAVY_RUN_QUEUE_TEST_TREE_SCOPE) so another session's
 * orphans on the developer's machine cannot change their outcome (Codex 46 지적 3).
 */
function observeProcessTree() {
  if (testObservation('EGOV_HEAVY_RUN_QUEUE_TEST_TREE') === 'fail') return Promise.reject(new Error('test: tree listing failed'));
  const scope = process.env[ENV_TEST_ACTIVE] === '1' ? process.env.EGOV_HEAVY_RUN_QUEUE_TEST_TREE_SCOPE : undefined;
  if (!scope) return listProcessTree();
  const needle = scope.replaceAll('\\', '/').toLowerCase();
  return listProcessTree().then((entries) => {
    const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
    const kept = new Set(entries.filter((entry) => typeof entry.command === 'string' && entry.command.replaceAll('\\', '/').toLowerCase().includes(needle)));
    // 범위 안 프로세스의 조상도 모두 남긴다 — 조상을 지우면 살아 있는 부모를 둔 프로세스(시험 실행기 등)가 고아로 보인다.
    for (const entry of [...kept]) {
      for (let parent = byPid.get(entry.ppid); parent && !kept.has(parent); parent = byPid.get(parent.ppid)) kept.add(parent);
    }
    return entries.filter((entry) => kept.has(entry));
  });
}

function listProcessTree() {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', TREE_LISTING, { encoding: 'utf8', windowsHide: true, timeout: 20_000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(error);
      try {
        resolve([].concat(JSON.parse(stdout)).map((entry) => ({ pid: entry.ProcessId, ppid: entry.ParentProcessId, name: entry.Name,
          command: entry.CommandLine, started: Number.isFinite(entry.Started) ? entry.Started : undefined,
          cpu: Number.isFinite(entry.Cpu) ? entry.Cpu : undefined })));
      } catch (parseError) { reject(parseError); }
    });
  });
}

/**
 * 일하는 Gradle 데몬의 PID 들(빈 배열이면 없음), 판정할 수 없으면 null. 데몬이 없으면 한 번만 본다. 시험은 'busy'·'idle'·'fail' 로 바꾼다.
 */
async function observeBusyDaemons() {
  const fake = testObservation('EGOV_HEAVY_RUN_QUEUE_TEST_DAEMON');
  if (fake === 'busy') return [1];
  if (fake === 'idle') return [];
  if (fake === 'fail') return null;
  const first = await observeProcessTree();
  if (!first.some((entry) => typeof entry.command === 'string' && DAEMONS.test(entry.command))) return [];
  await sleep(TIMING.daemonSampleMs);
  return busyDaemons(first, await observeProcessTree());
}

/** Docker live-restore 가 켜질 수 있는 세 설정 파일(사용자 엔진 설정·Desktop 설정·관리 설정). */
function liveRestoreFiles() {
  const paths = [process.env.USERPROFILE && path.join(process.env.USERPROFILE, '.docker', 'daemon.json'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'Docker', 'settings-store.json'),
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'DockerDesktop', 'admin-settings.json')].filter(Boolean);
  return paths.map((file) => {
    try { return { text: fs.readFileSync(file, 'utf8') }; } catch (error) { return error.code === 'ENOENT' ? { missing: true } : { error: error.code }; }
  });
}

/** Per owner label: running ids, none, or unknown. */
async function observeContainers() {
  const fake = testObservation('EGOV_HEAVY_RUN_QUEUE_TEST_DOCKER');
  if (fake !== undefined) {
    const table = JSON.parse(fake);
    const engineDown = { error: { code: 1 }, stderr: 'error during connect: open //./pipe/docker_engine: The system cannot find the file specified.' };
    return OWNER_LABELS.map((label) => ({ label, ...(table.unknown ? { unknown: true }
      : table.engineDown ? dockerOutcome(engineDown, { liveRestore: table.liveRestore ?? 'off' })
        : (table[label] ? { running: Array.from({ length: table[label] }, (_, index) => `c${index}`) } : { none: true })) }));
  }
  const liveRestore = liveRestoreState(liveRestoreFiles());
  return Promise.all(OWNER_LABELS.map(async (label) => ({ label, ...(await dockerPs(label, liveRestore)) })));
}

const LAUNCHER = /\b(?:org\.gradle\.wrapper\.GradleWrapperMain|org\.gradle\.launcher\.GradleMain)\b/;

// ---------------------------------------------------------------------------------------------------------------------
// 감독

class Supervisor {
  constructor({ kind, command, args, info }) {
    Object.assign(this, { kind, command, args, hash: info.hash, commonDir: info.commonDir });
    this.dir = stateDir(info.commonDir);
    this.runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomBytes(4).toString('hex')}`;
    this.token = randomBytes(16).toString('hex');
    this.phase = 'waiting';
    this.startedAt = new Date().toISOString();
    this.sockets = new Set();
    this.confirmed = new Set();
    this.serial = Promise.resolve();
    this.wake = null;
  }

  /** Mutations of the marker run one at a time; release waits for the last one. */
  exclusive(fn) {
    const next = this.serial.then(fn, fn);
    this.serial = next.catch(() => {});
    return next;
  }

  async acquire() {
    const selfName = waiterPipeName(this.hash, Date.now(), process.pid);
    const waiter = await listen(pipePath(selfName));
    if (waiter.error) throw Object.assign(new Error(`대기 파이프를 열지 못했다: ${waiter.error.code}`), { queueFailure: true });
    this.waiter = waiter.server;
    const began = performance.now();
    let freeSince = null;
    let inUse = 0;
    let lastReport = began;
    for (;;) {
      if (this.cancelled) throw Object.assign(new Error('취소됐다'), { cancelled: true });
      const now = performance.now();
      if (now - began > TIMING.maxWaitMs) throw Object.assign(new Error('최대 대기(180분)를 넘었다'), { queueFailure: true });
      const names = await listNames();
      const lockListed = names.includes(lockPipeName(this.hash));
      freeSince = lockListed ? null : (freeSince ?? now);
      if (shouldAttempt({ names, hash: this.hash, selfName, freeSinceMs: freeSince, nowMs: now })) {
        const attempt = await listen(pipePath(lockPipeName(this.hash)));
        if (attempt.server) { this.server = attempt.server; return; }
        if (attempt.error.code !== 'EADDRINUSE') throw Object.assign(new Error(`잠금 파이프 오류: ${attempt.error.code}`), { queueFailure: true });
        // libuv 는 접근 거부도 EADDRINUSE 로 바꾼다 — 목록에 없는데 계속 거부되면 권한 문제로 본다.
        inUse = lockListed ? 0 : inUse + 1;
        if (inUse >= TIMING.inUseLimit) throw Object.assign(new Error('잠금 파이프를 만들 수 없다(권한·세션 조합 확인)'), { queueFailure: true });
      }
      if (now - lastReport >= TIMING.reportMs) { lastReport = now; await this.reportWaiting(names, began); }
      await sleep(TIMING.pollMs + Math.floor(Math.random() * TIMING.jitterMs));
    }
  }

  async reportWaiting(names, began) {
    const position = orderedWaiters(names, this.hash).findIndex((waiter) => waiter.pid === process.pid) + 1;
    let holder = '보유자 정보 없음';
    try {
      const who = await rpc(this.hash, { op: 'who' }, { timeoutMs: 3000 });
      if (who?.ok) holder = `${who.kind} · ${Math.round((Date.now() - Date.parse(who.startedAt)) / 60_000)}분째 · ${who.worktree}`;
    } catch { /* 보유자가 없거나 바쁘다 */ }
    say(`기다리는 중(${Math.round((performance.now() - began) / 60_000)}분, 순번 ${position || '?'}) — 보유자: ${holder}`);
  }

  serve() {
    this.server.on('connection', (socket) => {
      this.sockets.add(socket);
      socket.setEncoding('utf8');
      socket.setTimeout(TIMING.rpcServerMs, () => socket.destroy());
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk;
        const end = buffer.indexOf('\n');
        if (end < 0) return;
        let request;
        try { request = JSON.parse(buffer.slice(0, end)); } catch { request = {}; }
        // confirm-idle 은 다시 관측하므로 그 동안 연결을 잡아 둔다(클라이언트 기한과 같다).
        if (request.op === 'confirm-idle') socket.setTimeout(CONFIRM_MS);
        this.answer(request, socket).then((reply) => socket.end(`${JSON.stringify(reply)}\n`), () => socket.end(`${JSON.stringify({ ok: false, reason: 'error' })}\n`));
      });
      socket.on('close', () => this.sockets.delete(socket));
      socket.on('error', () => {});
    });
  }

  async answer(request, socket = null) {
    const owns = request.token === this.token;
    switch (request.op) {
      case 'check': return owns && this.phase === 'running' ? { ok: true, runId: this.runId } : { ok: false, reason: owns ? this.phase : 'token' };
      case 'who': return { ok: true, kind: this.kind, runId: this.runId, phase: this.phase, startedAt: this.startedAt, worktree: process.cwd() };
      case 'confirm-idle': return this.confirmIdle(request.runId, socket);
      default: return { ok: false, reason: 'op' };
    }
  }

  /** Visible heavy runs, running owner-labelled containers and the reasons the state cannot be known. */
  async assess() {
    const result = { visible: [], running: [], unknown: [], launchers: 0 };
    try {
      const processes = await observeProcesses();
      const kinds = heavyProcessKinds(processes, process.pid, waitingQueuePids());
      if (kinds === null) result.unknown.push({ code: 'process-list-blind' });
      else result.visible.push(...kinds);
      result.launchers = processes.filter((entry) => typeof entry.command === 'string' && LAUNCHER.test(entry.command)).length;
    } catch { result.unknown.push({ code: 'process-list-failed' }); }
    // 데몬은 늘 떠 있어 무거운 분류에 없다 — CPU 가 늘고 있으면 누군가의 빌드(앞 실행이 끊고 간 작업 포함)를 하고 있다(Codex 44 지적 2).
    try {
      const busy = await observeBusyDaemons();
      if (busy === null) result.unknown.push({ code: 'daemon-cpu-unknown' });
      else if (busy.length) result.visible.push('gradle-daemon-busy');
    } catch { result.unknown.push({ code: 'daemon-cpu-unknown' }); }
    const marker = readJson(path.join(this.dir, MARKER));
    if (marker.corrupt) result.unknown.push({ code: 'marker-unreadable' });
    else if (marker.exists && marker.value?.runId !== this.runId) result.unknown.push({ code: 'previous-run-unverified', detail: marker.value });
    for (const outcome of await observeContainers()) {
      if (outcome.running) result.running.push(`${outcome.label}(${outcome.running.length})`);
      else if (outcome.unknown) result.unknown.push({ code: 'docker-unavailable', detail: outcome.label });
    }
    return result;
  }

  async preStart() {
    this.phase = 'checking';
    let lastReport = 0;
    for (;;) {
      if (this.cancelled) throw Object.assign(new Error('취소됐다'), { cancelled: true });
      const result = await this.assess();
      const decision = startDecision(result, this.confirmed);
      if (decision === 'start') return;
      this.phase = decision === 'busy' ? 'busy-wait' : 'unknown-wait';
      this.lastAssessment = result;
      if (performance.now() - lastReport >= TIMING.reportMs) {
        lastReport = performance.now();
        if (decision === 'busy') {
          const watch = result.visible.includes('vitest') ? ' — vitest 는 watch 일 수 있다(끝내거나 멈춘다)' : '';
          say(`잠금을 얻었지만 다른 무거운 실행이 보인다: ${[...result.visible, ...result.running.map((label) => `컨테이너 ${label}`)].join(', ')}${watch}. 끝나면 시작한다.${result.running.length ? ' 소유자가 없는 컨테이너는 `docker ps --filter label=<라벨>` 로 보고 지운다.' : ''}`);
        } else {
          say(`앞 실행의 상태를 알 수 없어 자동으로 시작하지 않는다: ${result.unknown.map((reason) => reason.detail && typeof reason.detail === 'string' ? `${reason.code}(${reason.detail})` : reason.code).join(', ')}`
            + `${result.launchers ? ` · Gradle 실행기 ${result.launchers}개가 떠 있다` : ''}. 확인했으면: node scripts/heavy-run-queue.mjs confirm-idle --run ${this.runId}`);
        }
      }
      await Promise.race([sleep(TIMING.recheckMs), new Promise((resolve) => { this.wake = resolve; })]);
    }
  }

  async confirmIdle(runId, socket = null) {
    if (runId !== this.runId || this.phase !== 'unknown-wait') return { ok: false, reason: runId !== this.runId ? 'run' : this.phase };
    const result = await this.assess();
    if (result.visible.length || result.running.length) return { ok: false, reason: 'visible', visible: result.visible, running: result.running };
    // 다시 보는 동안 요청한 쪽이 끊겼으면(시간 초과로 실패를 보고했으면) 확인을 적용하지 않는다.
    if (socket?.destroyed || this.phase !== 'unknown-wait') return { ok: false, reason: socket?.destroyed ? 'disconnected' : this.phase };
    await this.exclusive(() => {
      const marker = readJson(path.join(this.dir, MARKER));
      if (marker.exists && !marker.corrupt && marker.value?.runId !== this.runId) appendLog(this.dir, { event: 'confirm-idle-marker', runId: this.runId, previous: marker.value });
      if (marker.exists && (marker.corrupt || marker.value?.runId !== this.runId)) removeWithRetry(path.join(this.dir, MARKER));
      for (const reason of result.unknown) this.confirmed.add(reason.code);
      appendLog(this.dir, { event: 'confirm-idle', runId: this.runId, reasons: result.unknown.map((reason) => reason.code) });
    });
    this.wake?.();
    return { ok: true };
  }

  childEnv() { return { ...process.env, [ENV_LOCK]: `${this.hash}:${this.token}` }; }

  async run() {
    this.watchParent();
    this.watchSignals();
    await this.acquire();
    this.serve();
    await this.preStart();
    await this.exclusive(() => writeAtomic(path.join(this.dir, MARKER), { runId: this.runId, kind: this.kind, worktree: process.cwd(), startedAt: this.startedAt, pid: process.pid }));
    await closeServer(this.waiter);
    this.waiter = null;
    this.phase = 'running';
    const spawnedAt = Date.now();
    const outcome = await spawnChild(this.command, this.args, this.childEnv(), (child) => { this.child = child; });
    // 직접 자식이 끝났다는 것만으로는 실행이 끝났다고 보지 않는다 — 감독이 끝낸 트리가 아니고, 그 아래에 남은 프로세스가 없어야
    // 검증된 종료다(Codex 43 지적 2: 바깥에서 cmd.exe 만 끝내면 Gradle 실행기 JVM 이 남는다).
    const verified = !this.killedChild && await this.childTreeGone(spawnedAt);
    await this.release(verified);
    return exitCodeFor(outcome);
  }

  /** 자식이 만든 프로세스가 모두 끝났는지(데몬 제외). 잠깐 늦게 끝나는 손자를 위해 몇 번 다시 보고, 볼 수 없으면 끝나지 않은 것이다. */
  async childTreeGone(spawnedAt) {
    if (!this.child?.pid) return true;
    let last = { unknown: true };
    for (let attempt = 0; attempt < TIMING.treeChecks; attempt++) {
      try { last = runTreeAlive(await observeProcessTree(), this.child.pid, spawnedAt); } catch { last = { unknown: true }; }
      if (last.gone) return true;
      if (attempt + 1 < TIMING.treeChecks) await sleep(TIMING.treeRecheckMs);
    }
    say(last.alive
      ? `자식은 끝났지만 그 아래 프로세스 ${last.alive.length}개가 남아 있다(${[...new Set(last.alive.map((entry) => entry.name))].join(', ')}) — 다음 실행은 확인을 요구한다.`
      : '자식 아래 프로세스를 확인하지 못했다 — 다음 실행은 확인을 요구한다.');
    appendLog(this.dir, { event: 'tree-unverified', runId: this.runId, alive: last.alive?.map((entry) => entry.name) ?? null });
    return false;
  }

  async release(verified) {
    this.phase = 'releasing';
    // 정리되지 않은 컨테이너는 해제 때가 아니라 다음 보유자의 시작 전 확인이 기다린다(소유 라벨로 본다).
    await this.exclusive(() => {
      if (verified) removeWithRetry(path.join(this.dir, MARKER));
      else appendLog(this.dir, { event: 'unverified-end', runId: this.runId, kind: this.kind });
    });
    await closeServer(this.server, this.sockets);
  }

  watchParent() {
    const parent = process.ppid;
    this.parentTimer = setInterval(() => {
      try { process.kill(parent, 0); } catch (error) {
        if (error.code !== 'ESRCH') return;
        clearInterval(this.parentTimer);
        this.callerGone();
      }
    }, TIMING.parentPollMs);
    this.parentTimer.unref();
  }

  callerGone() {
    if (this.phase === 'running' && this.child) {
      say('호출자가 사라져 자식 트리를 끝낸다.');
      this.killedChild = true;
      try { execFileSync('taskkill', ['/T', '/F', '/PID', String(this.child.pid)], { stdio: 'ignore', windowsHide: true }); } catch { /* 이미 끝났다 */ }
      return;
    }
    if (this.phase !== 'releasing') this.cancel(1);
  }

  watchSignals() {
    for (const [signal, code] of [['SIGINT', 130], ['SIGBREAK', 149], ['SIGTERM', 143]]) {
      process.on(signal, () => { if (this.phase !== 'running' && this.phase !== 'releasing') this.cancel(code); });
    }
  }

  cancel(code) {
    this.cancelled = true;
    this.wake?.();
    Promise.all([this.waiter && closeServer(this.waiter), this.server && closeServer(this.server, this.sockets)]).finally(() => process.exit(code));
  }
}

/** Windows .bat/.cmd go through cmd.exe with each argument quoted; characters cmd would expand are refused. */
export function cmdLine(command, args) {
  const quote = (value) => {
    if (/["%!\r\n]/.test(value)) throw Object.assign(new Error(`cmd.exe 로 넘길 수 없는 문자가 있다: ${value}`), { queueFailure: true });
    return value === '' || /[\s&|<>^(),;=]/.test(value) ? `"${value}"` : value;
  };
  return `"${[command, ...args].map(quote).join(' ')}"`;
}

function resolveWindowsCommand(command) {
  if (/\.(?:exe|com|cmd|bat)$/i.test(command) && (path.isAbsolute(command) || command.includes('\\') || command.includes('/'))) return command;
  const extensions = ['.exe', '.com', '.cmd', '.bat'];
  const candidates = (command.includes('\\') || command.includes('/')) ? [path.resolve(command)]
    : (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, command));
  for (const base of candidates) {
    if (/\.(?:exe|com|cmd|bat)$/i.test(base) && fs.existsSync(base)) return base;
    for (const extension of extensions) if (fs.existsSync(base + extension)) return base + extension;
  }
  return command;
}

function spawnChild(command, args, env, onSpawn = () => {}) {
  return new Promise((resolve) => {
    let child;
    try {
      const resolved = process.platform === 'win32' ? resolveWindowsCommand(command) : command;
      child = /\.(?:cmd|bat)$/i.test(resolved)
        ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', cmdLine(resolved, args)], { stdio: 'inherit', env, windowsVerbatimArguments: true })
        : spawn(resolved, args, { stdio: 'inherit', env });
    } catch (error) { say(`실행하지 못했다: ${error.message}`); return resolve({ status: 127 }); }
    onSpawn(child);
    child.once('error', (error) => { say(`실행하지 못했다: ${error.code ?? error.message}`); resolve({ status: 127 }); });
    child.once('exit', (status, signal) => resolve({ status, signal }));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// 진입점이 쓰는 함수

/**
 * CLI 진입점의 첫 동작(동기 — 원문을 동기 실행하는 계약 시험과 최상위 await 없는 실행기에서도 쓴다). direct·inside 면 그대로 진행하고,
 * queue 면 같은 argv 로 감독 아래에서 다시 실행해 그 종료 코드로 끝나며, 같은 저장소 토큰의 확인 실패는 다시 줄을 서지 않고 1 로 끝난다.
 * 판정은 pre-push 머리말과 같은 `classify` 하위 명령으로 한다(보유자 확인 RPC 가 비동기라서다).
 */
export function ensureQueued(kind, { script = process.argv[1], args = process.argv.slice(2), env = process.env } = {}) {
  const route = entryRoute({ platform: process.platform, env, hash: 'pending' });
  if (route.route === 'direct') {
    if (route.reason === 'off') say(`${ENV_SWITCH}=off — 대기열 없이 실행한다(실행 기록의 겹침 판정은 그대로다).`);
    return 'direct';
  }
  const classified = spawnSync(process.execPath, [QUEUE_SCRIPT, 'classify'], { encoding: 'utf8', windowsHide: true, env, stdio: ['ignore', 'pipe', 'inherit'] });
  const state = classified.status === 0 ? classified.stdout.trim() : 'fail';
  if (state === 'direct' || state === 'inside') return state;
  if (state !== 'queue') {
    say(`바깥 대기열 실행이 끝났거나 응답하지 않는다 — 다시 줄을 서지 않는다. ${ENV_LOCK} 를 지우고 다시 실행한다.`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [QUEUE_SCRIPT, 'run', '--kind', kind, '--', process.execPath, script, ...args], { stdio: 'inherit', env });
  process.exit(exitCodeFor(result));
}

// ---------------------------------------------------------------------------------------------------------------------
// CLI

async function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case 'classify': {
      const info = await classify();
      if (info.state === 'fail') { say(`바깥 대기열 실행이 끝났거나 응답하지 않는다(${info.reason}).`); return 1; }
      process.stdout.write(`${info.state}\n`);
      return 0;
    }
    case 'run': {
      const separator = rest.indexOf('--');
      const kindAt = rest.indexOf('--kind');
      const kind = kindAt >= 0 && kindAt < separator ? rest[kindAt + 1] : null;
      const [childCommand, ...childArgs] = separator >= 0 ? rest.slice(separator + 1) : [];
      if (!kind || !/^[a-z][a-z0-9-]{0,31}$/.test(kind) || !childCommand) { say('사용법: run --kind <종류> -- <명령…>'); return 2; }
      const info = await classify();
      if (info.state === 'fail') { say(`바깥 대기열 실행이 끝났거나 응답하지 않는다(${info.reason}) — 다시 줄을 서지 않는다.`); return 1; }
      if (info.state !== 'queue') return exitCodeFor(await spawnChild(childCommand, childArgs, process.env));
      const supervisor = new Supervisor({ kind, command: childCommand, args: childArgs, info });
      try { return await supervisor.run(); } catch (error) {
        if (error.cancelled) return 1;
        say(`대기열 오류: ${error.message}`);
        return 1;
      }
    }
    case 'confirm-idle': {
      const runAt = rest.indexOf('--run');
      const runId = runAt >= 0 ? rest[runAt + 1] : null;
      const commonDir = gitCommonDir();
      if (!runId || !commonDir) { say('사용법: confirm-idle --run <runId>(저장소 안에서)'); return 2; }
      // 다시 보내지 않는다 — 보유자는 연결이 살아 있을 때만 확인을 적용하고, 끊긴 요청의 처리는 버린다(Codex 43 지적 8).
      const answer = await rpc(repositoryHash(commonDir), { op: 'confirm-idle', runId }, { timeoutMs: CONFIRM_MS }).catch((error) => ({ ok: false, reason: error.code }));
      if (!answer.ok) { say(`확인 거부(${answer.reason}${answer.visible?.length || answer.running?.length ? `: ${[...(answer.visible ?? []), ...(answer.running ?? [])].join(', ')}` : ''}).`); return 1; }
      say('확인했다 — 보유자가 시작한다.');
      return 0;
    }
    case 'status': {
      const commonDir = gitCommonDir();
      if (!commonDir || process.platform !== 'win32') { process.stdout.write('대기열 없음(비Windows 또는 저장소 밖)\n'); return 0; }
      const hash = repositoryHash(commonDir);
      const names = listQueuePipeNamesSync();
      const waiters = orderedWaiters(names, hash);
      let holder = names.includes(lockPipeName(hash)) ? '응답 없음' : '없음';
      try { const who = await rpc(hash, { op: 'who' }, { timeoutMs: 3000 }); if (who.ok) holder = `${who.kind} · ${who.phase} · ${who.runId} · ${who.startedAt} · ${who.worktree}`; } catch { /* 보유자 없음 */ }
      process.stdout.write(`보유자: ${holder}\n대기: ${waiters.length}\n`);
      for (const waiter of waiters) process.stdout.write(`  - pid ${waiter.pid} · ${new Date(waiter.startedMs).toISOString()}\n`);
      return 0;
    }
    default:
      say('명령: run | classify | confirm-idle | status');
      return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === QUEUE_SCRIPT) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => { say(`오류: ${error.message}`); process.exitCode = 1; })
    .finally(() => setImmediate(() => process.exit(process.exitCode ?? 0)));
}
