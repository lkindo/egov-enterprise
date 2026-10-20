import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun } from './verification-record.mjs';

const script = fileURLToPath(new URL('./verification-record.mjs', import.meta.url));

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
  assert.equal(run.finish({ exitCode: 0 }), true);

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
  run.finish({ exitCode: 0 });
  run.finish({ exitCode: 1 });
  const events = records(root, run.runId);
  assert.equal(events.filter(event => event.event === 'run-end').length, 1);
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
