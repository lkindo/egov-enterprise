#!/usr/bin/env node

// [DEC-OPS-436] Heavy-process classification & listing helpers consumed by `scripts/heavy-run-queue.mjs`.
// Per-step CIM polling and JSONL run recording were retired in DEC-OPS-436.
import { execFile, execFileSync } from 'node:child_process';
import { listQueuePipeNamesSync, waitingSupervisorPids } from './heavy-run-pipes.mjs';

/**
 * Heavy runs by executable and command-line shape. Only the kind names are returned, never command lines. The executable
 * filter keeps shells and searches that merely mention these words (an idle-wait loop, a grep) out; the shapes name the
 * test-running entry, not any process of the same tool (a Playwright report server, a Gradle worker daemon).
 */
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

// [DEC-OPS-413] A queue supervisor (scripts/heavy-run-queue.mjs `run`) and the entry that synchronously waits for it.
const QUEUE_SUPERVISOR = /(?:^|[\s"\\/])heavy-run-queue\.mjs"?\s+run(?:\s|$)/i;
const ENTRY_KINDS = new Set(['verify', 'isolated-e2e', 'reusable-base', 'pre-push']);
const entryShaped = entry => typeof entry?.command === 'string' && HEAVY_PROCESS_KINDS.some(([kind, names, pattern]) =>
  ENTRY_KINDS.has(kind) && names.includes(executable(entry.name)) && pattern.test(entry.command));

/**
 * [DEC-OPS-413] Waiting queue supervisors and their direct entry-shaped parent — nothing else. A supervisor waits before it
 * starts any child, and the entry that wrapped itself into the queue does nothing but wait for it (it wraps itself as its
 * first action), so neither is running work. Only a process whose PID holds a waiter pipe *and* whose command line is a
 * supervisor counts (the listing and the pipe list are taken at different moments); the walk stops at the direct parent, so
 * an outer run that started a waiting entry (another repository's run, a `node --test`) stays visible.
 */
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

/**
 * Kinds of heavy runs among processes outside the caller's own ancestry (pure; processes are {pid, ppid, name, command}).
 * null means the list could not show what ran: the caller's own entry has no command line (the listing is blind), or a
 * watched executable's command line was unreadable (an elevated process) while nothing else was seen. A blind scan is
 * "unknown", never "nothing". waitingPids are PIDs holding a heavy-run queue waiter pipe (see waitingExclusions).
 */
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

/**
 * [DEC-OPS-413] PIDs of waiting heavy-run queue supervisors, read *after* the process listing (a pipe present now was held by a
 * process alive at the listing). A namespace that cannot be listed excludes nothing — over-reporting overlap is the safe side.
 */
export function waitingQueuePids() {
  try { return waitingSupervisorPids(listQueuePipeNamesSync()); } catch { return new Set(); }
}
