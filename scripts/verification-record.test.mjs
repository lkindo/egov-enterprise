import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun, heavyProcessKinds, listProcesses, noteTimeoutRerun, summarizeRuns } from './verification-record.mjs';

const script = fileURLToPath(new URL('./verification-record.mjs', import.meta.url));
// A real process scan would make these records depend on whatever else this machine runs; tests inject scans instead.
process.env.VERIFICATION_RECORD_PROCESS_SCAN = 'off';

function fixture(t, { git = false, prefix = 'verification-record-' } = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (git) {
    execFileSync('git', ['init', '--quiet'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(root, '.gitignore'), '/build/\n');
    writeFileSync(join(root, 'tracked.txt'), 'baseline\n');
    commit(root);
  }
  return root;
}

function commit(root) {
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
}

function records(root, runId) {
  return readFileSync(join(root, 'build', 'verification-runs', `${runId}.jsonl`), 'utf8')
    .trimEnd().split('\n').map(line => JSON.parse(line));
}

function warningsDuring(action) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...values) => warnings.push(values.join(' '));
  try { return { value: action(), warnings }; }
  finally { console.warn = original; }
}

function invoke(root, ...arguments_) {
  return spawnSync(process.execPath, [script, '--root', root, ...arguments_], { encoding: 'utf8', windowsHide: true });
}

test('records step outcomes, explicit skips and diagnostic Git changes without exposing paths or file contents', t => {
  const root = fixture(t, { git: true });
  const run = createRun({ root, entrypoint: 'verify', scope: 'integrate', timezone: 'Asia/Seoul' });
  assert.ok(run.runId);
  assert.equal(run.stepStart('backend-suite'), true);
  assert.equal(run.stepEnd('backend-suite', { exitCode: 0 }), true);
  assert.equal(run.skip('changed-e2e', 'no-selected-specs'), true);
  writeFileSync(join(root, 'tracked.txt'), 'private-source-content\n');
  writeFileSync(join(root, 'private-untracked-name.txt'), 'private-untracked-content\n');
  const finished = warningsDuring(() => run.finish({ exitCode: 0 }));
  assert.equal(finished.value, true);
  assert.ok(finished.warnings.every(warning => !warning.includes('private')), 'the input-change warning carries no file values');

  const events = records(root, run.runId);
  assert.deepEqual(events.map(event => event.event), ['run-start', 'step-start', 'step-end', 'step-skipped', 'run-end']);
  const [start, , endStep, skipped, end] = events;
  assert.equal(start.authority, 'diagnostic-only');
  assert.equal(start.git.trackedDirty, false);
  assert.equal(start.git.untrackedCount, 0);
  assert.match(start.git.head, /^[0-9a-f]{40}$/);
  assert.deepEqual(end.git, { head: start.git.head, trackedDirty: true, untrackedCount: 1 });
  assert.equal(start.environment.timezone, 'Asia/Seoul');
  assert.equal(start.environment.timezoneSource, 'requested');
  assert.equal(endStep.result, 'passed');
  assert.equal(skipped.result, 'skipped');
  assert.equal(end.result, 'passed');
  assert.equal(end.recordComplete, true);
  assert.ok(endStep.elapsedMs >= 0 && end.elapsedMs >= endStep.elapsedMs);
  assert.ok(events.every(event => event.runId === run.runId && event.schemaVersion === 1));
  const serialized = JSON.stringify(events);
  for (const privateValue of [root, 'private-source-content', 'private-untracked-name', 'private-untracked-content']) {
    assert.ok(!serialized.includes(JSON.stringify(privateValue).slice(1, -1)), privateValue);
  }
});

test('records nonzero, signal, unknown, incomplete and inconsistent outcomes without inventing unobserved steps', t => {
  const root = fixture(t);
  const cases = [
    { step: { exitCode: 7 }, finish: { exitCode: 1 }, expectedStep: 'failed', expectedRun: 'failed' },
    { step: { exitCode: null, signal: 'SIGTERM' }, finish: { exitCode: 143, signal: 'SIGTERM' }, expectedStep: 'interrupted', expectedRun: 'interrupted' },
    { step: { exitCode: null }, finish: { exitCode: null }, expectedStep: 'unknown', expectedRun: 'unknown' },
    { step: { exitCode: 7 }, finish: { exitCode: 0 }, expectedStep: 'failed', expectedRun: 'inconsistent' },
  ];
  for (const item of cases) {
    const run = createRun({ root, entrypoint: 'verify', scope: 'fast' });
    run.stepStart('frontend-types');
    run.stepEnd('frontend-types', item.step);
    run.finish(item.finish);
    const events = records(root, run.runId);
    assert.equal(events[2].result, item.expectedStep);
    assert.equal(events[2].exitCode, item.step.exitCode);
    assert.equal(events.at(-1).result, item.expectedRun);
    assert.equal(events.at(-1).exitCode, item.finish.exitCode);
    assert.equal(events.at(-1).recordComplete, true);
    assert.ok(events.every(event => !event.stageId || event.stageId === 'frontend-types'));
  }
  const unfinished = createRun({ root, entrypoint: 'verify', scope: 'full' });
  unfinished.stepStart('backend-suite');
  assert.deepEqual(records(root, unfinished.runId).map(event => event.event), ['run-start', 'step-start']);
  unfinished.finish({ exitCode: 0 });
  const end = records(root, unfinished.runId).at(-1);
  assert.equal(end.result, 'incomplete');
  assert.equal(end.recordComplete, false);
  assert.equal(end.openStageCount, 1);
});

test('Git unavailability remains unknown and separate child runs link without sharing a file', t => {
  const root = fixture(t);
  const parent = createRun({ root, entrypoint: 'verify', scope: 'e2e' });
  const child = createRun({ root, entrypoint: 'verify', scope: 'e2e', parentRunId: parent.runId });
  assert.notEqual(child.runId, parent.runId);
  child.finish({ exitCode: 0 });
  parent.finish({ exitCode: 0 });
  assert.equal(records(root, child.runId)[0].parentRunId, parent.runId);
  assert.equal(records(root, parent.runId)[0].parentRunId, null);
  assert.deepEqual(records(root, parent.runId)[0].git, { head: null, trackedDirty: null, untrackedCount: null });
  assert.equal(readdirSync(join(root, 'build', 'verification-runs')).length, 2);
});

test('finish is idempotent and a subsequent commit is captured without treating the diagnostic state as a reuse key', t => {
  const root = fixture(t, { git: true });
  const run = createRun({ root, entrypoint: 'pre-push', scope: 'source' });
  const headBefore = records(root, run.runId)[0].git.head;
  writeFileSync(join(root, 'tracked.txt'), 'changed\n');
  commit(root);
  // Capture the input-change warning so it is asserted here instead of printed into the operational contracts' output.
  const finished = warningsDuring(() => run.finish({ exitCode: 0 }));
  assert.equal(finished.warnings.length, 1);
  run.finish({ exitCode: 1 });
  const events = records(root, run.runId);
  assert.equal(events.filter(event => event.event === 'run-end').length, 1);
  assert.equal(events.at(-1).inputChanged, true);
  assert.notEqual(events.at(-1).git.head, headBefore);
  assert.equal(events.at(-1).exitCode, 0);
  assert.equal(events[0].authority, 'diagnostic-only');
  assert.ok(!('cacheKey' in events[0]) && !('reuseAllowed' in events[0]));
});

test('record initialization, append and malformed-record failures never throw or replace command outcomes', t => {
  const blocked = fixture(t);
  writeFileSync(join(blocked, 'build'), 'not a directory');
  const init = warningsDuring(() => createRun({ root: blocked, entrypoint: 'verify', scope: 'fast' }));
  assert.equal(init.value.runId, null);
  assert.equal(init.warnings.length, 1);
  for (const exitCode of [0, 9]) {
    assert.doesNotThrow(() => {
      init.value.stepStart('compile');
      init.value.stepEnd('compile', { exitCode });
      init.value.finish({ exitCode });
    });
  }
  const root = fixture(t);
  const run = createRun({ root, entrypoint: 'verify', scope: 'fast' });
  const file = join(root, 'build', 'verification-runs', `${run.runId}.jsonl`);
  run.stepStart('compile');
  renameSync(file, `${file}.saved`);
  mkdirSync(file);
  const append = warningsDuring(() => run.stepEnd('compile', { exitCode: 9 }));
  assert.equal(append.value, false);
  assert.equal(append.warnings.length, 1);
  assert.ok(!readFileSync(`${file}.saved`, 'utf8').includes('"event":"run-end"'));
  rmSync(file, { recursive: true });
  renameSync(`${file}.saved`, file);
  writeFileSync(file, '{"partial":', { flag: 'a' });
  const malformed = warningsDuring(() => run.finish({ exitCode: 0 }));
  assert.equal(malformed.value, false);
  assert.equal(malformed.warnings.length, 1);
  assert.ok(!readFileSync(file, 'utf8').includes('"event":"run-end"'));
});

test('raw command, environment, output, paths and invalid values are never copied into records or diagnostics', t => {
  const secret = 'SENTINEL-PRIVATE-DO-NOT-RECORD';
  const root = fixture(t, { prefix: `${secret}-` });
  const run = createRun({ root, entrypoint: 'verify', scope: 'fast', timezone: secret,
    command: secret, env: { JWT_SECRET: secret }, output: secret });
  const invalid = warningsDuring(() => {
    assert.equal(run.stepStart(secret), false);
    assert.equal(run.skip('compile', secret), false);
    assert.equal(run.stepEnd('compile', { exitCode: 1, signal: secret }), false);
  });
  assert.equal(invalid.warnings.length, 3);
  run.finish({ exitCode: 0 });
  const serialized = JSON.stringify(records(root, run.runId));
  assert.ok(!serialized.includes(secret));
  assert.equal(records(root, run.runId)[0].environment.timezone, null);
  assert.ok(invalid.warnings.every(value => value === invalid.warnings[0] && !value.includes(secret)));
  const traversal = invoke(root, 'step-start', '../' + secret, 'compile');
  assert.equal(traversal.status, 0);
  assert.equal(traversal.stdout, '');
  assert.ok(!traversal.stderr.includes(secret));
});

test('CLI spans distinct processes, preserves null/signal outcomes and only prints a generated run id at begin', t => {
  const root = fixture(t, { prefix: 'verification record 한글 ' });
  const begin = invoke(root, 'begin', 'pre-push', 'source');
  assert.equal(begin.status, 0, begin.stderr);
  const runId = begin.stdout.trim();
  assert.match(runId, /^[0-9a-f-]{36}$/);
  for (const args of [
    ['step-start', runId, 'compile'],
    ['step-end', runId, 'compile', '0', ''],
    ['skip', runId, 'frontend-types', 'outside-scope'],
    ['step-start', runId, 'harness'],
    ['step-end', runId, 'harness', 'null', 'SIGINT'],
    ['finish', runId, '130', 'SIGINT'],
    ['finish', runId, '0'],
  ]) {
    const result = invoke(root, ...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
  const events = records(root, runId);
  assert.equal(events.at(-1).result, 'interrupted');
  assert.equal(events.at(-1).exitCode, 130);
  assert.equal(events.at(-1).signal, 'SIGINT');
  assert.equal(events.at(-1).recordComplete, true);
  assert.equal(events.filter(event => event.event === 'run-end').length, 1);
  assert.ok(events.filter(event => event.event === 'step-end').every(event => event.elapsedMs >= 0));
  assert.ok(events.at(-1).elapsedMs >= events.find(event => event.stageId === 'compile' && event.event === 'step-end').elapsedMs);
  const ordinary = invoke(root, 'begin', 'pre-push', 'docs');
  const ordinaryRunId = ordinary.stdout.trim();
  const finish = invoke(root, 'finish', ordinaryRunId, '0', '');
  assert.equal(finish.status, 0);
  assert.equal(finish.stderr, '');
  assert.equal(records(root, ordinaryRunId).at(-1).result, 'passed');
});

test('the heavy-run scan skips the caller ancestry, survives pid cycles and keeps only kind names', () => {
  const processes = [
    { pid: 1, ppid: 0, name: 'init', command: 'init' },
    { pid: 10, ppid: 1, name: 'node.exe', command: '"C:\\nodejs\\node.exe" scripts/verify.mjs --scope fast' },
    { pid: 11, ppid: 10, name: 'node.exe', command: 'node scripts/verification-record.mjs --root private-root finish' },
    { pid: 20, ppid: 1, name: 'node.exe', command: 'node private-root/node_modules/vitest/vitest.mjs run' },
    { pid: 21, ppid: 1, name: 'java.exe', command: "java -cp private.jar worker.org.gradle.process.internal.worker.GradleWorkerMain 'Gradle Test Executor 3'" },
    { pid: 22, ppid: 1, name: 'node', command: 'node --test scripts/private.test.mjs' },
    { pid: 23, ppid: 1, name: 'node.exe', command: 'node scripts/build-atlas.mjs' },
    { pid: 24, ppid: 1, name: 'node.exe', command: null },
  ];
  assert.deepEqual(heavyProcessKinds(processes, 11), ['gradle-test-worker', 'node-test', 'vitest']);
  const foreign = [
    { pid: 30, ppid: 1, name: 'node.exe', command: 'node D:\\wt-other\\scripts\\verify.mjs --scope full' },
    { pid: 31, ppid: 1, name: 'sh.exe', command: 'sh .githooks/pre-push origin private-remote' },
    { pid: 32, ppid: 1, name: 'node.exe', command: '"C:\\nodejs\\node.exe" "D:\\wt-x\\node_modules\\@playwright\\test\\cli.js" test --project=full-suite' },
    { pid: 33, ppid: 1, name: 'node', command: 'node scripts/verify-reusable-base.mjs --profile core' },
  ];
  assert.deepEqual(heavyProcessKinds([...processes, ...foreign], 11),
    ['gradle-test-worker', 'node-test', 'playwright', 'pre-push', 'reusable-base', 'verify', 'vitest']);
  // Processes that only mention these words, or tools' resident processes that run no tests, are not heavy runs.
  const lookalikes = [
    { pid: 11, ppid: 1, name: 'node.exe', command: 'node scripts/verification-record.mjs --root private-root finish' },
    { pid: 50, ppid: 1, name: 'powershell.exe', command: "powershell -Command while (Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'node --test .scripts|vitest|GradleWorkerMain|playwright test ' }) { sleep 5 }" },
    { pid: 51, ppid: 1, name: 'rg.exe', command: 'rg -n vitest frontend/src' },
    { pid: 52, ppid: 1, name: 'node.exe', command: 'node D:\\x\\node_modules\\@playwright\\test\\cli.js show-report' },
    { pid: 53, ppid: 1, name: 'node.exe', command: 'node D:\\x\\node_modules\\@playwright\\test\\cli.js install chromium' },
    { pid: 54, ppid: 1, name: 'java.exe', command: "java worker.org.gradle.process.internal.worker.GradleWorkerMain 'Gradle Worker Daemon 2'" },
    { pid: 55, ppid: 1, name: 'bash.exe', command: 'bash -c "until ! pgrep -f .githooks/pre-push; do sleep 5; done"' },
    { pid: 56, ppid: 1, name: 'node.exe', command: 'node scripts/x.mjs --test-reporter=tap' },
    { pid: 57, ppid: 1, command: 'node --test scripts/unnamed.test.mjs' },
  ];
  assert.deepEqual(heavyProcessKinds(lookalikes, 11), []);
  // A blind listing is unknown, never "nothing": no own command line, or an unreadable watched process and nothing seen.
  assert.equal(heavyProcessKinds(lookalikes.slice(1), 11), null, 'the caller must find its own entry');
  assert.equal(heavyProcessKinds([{ ...lookalikes[0], command: null }, ...lookalikes.slice(1)], 11), null);
  const elevated = { pid: 60, ppid: 1, name: 'java.exe', command: null };
  assert.equal(heavyProcessKinds([...lookalikes, elevated], 11), null);
  assert.deepEqual(heavyProcessKinds([...processes, elevated], 11), ['gradle-test-worker', 'node-test', 'vitest']);
  assert.deepEqual(heavyProcessKinds([...lookalikes, { pid: 61, ppid: 1, name: 'svchost.exe', command: null }], 11), []);
  const cycle = [{ pid: 40, ppid: 41, name: 'node', command: 'node verify-helper' },
    { pid: 41, ppid: 40, name: 'node', command: 'node node_modules/vitest/vitest.mjs run' }];
  assert.deepEqual(heavyProcessKinds(cycle, 40), []);
});

test('the real process listing shows this process with its executable and command line', () => {
  // The operational contracts run every test file at once; give the listing room instead of the recorder's 8 s budget.
  const self = listProcesses({ timeout: 120_000 }).find(entry => entry.pid === process.pid);
  assert.ok(self, 'the listing must contain the caller');
  assert.match(String(self.name), /^node(?:\.exe)?$/i);
  assert.equal(typeof self.command, 'string');
  assert.ok(Number.isInteger(self.ppid));
});

test('a run that overlapped another heavy run or whose inputs changed says so and keeps its outcome', t => {
  const root = fixture(t, { git: true });
  let kinds = [];
  const options = { root, entrypoint: 'verify', scope: 'fast', scanProcesses: () => kinds };
  const quiet = warningsDuring(() => {
    const run = createRun(options);
    run.finish({ exitCode: 0 });
    return run;
  });
  assert.deepEqual(quiet.warnings, []);
  const clean = records(root, quiet.value.runId);
  assert.match(clean[0].inputDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(clean[0].concurrentKinds, []);
  assert.deepEqual([clean.at(-1).inputChanged, clean.at(-1).concurrentSuspected], [false, false]);

  kinds = ['vitest'];
  const started = warningsDuring(() => createRun(options));
  assert.equal(started.warnings.length, 1);
  assert.match(started.warnings[0], /다시 실행한다: vitest$/);
  kinds = ['gradle-test-worker'];
  writeFileSync(join(root, 'tracked.txt'), 'edited during the run\n');
  const finished = warningsDuring(() => started.value.finish({ exitCode: 0 }));
  assert.equal(finished.value, true);
  const end = records(root, started.value.runId).at(-1);
  assert.equal(end.result, 'passed');
  assert.equal(end.exitCode, 0);
  assert.equal(end.inputChanged, true);
  assert.equal(end.concurrentSuspected, true);
  assert.deepEqual(end.concurrentKinds, ['gradle-test-worker', 'vitest']);
  assert.equal(finished.warnings.length, 2);

  kinds = [];
  commit(root);
  writeFileSync(join(root, 'scratch.txt'), 'short\n');
  const untracked = createRun(options);
  writeFileSync(join(root, 'scratch.txt'), 'a longer untracked value\n');
  warningsDuring(() => untracked.finish({ exitCode: 0 }));
  assert.equal(records(root, untracked.runId).at(-1).inputChanged, true);

  const unknown = fixture(t);
  const blind = createRun({ root: unknown, entrypoint: 'verify', scope: 'fast', scanProcesses: () => null });
  blind.finish({ exitCode: 0 });
  const blindEnd = records(unknown, blind.runId).at(-1);
  assert.deepEqual([blindEnd.inputChanged, blindEnd.concurrentSuspected, blindEnd.concurrentKinds], [null, null, null]);
  const serialized = JSON.stringify([...records(root, started.value.runId), ...records(root, untracked.runId)]);
  for (const privateValue of [root, 'edited during the run', 'scratch.txt', 'a longer untracked value']) {
    assert.ok(!serialized.includes(JSON.stringify(privateValue).slice(1, -1)), privateValue);
  }
});

test('step samples, staged changes and a deliberate rewrite are seen; an unknown sample never reads as "none"', t => {
  const root = fixture(t, { git: true });
  const sampled = (queue) => ({ root, entrypoint: 'verify', scope: 'integrate', scanProcesses: () => (queue.length ? queue.shift() : []) });
  const stepped = createRun(sampled([[], ['playwright']]));
  const stepStartWarnings = warningsDuring(() => stepped.stepStart('compile'));
  assert.equal(stepStartWarnings.warnings.length, 1, 'a kind first seen at a step start is reported then');
  assert.match(stepStartWarnings.warnings[0], /다시 실행한다: playwright$/);
  stepped.stepEnd('compile', { exitCode: 0 });
  const stepWarnings = warningsDuring(() => stepped.finish({ exitCode: 0 }));
  const steppedEvents = records(root, stepped.runId);
  assert.deepEqual(steppedEvents[1].concurrentKinds, ['playwright']);
  assert.deepEqual([steppedEvents.at(-1).concurrentSuspected, steppedEvents.at(-1).concurrentKinds], [true, ['playwright']]);
  assert.equal(stepWarnings.warnings.length, 1);
  const repeat = warningsDuring(() => createRun(sampled([['vitest'], ['vitest']]))).value;
  const repeatWarnings = warningsDuring(() => repeat.stepStart('compile'));
  assert.deepEqual(repeatWarnings.warnings, [], 'a kind already reported is not repeated at each step');
  repeat.stepEnd('compile', { exitCode: 0 });
  warningsDuring(() => repeat.finish({ exitCode: 0 }));
  for (const [queue, expected] of [
    [[[], null], [null, []]],
    [[null, null], [null, null]],
    [[null, ['vitest']], [true, ['vitest']]],
    [[[], []], [false, []]],
  ]) {
    const run = createRun(sampled(queue));
    warningsDuring(() => run.finish({ exitCode: 0 }));
    const end = records(root, run.runId).at(-1);
    assert.deepEqual([end.concurrentSuspected, end.concurrentKinds], expected, JSON.stringify(queue));
  }

  writeFileSync(join(root, 'tracked.txt'), 'staged during the run\n');
  const staged = createRun(sampled([]));
  execFileSync('git', ['add', 'tracked.txt'], { cwd: root, stdio: 'ignore' });
  warningsDuring(() => staged.finish({ exitCode: 0 }));
  assert.equal(records(root, staged.runId).at(-1).inputChanged, true, 'a staged change alone is an input change');
  commit(root);

  const regen = createRun(sampled([]));
  writeFileSync(join(root, 'tracked.txt'), 'rewritten by regen\n');
  assert.equal(regen.rebaseInputs(), true);
  const rebased = records(root, regen.runId).at(-1);
  assert.equal(rebased.event, 'inputs-rebased');
  assert.match(rebased.inputDigest, /^[0-9a-f]{64}$/);
  const quiet = warningsDuring(() => regen.finish({ exitCode: 0 }));
  assert.equal(records(root, regen.runId).at(-1).inputChanged, false);
  assert.deepEqual(quiet.warnings, []);
  const later = createRun(sampled([]));
  later.rebaseInputs();
  writeFileSync(join(root, 'tracked.txt'), 'edited after the rebase\n');
  warningsDuring(() => later.finish({ exitCode: 0 }));
  assert.equal(records(root, later.runId).at(-1).inputChanged, true);
  commit(root);
  // A commit by someone else before the rebase is not absorbed: HEAD and the index keep their run-start anchor.
  const absorbed = createRun(sampled([]));
  writeFileSync(join(root, 'tracked.txt'), 'committed by another operator\n');
  commit(root);
  absorbed.rebaseInputs();
  warningsDuring(() => absorbed.finish({ exitCode: 0 }));
  assert.equal(records(root, absorbed.runId).at(-1).inputChanged, true, 'a commit before the rebase is still an input change');
  assert.match(records(root, absorbed.runId)[0].anchorDigest, /^[0-9a-f]{64}$/);
  // A half that could not be computed is unknown, never "unchanged": a failed rebase digest, then a tracked edit.
  const lostRebase = createRun(sampled([]));
  const file = join(root, 'build', 'verification-runs', `${lostRebase.runId}.jsonl`);
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, runId: lostRebase.runId, event: 'inputs-rebased', timestamp: new Date().toISOString(), clockNs: process.hrtime.bigint().toString(), inputDigest: null })}\n`, { flag: 'a' });
  writeFileSync(join(root, 'tracked.txt'), 'edited after a lost rebase\n');
  warningsDuring(() => lostRebase.finish({ exitCode: 0 }));
  assert.equal(records(root, lostRebase.runId).at(-1).inputChanged, null, 'an unknown tree half is not reported as unchanged');
  commit(root);
  const lostAnchor = createRun(sampled([]));
  const anchorFile = join(root, 'build', 'verification-runs', `${lostAnchor.runId}.jsonl`);
  const [startLine, ...rest] = readFileSync(anchorFile, 'utf8').trimEnd().split('\n');
  writeFileSync(anchorFile, `${[JSON.stringify({ ...JSON.parse(startLine), anchorDigest: null }), ...rest].join('\n')}\n`);
  warningsDuring(() => lostAnchor.finish({ exitCode: 0 }));
  assert.equal(records(root, lostAnchor.runId).at(-1).inputChanged, null, 'an unknown anchor half is not reported as unchanged');
});

// [2026-10-29 DEC-OPS-390] 시간 초과만 난 Vitest 파일의 단독 재실행은 열린 단계에 이름을 남기고 요약에 보인다. 결과는 바꾸지 않는다.
test('a timeout rerun note names the files on the open step, shows in the summary and never changes the outcome', t => {
  const root = fixture(t, { git: true });
  const run = createRun({ root, entrypoint: 'pre-push', scope: 'source', scanProcesses: () => [] });
  run.stepStart('frontend-invariants');
  const files = ['src/__tests__/cross-stack/tab-destination-contract.test.ts'];
  assert.equal(noteTimeoutRerun(root, run.runId, { files, rerunResult: 'passed' }), true);
  // 경로 밖·형식 밖 이름과 열린 단계가 없는 기록은 남기지 않는다(진단 기록이라 예외도 던지지 않는다).
  for (const bad of [{ files: ['../x.test.ts'], rerunResult: 'passed' }, { files: ['src/../x.test.ts'], rerunResult: 'passed' },
    { files: [], rerunResult: 'passed' }, { files, rerunResult: 'flaky' }]) {
    assert.equal(warningsDuring(() => noteTimeoutRerun(root, run.runId, bad)).value, false, JSON.stringify(bad));
  }
  run.stepEnd('frontend-invariants', { exitCode: 0 });
  assert.equal(warningsDuring(() => noteTimeoutRerun(root, run.runId, { files, rerunResult: 'passed' })).value, false, 'no open step');
  run.finish({ exitCode: 0 });

  const events = records(root, run.runId);
  assert.deepEqual(events.filter(event => event.event === 'step-note').map(({ stageId, note, files: named, rerunResult }) =>
    ({ stageId, note, files: named, rerunResult })), [{ stageId: 'frontend-invariants', note: 'timeout-rerun', files, rerunResult: 'passed' }]);
  assert.equal(events.at(-1).result, 'passed', 'the note does not change the run outcome');
  assert.match(summarizeRuns(root).find(line => line.startsWith(run.runId.slice(0, 8))) ?? '(the run is missing from the summary)',
    / pre-push\/source — timeout-rerun:frontend-invariants\(1\)$/);
});

test('summary lists only anomalous runs, newest first, by short id without paths', t => {
  const root = fixture(t, { git: true });
  const make = (kinds = []) => warningsDuring(() => createRun({ root, entrypoint: 'verify', scope: 'fast', scanProcesses: () => kinds })).value;
  const clean = make();
  clean.finish({ exitCode: 0 });
  const overlapped = make(['node-test']);
  warningsDuring(() => overlapped.finish({ exitCode: 0 }));
  const inconsistent = make();
  inconsistent.stepStart('compile');
  inconsistent.stepEnd('compile', { exitCode: 2 });
  inconsistent.finish({ exitCode: 0 });
  const changed = make();
  writeFileSync(join(root, 'tracked.txt'), 'edited during the summary run\n');
  warningsDuring(() => changed.finish({ exitCode: 0 }));
  const killed = make();
  killed.stepStart('compile');
  // The oddest records are listed, not dropped: an empty file (killed at once) and a cut-off last line.
  const directory = join(root, 'build', 'verification-runs');
  const emptyId = randomUUID();
  writeFileSync(join(directory, `${emptyId}.jsonl`), '');
  const cutId = randomUUID();
  const cutStart = JSON.stringify({ schemaVersion: 1, event: 'run-start', runId: cutId, entrypoint: 'pre-push', scope: 'source',
    timestamp: new Date().toISOString() });
  writeFileSync(join(directory, `${cutId}.jsonl`), `${cutStart}\n{"schemaVersion":1,"runId":"${cutId}","event":"step-`);
  writeFileSync(join(directory, 'notes.jsonl'), 'not a run record\n');

  const lines = summarizeRuns(root);
  assert.equal(lines.length, 6);
  assert.match(lines.find(line => line.startsWith(emptyId.slice(0, 8))), / unknown — empty-record$/);
  assert.match(lines.find(line => line.startsWith(cutId.slice(0, 8))), / pre-push\/source — malformed-record, running-or-killed$/);
  assert.ok(!lines.some(line => line.startsWith(clean.runId.slice(0, 8))));
  const byRun = run => lines.find(line => line.startsWith(run.runId.slice(0, 8)));
  assert.match(byRun(overlapped), / verify\/fast — concurrent:node-test$/);
  assert.match(byRun(inconsistent), / — inconsistent$/);
  assert.match(byRun(changed), / — input-changed$/);
  assert.match(byRun(killed), / — running-or-killed$/);
  assert.match(summarizeRuns(root, Date.now() + 7 * 3_600_000).find(line => line.startsWith(killed.runId.slice(0, 8))), / — no-run-end$/);
  assert.ok(lines.every(line => !line.includes(root) && !line.includes(killed.runId)));
  const stamps = lines.map(line => line.split(' ')[1]);
  assert.deepEqual(stamps, [...stamps].sort().reverse());

  const cli = invoke(root, 'summary');
  assert.equal(cli.status, 0);
  assert.equal(cli.stderr, '');
  assert.deepEqual(cli.stdout.trimEnd().split('\n'), lines);
  const empty = invoke(fixture(t), 'summary');
  assert.deepEqual([empty.status, empty.stdout, empty.stderr], [0, '', '']);
});
