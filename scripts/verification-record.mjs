#!/usr/bin/env node

// Diagnostic events only. This module neither runs verification commands nor grants reuse/skip authority.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, closeSync, constants as fsConstants, fstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { constants } from 'node:os';
import { resolve } from 'node:path';
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

function warn() {
  try { console.warn(WARNING); } catch { /* A diagnostic sink cannot change the command outcome. */ }
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

function recorder(root, runId) {
  const change = action => safely(() => withRun(root, runId, state => {
    requireValue(!state.events.some(event => event.event === 'run-end'));
    return action(state);
  }));
  return {
    runId,
    stepStart(stageId) {
      return change(({ descriptor, events }) => {
        requireValue(typeof stageId === 'string' && SAFE_ID.test(stageId) && !openSteps(events).has(stageId));
        return append(descriptor, runId, { event: 'step-start', stageId, ...instant() });
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
        return append(descriptor, runId, { event: 'run-end', ...end, ...status, elapsedMs: elapsed(events[0], end),
          recordComplete: openStageCount === 0, openStageCount, git: gitState(root) });
      }));
    },
  };
}

function unavailable() {
  return { runId: null, stepStart: () => false, stepEnd: () => false, skip: () => false, finish: () => false };
}

export function createRun(options = {}) {
  return safely(() => {
    const { root, entrypoint, scope, parentRunId = null, timezone } = options;
    requireValue(typeof root === 'string' && root.length > 0 && ENTRYPOINTS.has(entrypoint) && SCOPES.has(scope));
    requireValue(parentRunId === null || RUN_ID.test(parentRunId));
    const runId = randomUUID();
    const file = recordPath(root, runId);
    const git = gitState(root);
    mkdirSync(resolve(root, 'build', 'verification-runs'), { recursive: true });
    const descriptor = openSync(file, 'wx', 0o600);
    try {
      writeFileSync(descriptor, `${JSON.stringify({ schemaVersion: 1, event: 'run-start', runId, parentRunId,
        authority: 'diagnostic-only', entrypoint, scope, ...instant(), git, environment: environment(timezone) })}\n`);
    } finally { closeSync(descriptor); }
    return recorder(root, runId);
  }, unavailable());
}

function cli(arguments_) {
  safely(() => {
    requireValue(arguments_[0] === '--root' && typeof arguments_[1] === 'string');
    const [, root, command, ...values] = arguments_;
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
