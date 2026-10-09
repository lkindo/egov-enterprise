import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HISTORY_FILE, HISTORY_LIMIT, HISTORY_MIN_RUNS, JOB_STAGES, PROGRESS_WEIGHTS, appendJobHistory, createJobTimeline, estimateRemaining,
  historyEntry, readJobHistory, verificationStepMarkers } from './project-composer-timeline.mjs';
import { VERIFICATION_STEP_IDS, verifyReusableArtifact } from './verify-reusable-artifact.mjs';

function clock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: ms => { now += ms; } };
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'egov-timeline-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('progress weights cover every stage outside verification and every verification step, and add up to 100', () => {
  assert.deepEqual(Object.keys(PROGRESS_WEIGHTS).sort(), [...JOB_STAGES.filter(id => id !== 'verify'), ...VERIFICATION_STEP_IDS].sort());
  assert.equal(Object.values(PROGRESS_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
  assert.ok(Object.values(PROGRESS_WEIGHTS).every(value => Number.isInteger(value) && value > 0));
});

test('the timeline moves stage by stage, measures each stage and raises progress only when a stage ends', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  assert.equal(timeline.snapshot().progress, 0);
  timeline.stage('resolve'); time.advance(400);
  assert.deepEqual(timeline.snapshot().stages[0], { id: 'resolve', status: 'running', startedAt: 1_000_000 });
  assert.equal(timeline.snapshot().progress, 0, 'a running stage adds nothing');
  timeline.stage('database'); time.advance(27_000);
  const snapshot = timeline.snapshot();
  assert.deepEqual(snapshot.stages.slice(0, 3), [
    { id: 'resolve', status: 'passed', durationMs: 400 },
    { id: 'database', status: 'running', startedAt: 1_000_400 },
    { id: 'source', status: 'pending' },
  ]);
  assert.equal(snapshot.progress, PROGRESS_WEIGHTS.resolve);
  assert.equal(timeline.stage('database'), false, 'the same stage twice is ignored');
  assert.equal(timeline.stage('complete'), false, 'an unknown stage is ignored');
});

test('verification steps advance only during verification, in a forward order, and each finished step adds its weight', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  timeline.stage('install');
  assert.equal(timeline.step('governance'), false, 'no step outside verification');
  timeline.stage('verify');
  assert.equal(timeline.step('unknown'), false);
  assert.equal(timeline.step('governance'), true); time.advance(5_000);
  assert.equal(timeline.step('backend'), true); time.advance(300_000);
  assert.equal(timeline.step('governance'), false, 'a finished step does not start again');
  assert.equal(timeline.step('backend'), false, 'the running step does not restart');
  const steps = timeline.snapshot().steps;
  assert.deepEqual(steps.find(step => step.id === 'governance'), { id: 'governance', status: 'passed', durationMs: 5_000 });
  assert.equal(steps.find(step => step.id === 'backend').status, 'running');
  assert.equal(timeline.snapshot().progress, PROGRESS_WEIGHTS.install + PROGRESS_WEIGHTS.governance);
});

test('a step the verifier finished is never blamed for a later failure', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  for (const stage of JOB_STAGES) timeline.stage(stage);
  for (const step of VERIFICATION_STEP_IDS) { timeline.step(step); time.advance(1_000); }
  timeline.endSteps();
  timeline.finish('failed');
  const { stages, steps } = timeline.snapshot();
  assert.equal(stages.at(-1).status, 'failed', 'the verification stage carries the failure');
  assert.ok(steps.every(step => step.status === 'passed'), 'every step the verifier ran stays passed');
});

test('a failure marks the running stage and step failed and everything not started as skipped', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  timeline.stage('verify'); timeline.step('governance'); time.advance(1_000); timeline.step('lint'); time.advance(38_000);
  timeline.finish('failed');
  const { stages, steps, progress } = timeline.snapshot();
  assert.deepEqual(stages.map(stage => stage.status), ['skipped', 'skipped', 'skipped', 'skipped', 'failed']);
  assert.deepEqual(steps.find(step => step.id === 'lint'), { id: 'lint', status: 'failed', durationMs: 38_000 });
  assert.equal(steps.find(step => step.id === 'build').status, 'skipped');
  assert.equal(steps.find(step => step.id === 'backend').status, 'skipped', 'a step the verifier never announced was not run');
  assert.equal(progress, PROGRESS_WEIGHTS.governance);
  assert.ok(steps.every(step => step.status !== 'running' && step.startedAt === undefined));
});

test('a passed verification takes the step times the verifier measured, and steps it never announced still passed', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  for (const stage of JOB_STAGES) { timeline.stage(stage); time.advance(1_000); }
  timeline.step('governance'); time.advance(2_000);
  timeline.finish('passed', { verificationSteps: [{ step: 'governance', result: 'passed', durationMs: 1_500 },
    { step: 'backend', result: 'passed', durationMs: 300_000 }, { step: 'lint', result: 'failed', durationMs: 9 }] });
  const { stages, steps, progress } = timeline.snapshot();
  assert.ok(stages.every(stage => stage.status === 'passed'));
  assert.ok(steps.every(step => step.status === 'passed'));
  assert.equal(steps.find(step => step.id === 'governance').durationMs, 1_500, 'the verifier measurement wins');
  assert.equal(steps.find(step => step.id === 'backend').durationMs, 300_000);
  assert.equal(steps.find(step => step.id === 'lint').durationMs, undefined, 'only a passed measurement is used');
  assert.equal(progress, 100);
});

test('the step markers are exactly the headers the real verifier prints, in step order, for both layouts', t => {
  for (const layout of ['multi-module', 'single-module']) {
    const root = fixture(t);
    writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify({ profile: 'custom', layout }));
    const printed = [];
    const original = process.stdout.write;
    process.stdout.write = chunk => { printed.push(String(chunk).replace(/\n$/, '')); return true; };
    try { verifyReusableArtifact({ root, scope: 'full', run: () => '' }); } finally { process.stdout.write = original; }
    const markers = verificationStepMarkers({ profile: 'custom', layout });
    assert.deepEqual(printed.map(line => markers.get(line)), [...VERIFICATION_STEP_IDS], layout);
  }
});

test('the history keeps the last 50 valid entries, ignores a broken file and leaves no temporary file behind', t => {
  const root = fixture(t);
  assert.deepEqual(readJobHistory(root), []);
  mkdirSync(join(root, 'build/project-composer'), { recursive: true });
  writeFileSync(join(root, HISTORY_FILE), '{"schemaVersion":1,"entries":[');
  assert.deepEqual(readJobHistory(root), [], 'a broken index is an empty history');
  const entry = index => ({ job: `p-${index}`, finishedAt: new Date(Date.UTC(2026, 9, 9, 0, index)).toISOString(), result: 'passed', layout: 'single-module', durations: { resolve: index } });
  for (let index = 0; index < HISTORY_LIMIT + 5; index++) appendJobHistory(root, entry(index));
  const history = readJobHistory(root);
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0].job, 'p-5');
  assert.equal(history.at(-1).job, `p-${HISTORY_LIMIT + 4}`);
  assert.deepEqual(readdirSync(join(root, 'build/project-composer')), ['history.json']);
  assert.throws(() => appendJobHistory(root, { ...entry(1), durations: { unknown: 1 } }), /Invalid job history entry/);
  assert.throws(() => appendJobHistory(root, { ...entry(1), job: '../x' }), /Invalid job history entry/);
  const valid = readFileSync(join(root, HISTORY_FILE), 'utf8');
  writeFileSync(join(root, HISTORY_FILE), valid.replace('"result": "passed"', '"result": "maybe"'));
  assert.equal(readJobHistory(root).length, HISTORY_LIMIT - 1, 'an entry that is not well formed is dropped on read');
});

test('a history entry keeps only measured items', () => {
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  timeline.stage('resolve'); time.advance(10); timeline.stage('database'); time.advance(20); timeline.finish('failed');
  assert.deepEqual(historyEntry({ job: 'p-1', layout: 'multi-module', result: 'failed', finishedAt: '2026-10-09T00:00:00.000Z', snapshot: timeline.snapshot() }),
    { job: 'p-1', finishedAt: '2026-10-09T00:00:00.000Z', result: 'failed', layout: 'multi-module', durations: { resolve: 10, database: 20 } });
});

test('the remaining time uses the median of the same layout’s passed runs, needs three of them and never goes below zero', () => {
  const run = (layout, result, durations) => ({ job: 'x', finishedAt: '2026-10-09T00:00:00.000Z', result, layout, durations });
  const full = scale => Object.fromEntries([...JOB_STAGES.filter(id => id !== 'verify'), ...VERIFICATION_STEP_IDS].map(id => [id, 1_000 * scale]));
  const time = clock();
  const timeline = createJobTimeline({ now: time.now });
  for (const stage of JOB_STAGES) { timeline.stage(stage); time.advance(10); }
  timeline.step('governance'); time.advance(1_500);
  const snapshot = timeline.snapshot();
  const history = [run('single-module', 'passed', full(1)), run('single-module', 'passed', full(2)), run('multi-module', 'passed', full(50)),
    run('single-module', 'failed', full(90))];
  assert.deepEqual(estimateRemaining(history, { layout: 'single-module', snapshot, now: time.now() }), { runs: 2, remainingMs: null },
    'two runs of the same layout are not enough; other layouts and failures do not count');
  history.push(run('single-module', 'passed', full(9)));
  // 남은 것: 진행 중인 거버넌스(중앙값 2초 − 1.5초 경과) + 대기 중인 검증 6단계(각 2초). 지나간 단계는 세지 않는다.
  // 1·2·9초의 중앙값은 2초다(평균이면 4초).
  // 대기 중인 단계의 합과 진행 중인 단계의 보통 시간을 나눠 준다(받는 쪽이 진행 중인 단계에서만 시간을 뺀다).
  assert.deepEqual(estimateRemaining(history, { layout: 'single-module', snapshot, now: time.now() }),
    { runs: 3, remainingMs: 500 + 6 * 2_000, pendingMs: 6 * 2_000, running: { id: 'governance', typicalMs: 2_000 } });
  time.advance(60_000);
  assert.equal(estimateRemaining(history, { layout: 'single-module', snapshot, now: time.now() }).remainingMs, 6 * 2_000, 'an overrun step adds nothing');
  // 남은 단계가 없으면(끝난 작업) 추정 자체를 하지 않는다 — 끝나는 순간 '0초 남음'·'기록 부족' 을 말하지 않는다.
  const ended = createJobTimeline({ now: time.now });
  for (const stage of JOB_STAGES) ended.stage(stage);
  ended.finish('failed');
  assert.equal(estimateRemaining(history, { layout: 'single-module', snapshot: ended.snapshot(), now: time.now() }), undefined);
  // 검증 중 첫 머리줄 전에는 진행 중인 단계 없이 대기 단계의 합만 준다.
  const waiting = createJobTimeline({ now: time.now });
  for (const stage of JOB_STAGES) waiting.stage(stage);
  assert.deepEqual(estimateRemaining(history, { layout: 'single-module', snapshot: waiting.snapshot(), now: time.now() }),
    { runs: 3, remainingMs: 7 * 2_000, pendingMs: 7 * 2_000, running: null });
  // 기록이 3건이어도 남은 단계의 측정값이 3개 미만이면 추정하지 않는다(단계 시간을 잃은 기록이 섞인 경우).
  const { build, ...withoutBuild } = full(9);
  assert.equal(build, 9_000);
  assert.deepEqual(estimateRemaining([...history.slice(0, 2), run('single-module', 'passed', withoutBuild)], { layout: 'single-module', snapshot, now: time.now() }),
    { runs: 3, remainingMs: null });
  assert.equal(HISTORY_MIN_RUNS, 3);
});
