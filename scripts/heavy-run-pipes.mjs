/**
 * [DEC-OPS-413 · DEC-OPS-437] Named pipes and heavy-process listing helpers for the heavy-run queue (scripts/heavy-run-queue.mjs).
 * The queue's lock is a Windows named pipe whose listener is the holder, so the OS releases it when the holder dies; a waiting
 * supervisor opens its own waiter pipe, which the OS likewise removes. Waiting supervisor PIDs are excluded from overlap checks.
 */
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const PIPE_ROOT = '\\\\.\\pipe\\';
export const PIPE_PREFIX = 'egov-heavy-run-';
const WAITER = /^egov-heavy-run-([0-9a-f]{16})-w-(\d{13})-([1-9]\d*)$/;

/** First 16 hex digits of the SHA-256 of the normalized Git common dir (lower case, `/` separators, no trailing slash). */
export function repositoryHash(commonDir) {
  const normalized = String(commonDir).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export const lockPipeName = (hash) => `${PIPE_PREFIX}${hash}`;
export const waiterPipeName = (hash, startedMs, pid) => `${PIPE_PREFIX}${hash}-w-${String(startedMs).padStart(13, '0')}-${pid}`;
export const pipePath = (name) => `${PIPE_ROOT}${name}`;

/** {hash, startedMs, pid} of a waiter pipe name, or null for any other name. */
export function parseWaiterPipe(name) {
  const match = WAITER.exec(name);
  return match ? { hash: match[1], startedMs: Number(match[2]), pid: Number(match[3]), name } : null;
}

/** PIDs of supervisors that hold a waiter pipe (any repository on this machine). */
export function waitingSupervisorPids(names) {
  return new Set(names.map(parseWaiterPipe).filter(Boolean).map((waiter) => waiter.pid));
}

/** Queue pipe names on this machine; throws when the pipe namespace cannot be listed (callers decide what that means). */
export function listQueuePipeNamesSync({ platform = process.platform, readdir = fs.readdirSync } = {}) {
  if (platform !== 'win32') return [];
  return readdir(PIPE_ROOT).filter((name) => name.startsWith(PIPE_PREFIX));
}

const HEAVY_PROCESS_KINDS = [
  ['vitest', ['node'], /[\\/]vitest[\\/](?:[^\s"]*[\\/])?[^\s"\\/]+\.[cm]?js\b/i],
  ['node-test', ['node'], /(?:^|\s)--test(?:\s|=|$)/],
  ['gradle-test-worker', ['java'], /GradleWorkerMain\b[^\n]*Gradle Test Executor/],
  ['playwright', ['node'], /playwright[^\s"]*[\\/]cli\.js"?\s+test(?:\s|$)/i],
  ['isolated-e2e', ['node'], /run-isolated-e2e\.mjs/i],
  ['verify', ['node'], /scripts[\\/]verify\.mjs/i],
  ['reusable-base', ['node'], /scripts[\\/](?:verify-reusable-base|generate-reusable-base-[\w-]+|project-composer-menus-refresh)\.mjs/i],
  // Git runs a hook as `sh <hook path> ...`; a shell that only mentions the hook (`bash -c "...pre-push..."`) is not it.
  ['pre-push', ['sh', 'bash', 'dash'], /^"?(?:[^"\s]*[\\/])?(?:ba|da)?sh(?:\.exe)?"?\s+"?(?:[^"\s]*[\\/])?\.githooks[\\/]pre-push"?(?:\s|$)/i],
];

const executable = name => (typeof name === 'string' ? name.toLowerCase().replace(/\.exe$/, '') : '');
const WATCHED_EXECUTABLES = new Set(HEAVY_PROCESS_KINDS.flatMap(([, names]) => names));

const QUEUE_SUPERVISOR = /(?:^|[\s"\\/])heavy-run-queue\.mjs"?\s+run(?:\s|$)/i;
const ENTRY_KINDS = new Set(['verify', 'isolated-e2e', 'reusable-base', 'pre-push']);
const entryShaped = entry => typeof entry?.command === 'string' && HEAVY_PROCESS_KINDS.some(([kind, names, pattern]) =>
  ENTRY_KINDS.has(kind) && names.includes(executable(entry.name)) && pattern.test(entry.command));

/** [DEC-OPS-413] Waiting queue supervisors and their direct entry-shaped parent — nothing else. */
export function waitingExclusions(processes, waitingPids) {
  const excluded = new Set();
  if (!waitingPids?.size) return excluded;
  const byPid = new Map(processes.map(entry => [entry.pid, entry]));
  for (const entry of processes) {
    if (!waitingPids.has(entry.pid) || executable(entry.name) !== 'node' || typeof entry.command !== 'string'
      || !QUEUE_SUPERVISOR.test(entry.command)) continue;
    excluded.add(entry.pid);
    const parent = byPid.get(entry.ppid);
    if (parent && entryShaped(parent)) excluded.add(parent.pid);
  }
  return excluded;
}

/** Kinds of heavy runs among processes outside the caller's own ancestry (pure; processes are {pid, ppid, name, command}). */
export function heavyProcessKinds(processes, selfPid = process.pid, waitingPids = new Set()) {
  const self = processes.find(entry => entry.pid === selfPid);
  if (!self || typeof self.command !== 'string') return null;
  const parents = new Map(processes.map(entry => [entry.pid, entry.ppid]));
  const own = new Set();
  for (let pid = selfPid; pid && !own.has(pid); pid = parents.get(pid)) own.add(pid);
  for (const pid of waitingExclusions(processes, waitingPids)) own.add(pid);
  const kinds = new Set();
  let unreadable = false;
  for (const entry of processes) {
    if (own.has(entry.pid)) continue;
    const name = executable(entry.name);
    if (typeof entry.command !== 'string') {
      if (WATCHED_EXECUTABLES.has(name)) unreadable = true;
      continue;
    }
    for (const [kind, names, pattern] of HEAVY_PROCESS_KINDS) if (names.includes(name) && pattern.test(entry.command)) kinds.add(kind);
  }
  return kinds.size || !unreadable ? [...kinds].sort() : null;
}

const WINDOWS_LISTING = ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress']];
const POSIX_LISTING = ['ps', ['-eo', 'pid=,ppid=,ucomm=,args=']];
const listingOptions = timeout => ({ encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

function parseListing(output, windows) {
  if (windows) {
    return [].concat(JSON.parse(output)).map(entry =>
      ({ pid: entry.ProcessId, ppid: entry.ParentProcessId, name: entry.Name, command: entry.CommandLine }));
  }
  return output.split('\n').flatMap(line => {
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), name: match[3], command: match[4] }] : [];
  });
}

/** A slow listing (a loaded machine) times out into an unknown sample rather than delaying the check. */
export function listProcesses({ timeout = 8000 } = {}) {
  const windows = process.platform === 'win32';
  const [command, args] = windows ? WINDOWS_LISTING : POSIX_LISTING;
  return parseListing(execFileSync(command, args, listingOptions(timeout)), windows);
}

/** The same listing without blocking the event loop (the heavy-run queue supervisor keeps answering its pipe meanwhile). */
export function listProcessesAsync({ timeout = 15_000 } = {}) {
  const windows = process.platform === 'win32';
  const [command, args] = windows ? WINDOWS_LISTING : POSIX_LISTING;
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, listingOptions(timeout), (error, stdout) => {
      if (error) return reject(error);
      try { resolvePromise(parseListing(stdout, windows)); } catch (parseError) { reject(parseError); }
    });
  });
}

/** PIDs of waiting heavy-run queue supervisors, read *after* the process listing. */
export function waitingQueuePids() {
  try { return waitingSupervisorPids(listQueuePipeNamesSync()); } catch { return new Set(); }
}
