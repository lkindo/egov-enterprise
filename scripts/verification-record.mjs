#!/usr/bin/env node

// Diagnostic events only. This module neither runs verification commands nor grants reuse/skip authority.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, closeSync, constants as fsConstants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync,
  readdirSync, statSync, writeFileSync } from 'node:fs';
import { constants } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WARNING = '[verification-record] Diagnostic recording is unavailable; verification behavior is unchanged.';
const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_ID = /^[a-z][a-z0-9._-]{0,63}$/;
const ENTRYPOINTS = new Set(['verify', 'pre-push']);
const SCOPES = new Set(['docs', 'fast', 'push', 'full', 'be', 'fe', 'e2e', 'ops', 'migration', 'integrate',
  'source', 'unknown', 'delete-only']);
const SIGNALS = new Set([...Object.keys(constants.signals), 'SIGBREAK']);
const GIT_LOCAL_ENV = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX', 'GIT_CONFIG', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT',
  'GIT_NAMESPACE', 'GIT_SHALLOW_FILE', 'GIT_REPLACE_REF_BASE', 'GIT_CEILING_DIRECTORIES'];

function warn(message = WARNING) {
  try { console.warn(message); } catch { /* A diagnostic sink cannot change the command outcome. */ }
}

// [2026-10-26 DEC-OPS-385] SOP §6.3: a run that overlapped another heavy run, or whose inputs changed while it ran, is not
// evidence for the commit. The recorder samples processes at run start, each step start and run end, and says what it saw;
// it never blocks or changes the command outcome. A sample misses runs that start and end between two samples.
const INPUT_CHANGED = '[verification-record] 실행 중 작업 트리 입력(HEAD·index·변경·미추적 파일)이 바뀌었다 — 이 결과를 그 커밋의 증거로 쓰지 않는다(SOP §6.2·§6.3).';
const CONCURRENT = '[verification-record] 같은 기계에서 다른 시험·검증 실행이 보였다(시작·단계·종료 시점 표본). 무거운 실행(SOP §6.3)과 겹쳤으면 이 결과를 그 커밋의 증거로 쓰지 않고 단독으로 다시 실행한다:';

/**
 * Heavy runs by executable and command-line shape. Only the kind names are recorded, never the command lines. The executable
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

/**
 * Kinds of heavy runs among processes outside the caller's own ancestry (pure; processes are {pid, ppid, name, command}).
 * null means the list could not show what ran: the caller's own entry has no command line (the listing is blind), or a
 * watched executable's command line was unreadable (an elevated process) while nothing else was seen. A blind scan is
 * "unknown", never "nothing".
 */
export function heavyProcessKinds(processes, selfPid = process.pid) {
  const self = processes.find(entry => entry.pid === selfPid);
  if (!self || typeof self.command !== 'string') return null;
  const parents = new Map(processes.map(entry => [entry.pid, entry.ppid]));
  const own = new Set();
  for (let pid = selfPid; pid && !own.has(pid); pid = parents.get(pid)) own.add(pid);
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

/** A slow listing (a loaded machine) times out into an unknown sample rather than delaying the verification it records. */
export function listProcesses({ timeout = 8000 } = {}) {
  const options = { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] };
  if (process.platform === 'win32') {
    const json = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress'], options);
    return [].concat(JSON.parse(json)).map(entry =>
      ({ pid: entry.ProcessId, ppid: entry.ParentProcessId, name: entry.Name, command: entry.CommandLine }));
  }
  return execFileSync('ps', ['-eo', 'pid=,ppid=,ucomm=,args='], options).split('\n').flatMap(line => {
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), name: match[3], command: match[4] }] : [];
  });
}

/** Union of the samples a run took; any sample that saw nothing known is unknown unless another sample saw a run. */
function concurrency(samples) {
  const observed = samples.filter(Array.isArray);
  const kinds = [...new Set(observed.flat())].sort();
  if (kinds.length) return { concurrentSuspected: true, concurrentKinds: kinds };
  if (observed.length === 0) return { concurrentSuspected: null, concurrentKinds: null };
  return { concurrentSuspected: observed.length === samples.length ? false : null, concurrentKinds: kinds };
}

/**
 * Default scan. Inside node --test (NODE_TEST_CONTEXT) sibling test files are expected, and
 * VERIFICATION_RECORD_PROCESS_SCAN=off turns it off explicitly, so neither case scans (unknown, not "none").
 */
function scanHeavyProcesses() {
  if (process.env.NODE_TEST_CONTEXT || process.env.VERIFICATION_RECORD_PROCESS_SCAN === 'off') return null;
  try { return heavyProcessKinds(listProcesses()); } catch { return null; }
}

/**
 * Digests of the inputs a run reads. inputDigest covers HEAD, the index (staged changes, which generated-contract checks
 * read), tracked working-tree changes and untracked file names/sizes/times; anchorDigest covers only HEAD and the index,
 * which no verification step rewrites — a rebase after a deliberate working-tree rewrite moves the first, never the second.
 * Only the hashes are kept, never the values.
 */
function inputDigests(root) {
  try {
    const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
    for (const key of GIT_LOCAL_ENV) delete env[key];
    const options = { cwd: root, env, windowsHide: true, timeout: 10_000, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] };
    const head = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], options);
    const staged = execFileSync('git', ['diff', '--cached', '--no-ext-diff', '--no-textconv', '--binary'], options);
    const anchorDigest = createHash('sha256').update(head).update(staged).digest('hex');
    const hash = createHash('sha256');
    hash.update(head);
    hash.update(staged);
    hash.update('\0index-end\0');
    hash.update(execFileSync('git', ['diff', 'HEAD', '--no-ext-diff', '--no-textconv', '--binary'], options));
    for (const name of execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], options).toString('utf8').split('\0')) {
      if (!name) continue;
      const stat = lstatSync(join(root, name));
      hash.update(`${name}\0${stat.size}\0${stat.mtimeMs}\0`);
    }
    return { inputDigest: hash.digest('hex'), anchorDigest };
  } catch {
    return { inputDigest: null, anchorDigest: null };
  }
}

function safely(action, fallback = false) {
  try { return action(); } catch { warn(); return fallback; }
}

function requireValue(condition) {
  if (!condition) throw new Error('invalid diagnostic input');
}

function recordPath(root, runId) {
  requireValue(typeof root === 'string' && root.length > 0 && RUN_ID.test(runId));
  return resolve(root, 'build', 'verification-runs', `${runId}.jsonl`);
}

function instant() {
  return { timestamp: new Date().toISOString(), clockNs: process.hrtime.bigint().toString() };
}

function elapsed(start, end) {
  const difference = BigInt(end.clockNs) - BigInt(start.clockNs);
  return difference >= 0n ? Number(difference / 1_000_000n) : null;
}

function gitState(root) {
  const unknown = { head: null, trackedDirty: null, untrackedCount: null };
  try {
    const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
    for (const key of GIT_LOCAL_ENV) delete env[key];
    const options = { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 2000,
      maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] };
    const head = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], options).trim();
    requireValue(/^[0-9a-f]{40,64}$/.test(head));
    const entries = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], options).split('\0');
    let trackedDirty = false;
    let untrackedCount = 0;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) continue;
      if (entry.startsWith('?? ')) untrackedCount += 1;
      else {
        trackedDirty = true;
        // Porcelain -z gives a second path for renames/copies; a path is never a status record.
        if (/[RC]/.test(entry.slice(0, 2))) index += 1;
      }
    }
    return { head, trackedDirty, untrackedCount };
  } catch {
    return unknown;
  }
}

function environment(timezone) {
  let resolvedTimezone = null;
  try {
    resolvedTimezone = new Intl.DateTimeFormat('en', timezone === undefined ? {} : { timeZone: timezone })
      .resolvedOptions().timeZone ?? null;
  } catch { /* Invalid or unavailable zone is unknown; never persist the supplied string. */ }
  return { node: process.versions.node, os: process.platform, timezone: resolvedTimezone,
    timezoneSource: timezone === undefined ? 'host' : 'requested' };
}

function outcome(exitCode, signal = null) {
  requireValue(exitCode === null || (Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 0xffffffff));
  requireValue(signal === null || SIGNALS.has(signal));
  return { exitCode, signal, result: signal ? 'interrupted' : exitCode === null ? 'unknown' : exitCode === 0 ? 'passed' : 'failed' };
}

function withRun(root, runId, action) {
  const descriptor = openSync(recordPath(root, runId), fsConstants.O_RDWR | fsConstants.O_APPEND | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const stat = fstatSync(descriptor);
    requireValue(stat.isFile() && stat.size <= 1_048_576);
    const source = readFileSync(descriptor, 'utf8');
    requireValue(source.endsWith('\n'));
    const events = source.trimEnd().split('\n').map(line => JSON.parse(line));
    requireValue(events.length > 0 && events[0].event === 'run-start');
    requireValue(events.every(event => event.schemaVersion === 1 && event.runId === runId));
    return action({ descriptor, events });
  } finally { closeSync(descriptor); }
}

function openSteps(events) {
  const pending = new Map();
  for (const event of events) {
    if (event.event === 'step-start') pending.set(event.stageId, event);
    if (event.event === 'step-end') pending.delete(event.stageId);
  }
  return pending;
}

function append(descriptor, runId, event) {
  appendFileSync(descriptor, `${JSON.stringify({ schemaVersion: 1, runId, ...event })}\n`, { encoding: 'utf8' });
  return true;
}

function recorder(root, runId, scan = scanHeavyProcesses) {
  const change = action => safely(() => withRun(root, runId, state => {
    requireValue(!state.events.some(event => event.event === 'run-end'));
    return action(state);
  }));
  return {
    runId,
    stepStart(stageId) {
      return change(({ descriptor, events }) => {
        requireValue(typeof stageId === 'string' && SAFE_ID.test(stageId) && !openSteps(events).has(stageId));
        const kinds = scan();
        const seen = new Set(events.flatMap(event => (Array.isArray(event.concurrentKinds) ? event.concurrentKinds : [])));
        const fresh = Array.isArray(kinds) ? kinds.filter(kind => !seen.has(kind)) : [];
        const written = append(descriptor, runId, { event: 'step-start', stageId, ...instant(), concurrentKinds: kinds });
        // Say it now, not after a long step: the operator can stop and rerun alone (SOP §6.3).
        if (fresh.length) warn(`${CONCURRENT} ${fresh.join(', ')}`);
        return written;
      });
    },
    // A step that is meant to rewrite tracked working-tree inputs (integrate's regen) moves the working-tree comparison point
    // to the rewritten tree. HEAD and the index keep their run-start anchor: a commit or `git add` by someone else is not
    // absorbed by the rebase.
    rebaseInputs() {
      return change(({ descriptor, events }) => {
        requireValue(events[0].inputDigest !== undefined);
        return append(descriptor, runId, { event: 'inputs-rebased', ...instant(), inputDigest: inputDigests(root).inputDigest });
      });
    },
    stepEnd(stageId, status = {}) {
      return change(({ descriptor, events }) => {
        const { exitCode = null, signal = null } = status;
        requireValue(typeof stageId === 'string' && SAFE_ID.test(stageId));
        const start = openSteps(events).get(stageId);
        requireValue(start);
        const end = instant();
        return append(descriptor, runId, { event: 'step-end', stageId, ...end, ...outcome(exitCode, signal),
          elapsedMs: elapsed(start, end) });
      });
    },
    skip(stageId, reasonCode) {
      return change(({ descriptor, events }) => {
        requireValue(typeof stageId === 'string' && typeof reasonCode === 'string'
          && SAFE_ID.test(stageId) && SAFE_ID.test(reasonCode) && !openSteps(events).has(stageId));
        return append(descriptor, runId, { event: 'step-skipped', stageId, reasonCode, result: 'skipped', ...instant() });
      });
    },
    finish(result = {}) {
      return safely(() => withRun(root, runId, ({ descriptor, events }) => {
        const { exitCode = null, signal = null } = result;
        if (events.some(event => event.event === 'run-end')) return true;
        const end = instant();
        const status = outcome(exitCode, signal);
        const openStageCount = openSteps(events).size;
        if (status.result === 'passed') {
          if (openStageCount) status.result = 'incomplete';
          else if (events.some(event => event.event === 'step-end' && event.result !== 'passed')) status.result = 'inconsistent';
        }
        const baseline = events.findLast(event => event.event === 'run-start' || event.event === 'inputs-rebased');
        const startDigest = baseline.inputDigest ?? null;
        const startAnchor = events[0].anchorDigest ?? null;
        const ending = startDigest === null && startAnchor === null ? { inputDigest: null, anchorDigest: null } : inputDigests(root);
        const treeChanged = startDigest === null || ending.inputDigest === null ? null : startDigest !== ending.inputDigest;
        const anchorChanged = startAnchor === null || ending.anchorDigest === null ? null : startAnchor !== ending.anchorDigest;
        // Three-valued: a change seen by either half is a change; a half that could not be computed is unknown, never "same".
        // Records written before the anchor existed compare the tree alone.
        const anchorKnown = 'anchorDigest' in events[0];
        const inputChanged = treeChanged === true || anchorChanged === true ? true
          : treeChanged === null || (anchorKnown && anchorChanged === null) ? null : false;
        const samples = [...events.filter(event => (event.event === 'run-start' || event.event === 'step-start')
          && 'concurrentKinds' in event).map(event => event.concurrentKinds), scan()];
        const overlap = concurrency(samples);
        if (inputChanged) warn(INPUT_CHANGED);
        if (overlap.concurrentSuspected) warn(`${CONCURRENT} ${overlap.concurrentKinds.join(', ')}`);
        return append(descriptor, runId, { event: 'run-end', ...end, ...status, elapsedMs: elapsed(events[0], end),
          recordComplete: openStageCount === 0, openStageCount, git: gitState(root), inputChanged, ...overlap });
      }));
    },
  };
}

function unavailable() {
  return { runId: null, stepStart: () => false, stepEnd: () => false, skip: () => false, rebaseInputs: () => false, finish: () => false };
}

export function createRun(options = {}) {
  return safely(() => {
    const { root, entrypoint, scope, parentRunId = null, timezone, scanProcesses = scanHeavyProcesses } = options;
    requireValue(typeof scanProcesses === 'function');
    requireValue(typeof root === 'string' && root.length > 0 && ENTRYPOINTS.has(entrypoint) && SCOPES.has(scope));
    requireValue(parentRunId === null || RUN_ID.test(parentRunId));
    const runId = randomUUID();
    const file = recordPath(root, runId);
    const git = gitState(root);
    const concurrentKinds = scanProcesses();
    mkdirSync(resolve(root, 'build', 'verification-runs'), { recursive: true });
    const descriptor = openSync(file, 'wx', 0o600);
    try {
      writeFileSync(descriptor, `${JSON.stringify({ schemaVersion: 1, event: 'run-start', runId, parentRunId,
        authority: 'diagnostic-only', entrypoint, scope, ...instant(), git,
        ...(git.head ? inputDigests(root) : { inputDigest: null, anchorDigest: null }),
        concurrentKinds, environment: environment(timezone) })}\n`);
    } finally { closeSync(descriptor); }
    if (concurrentKinds?.length) warn(`${CONCURRENT} ${concurrentKinds.join(', ')}`);
    return recorder(root, runId, scanProcesses);
  }, unavailable());
}

// [2026-10-29 DEC-OPS-390] A pre-push Vitest step whose every failure was a Vitest timeout reruns those files alone once
// (scripts/vitest-timeout-rerun.mjs). The note names them, so a file that keeps timing out shows up in the summary; it never
// changes the step or run outcome (the rerun's own exit status is the step's status).
const RERUN_FILE = /^src\/[\w@()[\].\/-]+\.test\.tsx?$/;

export function noteTimeoutRerun(root, runId, { files, rerunResult } = {}) {
  return safely(() => {
    requireValue(typeof runId === 'string' && RUN_ID.test(runId));
    requireValue(Array.isArray(files) && files.length > 0 && files.length <= 200
      && files.every(file => typeof file === 'string' && RERUN_FILE.test(file) && !file.split('/').includes('..')));
    requireValue(rerunResult === 'passed' || rerunResult === 'failed');
    return withRun(root, runId, ({ descriptor, events }) => {
      requireValue(!events.some(event => event.event === 'run-end'));
      const open = [...openSteps(events).keys()];
      requireValue(open.length === 1);
      return append(descriptor, runId, { event: 'step-note', stageId: open[0], note: 'timeout-rerun', files, rerunResult, ...instant() });
    });
  });
}

/**
 * Anomalies in this worktree's run records, newest first: no run-end (killed or still running), inconsistent or incomplete
 * outcomes, inputs that changed during the run, suspected overlap with another heavy run (SOP §6.3), Vitest files rerun alone
 * after a timeout and records that are empty or cut off — the oddest runs are listed, not dropped. Ids, times and fixed labels only.
 */
export function summarizeRuns(root, now = Date.now()) {
  const directory = resolve(root, 'build', 'verification-runs');
  let names;
  try { names = readdirSync(directory).filter(name => RUN_ID.test(name.replace(/\.jsonl$/, '')) && name.endsWith('.jsonl')); } catch { return []; }
  const rows = [];
  for (const name of names) {
    try {
      const file = join(directory, name);
      const events = [];
      let malformed = false;
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { events.push(JSON.parse(line)); } catch { malformed = true; }
      }
      const start = events[0]?.event === 'run-start' && RUN_ID.test(events[0].runId) ? events[0] : null;
      const at = start?.timestamp ?? new Date(statSync(file).mtimeMs).toISOString();
      const label = start ? `${start.entrypoint}/${start.scope}` : 'unknown';
      const notes = [];
      if (!start) notes.push(events.length || malformed ? 'malformed-record' : 'empty-record');
      else {
        if (malformed) notes.push('malformed-record');
        const reruns = new Map();
        for (const event of events) {
          if (event.event === 'step-note' && event.note === 'timeout-rerun' && SAFE_ID.test(event.stageId) && Array.isArray(event.files)) {
            reruns.set(event.stageId, (reruns.get(event.stageId) ?? 0) + event.files.length);
          }
        }
        for (const [stageId, count] of reruns) notes.push(`timeout-rerun:${stageId}(${count})`);
        const end = events.find(event => event.event === 'run-end');
        if (!end) notes.push(now - Date.parse(start.timestamp) > 6 * 3_600_000 ? 'no-run-end' : 'running-or-killed');
        else {
          if (end.result === 'inconsistent' || end.result === 'incomplete') notes.push(end.result);
          if (end.inputChanged === true) notes.push('input-changed');
          if (end.concurrentSuspected === true) notes.push(`concurrent:${(end.concurrentKinds ?? []).join('+')}`);
        }
      }
      if (notes.length) rows.push({ at, line: `${name.slice(0, 8)} ${at} ${label} — ${notes.join(', ')}` });
    } catch { /* An unreadable record is left out; the summary is diagnostic. */ }
  }
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1)).map(row => row.line);
}

function cli(arguments_) {
  safely(() => {
    requireValue(arguments_[0] === '--root' && typeof arguments_[1] === 'string');
    const [, root, command, ...values] = arguments_;
    if (command === 'summary') {
      requireValue(values.length === 0);
      for (const line of summarizeRuns(root)) process.stdout.write(`${line}\n`);
      return;
    }
    if (command === 'begin') {
      requireValue(values.length === 2 || values.length === 3);
      const run = createRun({ root, entrypoint: values[0], scope: values[1], parentRunId: values[2] ?? null });
      if (run.runId) process.stdout.write(`${run.runId}\n`);
      return;
    }
    requireValue(RUN_ID.test(values[0]));
    const run = recorder(root, values[0]);
    if (command === 'step-start' && values.length === 2) run.stepStart(values[1]);
    else if (command === 'step-end' && (values.length === 3 || values.length === 4)) {
      const code = values[2] === 'null' ? null : /^\d{1,10}$/.test(values[2]) ? Number(values[2]) : NaN;
      run.stepEnd(values[1], { exitCode: code, signal: values[3] || null });
    } else if (command === 'skip' && values.length === 3) run.skip(values[1], values[2]);
    else if (command === 'finish' && (values.length === 2 || values.length === 3)) {
      const code = values[1] === 'null' ? null : /^\d{1,10}$/.test(values[1]) ? Number(values[1]) : NaN;
      run.finish({ exitCode: code, signal: values[2] || null });
    } else requireValue(false);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(process.argv.slice(2));
