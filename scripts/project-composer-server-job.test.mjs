import test from 'node:test';
import assert from 'node:assert/strict';
import { FAILED_STAGES, VERIFY_STEP_LABELS, applyJobProgress, failJob, jobView, startJob, succeedJob } from './project-composer-server-job.mjs';
import { JOB_STAGES } from './project-composer-timeline.mjs';
import { VERIFICATION_STEP_IDS } from './verify-reusable-artifact.mjs';

const timeline = (overrides = {}) => ({
  stages: JOB_STAGES.map(id => ({ id, status: 'pending', ...(overrides[id] ?? {}) })),
  steps: VERIFICATION_STEP_IDS.map(id => ({ id, status: 'pending', ...(overrides[id] ?? {}) })),
});
const running = () => timeline({ resolve: { status: 'passed', durationMs: 400 }, database: { status: 'passed', durationMs: 27_000 },
  source: { status: 'passed', durationMs: 10_000 }, install: { status: 'passed', durationMs: 9_000 }, verify: { status: 'running', startedAt: 50_000 },
  governance: { status: 'passed', durationMs: 5_000 }, 'ui-governance': { status: 'passed', durationMs: 6_000 }, entrypoints: { status: 'passed', durationMs: 2_000 },
  backend: { status: 'running', startedAt: 70_000 } });

test('progress keeps a well-formed timeline, names the verification step and its position, and never goes back', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 10_000 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running(), estimate: { runs: 3, remainingMs: 120_000, pendingMs: 100_000, running: { id: 'backend', typicalMs: 30_000 } } }, 80_000);
  assert.equal(job.message, '생성 프로젝트 검증 중 · 백엔드 컴파일·테스트 (4/7)');
  assert.ok(job.estimate, 'a well-formed estimate is kept');
  assert.equal(job.progress, 33);
  applyJobProgress(job, { stage: 'verify', progress: 20, timeline: running() }, 81_000);
  assert.equal(job.progress, 33, 'progress does not go back');
  assert.equal(job.estimate, undefined, 'a missing estimate is not kept from an earlier event');
  applyJobProgress(job, { stage: 'verify', progress: 100, timeline: running() }, 82_000);
  assert.equal(job.progress, 99, 'only a finished job reaches 100');
});

test('a malformed timeline is dropped whole and the last good one stays', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 0 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running() }, 1);
  const good = job.timeline;
  const broken = [
    { ...running(), stages: running().stages.slice(1) },
    { ...running(), stages: [...running().stages].reverse() },
    timeline({ resolve: { status: 'done' } }),
    timeline({ resolve: { status: 'passed', startedAt: 1 } }),
    timeline({ resolve: { status: 'running' } }),
    timeline({ resolve: { status: 'pending', durationMs: 5 } }),
    timeline({ resolve: { status: 'passed', durationMs: -1 } }),
    timeline({ backend: { status: 'running', startedAt: 1.5 } }),
    { ...running(), extra: [] , steps: [...running().steps, { id: 'extra', status: 'pending' }] },
    'timeline',
  ];
  for (const value of broken) {
    applyJobProgress(job, { stage: 'verify', progress: 40, timeline: value }, 2);
    assert.equal(job.timeline, good, JSON.stringify(value).slice(0, 80));
  }
});

test('the view counts elapsed time on the server clock, labels each item and never sends engine timestamps', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 10_000 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running(), estimate: { runs: 4, remainingMs: 120_000, pendingMs: 100_000, running: { id: 'backend', typicalMs: 30_000 } } }, 80_000);
  const view = jobView(job, 95_000);
  assert.equal(view.elapsedMs, 85_000);
  assert.equal(view.startedAtMs, undefined);
  assert.deepEqual(view.timeline.stages[0], { id: 'resolve', status: 'passed', durationMs: 400, label: FAILED_STAGES.resolve });
  assert.deepEqual(view.timeline.steps.find(step => step.id === 'backend'), { id: 'backend', status: 'running', elapsedMs: 25_000, label: VERIFY_STEP_LABELS.backend });
  assert.ok(!JSON.stringify(view).includes('startedAt'), 'no engine timestamp leaves the server');
  // 진행 중인 백엔드(보통 30초, 시작 70초)에서만 지난 시간을 뺀다: 95초에는 25초가 지나 5초 + 대기 100초.
  assert.deepEqual(view.estimate, { runs: 4, minRuns: 3, remainingMs: 105_000 }, 'only the running step counts down');
  assert.equal(jobView(job, 500_000).estimate.remainingMs, 100_000, 'an overrunning step never eats the pending steps');
});

test('a running item never counts from before the job started', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 90_000 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running() }, 91_000);
  assert.equal(jobView(job, 95_000).timeline.steps.find(step => step.id === 'backend').elapsedMs, 5_000);
});

test('an estimate without enough history says how many runs exist, and a finished job carries no estimate', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 0 });
  applyJobProgress(job, { stage: 'database', progress: 1, estimate: { runs: 1, remainingMs: null } }, 5);
  assert.deepEqual(jobView(job, 6).estimate, { runs: 1, minRuns: 3, remainingMs: null });
  for (const estimate of [{ runs: -1, remainingMs: null }, { runs: 51, pendingMs: 1, running: null }, { runs: 3, remainingMs: -5 }, { runs: 3 }, { runs: 3, remainingMs: '1' },
    { runs: 3, pendingMs: -1, running: null }, { runs: 3, pendingMs: 1 }, { runs: 3, pendingMs: 1, running: { id: 'verify', typicalMs: 1 } },
    { runs: 3, pendingMs: 1, running: { id: 'backend', typicalMs: '1' } }, { runs: 3, pendingMs: 1, running: { id: 'unknown', typicalMs: 1 } }]) {
    applyJobProgress(job, { stage: 'database', progress: 1, estimate }, 7);
    assert.equal(jobView(job, 8).estimate, undefined, JSON.stringify(estimate));
  }
  applyJobProgress(job, { stage: 'database', progress: 1, estimate: { runs: 3, remainingMs: 10, pendingMs: 10, running: null } }, 9);
  assert.equal(jobView(job, 1_000).estimate.remainingMs, 10, 'with nothing running the pending sum does not count down');
  succeedJob(job, { verified: true }, 20);
  const view = jobView(job, 1_000);
  assert.equal(view.estimate, undefined);
  assert.equal(view.elapsedMs, 20, 'a finished job stops counting at its end');
});

test('the closing failure event keeps the step sentence and drops the estimate while the job cleans up', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 0 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running(), estimate: { runs: 3, remainingMs: 1, pendingMs: 1, running: null } }, 1);
  const closed = timeline({ ...Object.fromEntries(JOB_STAGES.map(id => [id, { status: 'skipped' }])), verify: { status: 'failed', durationMs: 9 },
    ...Object.fromEntries(VERIFICATION_STEP_IDS.map(id => [id, { status: 'skipped' }])), backend: { status: 'failed', durationMs: 5 } });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: closed, estimate: { runs: 3, remainingMs: 0, pendingMs: 0, running: null } }, 2);
  assert.equal(job.message, '생성 프로젝트 검증 중 · 백엔드 컴파일·테스트 (4/7)', 'the sentence does not fall back to the generic stage text');
  assert.equal(jobView(job, 3).estimate, undefined, 'no remaining time once nothing is left');
  assert.equal(jobView(job, 3).timeline.steps.find(step => step.id === 'backend').status, 'failed');
});

test('a finished job freezes a running item at the job end, and a failure carries the final timeline', () => {
  const job = startJob({ id: 'j', requestId: 'r', recipe: {}, now: 10_000 });
  applyJobProgress(job, { stage: 'verify', progress: 33, timeline: running() }, 80_000);
  failJob(job, new Error('x'), 100_000);
  const view = jobView(job, 900_000);
  assert.equal(view.elapsedMs, 90_000);
  assert.equal(view.timeline.steps.find(step => step.id === 'backend').elapsedMs, 30_000);
  assert.equal(view.status, 'failed');
});
