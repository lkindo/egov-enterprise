import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import {
  BudgetError, UsageError, ciRuleViolations, classifyJob, collectReport, createGh, errorSignature, executedJobs,
  matchDiagnosticsArtifact, parseOptions, readZipEntry, recoveredByRerun, renderText, testOutcomes,
} from './ci-flaky-report.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ciYaml = readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, text, method = 8 } of entries) {
    const raw = Buffer.from(text, 'utf8');
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const nameBytes = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const results = (tests) => ({ suites: [{ title: 'root', suites: [{ title: 'nested', specs: [{ file: 'quality/a.spec.ts', line: 7, title: 'a', tests }] }] }] });

test('options are bounded and reject unknown or unsafe values', () => {
  assert.deepEqual(parseOptions([]), { runs: 40, branch: null, event: null, maxCalls: 200, json: false });
  assert.deepEqual(parseOptions(['--runs', '5', '--branch', 'main', '--event', 'push', '--json']).runs, 5);
  for (const argv of [['--runs', '0'], ['--runs', '101'], ['--runs', '1e3'], ['--branch', 'a;b'], ['--event', 'schedule'], ['--max-calls', '1001'], ['--what'], ['--runs']]) {
    assert.throws(() => parseOptions(argv), UsageError, argv.join(' '));
  }
});

test('classification rules name real ci.yml steps, and a renamed step is red', () => {
  assert.deepEqual(ciRuleViolations(ciYaml), []);
  const renamed = ciYaml.replace('- name: Build API image\n', '- name: Build image\n').replace('- name: Build API image\r\n', '- name: Build image\r\n');
  assert.notEqual(renamed, ciYaml);
  assert.deepEqual(ciRuleViolations(renamed), ['Build API image']);
});

test('jobs are classified by their first failing step, aggregates are derived, unknown steps keep their names', () => {
  const job = (name, conclusion, steps) => ({ name, conclusion, steps });
  assert.equal(classifyJob(job('e2e-tests (1/2)', 'success', [])), null);
  assert.deepEqual(classifyJob(job('e2e-tests (1/2)', 'failure', [{ name: 'Install Playwright Dependencies (system deps)', conclusion: 'failure' }, { name: 'Run E2E Tests (Sharded)', conclusion: 'skipped' }])),
    { cause: 'infra:playwright-install', step: 'Install Playwright Dependencies (system deps)' });
  assert.deepEqual(classifyJob(job('e2e-tests (2/2)', 'failure', [{ name: 'Build API image', conclusion: 'failure' }])), { cause: 'infra:docker-build', step: 'Build API image' });
  assert.deepEqual(classifyJob(job('e2e-test', 'failure', [])), { cause: 'derived', step: null });
  assert.deepEqual(classifyJob(job('x', 'failure', [{ name: 'Set up job', conclusion: 'failure' }])), { cause: 'infra:runner-setup', step: 'Set up job' });
  assert.deepEqual(classifyJob(job('x', 'failure', [{ name: 'Brand new step', conclusion: 'failure' }])), { cause: 'unclassified', step: 'Brand new step' });
  assert.deepEqual(classifyJob(job('x', 'cancelled', [])), { cause: 'cancelled', step: null });
  // 동시성·수동 취소와 잡 시간 상한은 취소된 스텝을 남긴다 — 그 스텝의 원인 규칙(인프라·시험)으로 세지 않는다.
  assert.deepEqual(classifyJob(job('e2e-tests (1/2)', 'cancelled', [{ name: 'Install Playwright Dependencies (system deps)', conclusion: 'cancelled' }])),
    { cause: 'cancelled', step: 'Install Playwright Dependencies (system deps)' });
  assert.deepEqual(classifyJob(job('backend-scope', 'cancelled', [{ name: 'Build and Test with Gradle', conclusion: 'cancelled' }])),
    { cause: 'cancelled', step: 'Build and Test with Gradle' });
});

test('copied jobs of earlier attempts are dropped and reruns that recovered are marked', () => {
  const failed = { name: 'e2e-tests (1/2)', conclusion: 'failure', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:05:00Z' };
  const passedOther = { name: 'e2e-tests (2/2)', conclusion: 'success', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:06:00Z' };
  const rerun = { ...failed, conclusion: 'success', started_at: '2026-01-01T01:00:00Z', completed_at: '2026-01-01T01:05:00Z' };
  const executed = executedJobs([{ attempt: 2, jobs: [passedOther, rerun] }, { attempt: 1, jobs: [failed, passedOther] }]);
  assert.equal(executed.length, 3, '시도 2가 복사해 돌려준 성공 잡은 한 번만 센다');
  assert.equal(recoveredByRerun(executed.find(job => job.conclusion === 'failure'), executed), true);
  assert.equal(recoveredByRerun({ ...rerun, attempt: 2 }, executed), false, '마지막 시도의 잡은 회복 여부를 말할 뒤 시도가 없다');
});

test('diagnostics artifacts are matched by shard and the job time window', () => {
  const job = { name: 'e2e-tests (2/2)', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:10:00Z' };
  const artifacts = [
    { id: 1, name: 'e2e-diagnostics-shard-1', created_at: '2026-01-01T01:30:00Z', expired: false },
    { id: 2, name: 'e2e-diagnostics-shard-1', created_at: '2026-01-01T00:09:59Z', expired: false },
    { id: 3, name: 'e2e-diagnostics-shard-0', created_at: '2026-01-01T00:05:00Z', expired: false },
  ];
  assert.equal(matchDiagnosticsArtifact(artifacts, job)?.id, 2);
  assert.equal(matchDiagnosticsArtifact([{ ...artifacts[1], expired: true }], job), null);
  assert.equal(matchDiagnosticsArtifact(artifacts, { ...job, name: 'backend-scope' }), null);
});

test('zip entries are read in memory with exact-name, size and method checks', () => {
  const body = JSON.stringify({ suites: [] });
  assert.equal(readZipEntry(makeZip([{ name: 'tmp/e2e-results.json', text: body }]), 'e2e-results.json').toString('utf8'), body);
  assert.equal(readZipEntry(makeZip([{ name: 'e2e-results.json', text: body, method: 0 }]), 'e2e-results.json').toString('utf8'), body);
  assert.throws(() => readZipEntry(makeZip([{ name: 'a/e2e-results.json', text: body }, { name: 'b/e2e-results.json', text: body }]), 'e2e-results.json'), /2개/u);
  assert.throws(() => readZipEntry(makeZip([{ name: 'other.json', text: body }]), 'e2e-results.json'), /0개/u);
  assert.throws(() => readZipEntry(makeZip([{ name: 'e2e-results.json', text: 'x'.repeat(64) }]), 'e2e-results.json', { maxBytes: 16 }), /상한/u);
  assert.throws(() => readZipEntry(Buffer.from('not a zip'), 'e2e-results.json'), /끝 레코드/u);
});

test('flaky and unexpected tests are collected through nested suites with a representative signature', () => {
  const outcomes = testOutcomes(results([
    { status: 'expected', results: [] },
    { status: 'flaky', results: [{ errors: [{ message: '\u001b[31mAggregateError: Actor page observation failed.\u001b[39m' }, { message: 'Error: Minified React error #418; visit https://react.dev' }] }, { errors: [] }] },
    { status: 'unexpected', results: [{ errors: [{ message: 'TimeoutError: page.waitForResponse: Timeout\n  at x' }] }] },
    { status: 'skipped', results: [] },
  ]));
  assert.deepEqual(outcomes.map(({ status, signature }) => [status, signature]),
    [['flaky', 'React #418'], ['unexpected', 'TimeoutError: page.waitForResponse: Timeout']]);
  assert.equal(errorSignature(''), '(메시지 없음)');
  // 시험이 모두 기대대로여도 전역 오류만으로 샤드가 붉을 수 있다 — 그 원인을 남긴다.
  assert.deepEqual(testOutcomes({ ...results([{ status: 'expected', results: [] }]), errors: [{ message: 'Error: globalSetup failed\n  at setup' }] })
    .map(({ status, signature }) => [status, signature]), [['global-error', 'Error: globalSetup failed']]);
  assert.throws(() => testOutcomes({}), /형식/u);
});

test('the gh caller retries 5xx twice, never 4xx, and stops at the call budget', () => {
  const failing = (codes) => {
    const queue = [...codes];
    return () => {
      const code = queue.shift();
      if (code === 200) return '{"ok":true}';
      throw Object.assign(new Error('gh failed'), { stderr: `HTTP ${code}` });
    };
  };
  assert.deepEqual(createGh({ maxCalls: 10, exec: failing([502, 503, 200]) }).call('x'), { ok: true });
  assert.throws(() => createGh({ maxCalls: 10, exec: failing([502, 502, 502]) }).call('x'), /gh failed/);
  const notFound = createGh({ maxCalls: 10, exec: failing([404, 200]) });
  assert.throws(() => notFound.call('x'), /gh failed/);
  assert.equal(notFound.calls(), 1, '4xx 는 다시 묻지 않는다');
  const budget = createGh({ maxCalls: 1, exec: failing([200, 200]) });
  budget.call('x');
  assert.throws(() => budget.call('x'), BudgetError);
});

test('a report joins runs, attempts, causes and E2E outcomes, and lists what it could not read', () => {
  const zip = makeZip([{ name: 'tmp/e2e-results.json', text: JSON.stringify(results([{ status: 'flaky', results: [{ errors: [{ message: 'Error: Minified React error #418' }] }] }])) }]);
  const responses = {
    'repos/o/r/actions/workflows/ci.yml/runs?per_page=2': { workflow_runs: [
      { id: 11, run_attempt: 2, created_at: '2026-01-02T00:00:00Z' }, { id: 10, run_attempt: 1, created_at: '2026-01-01T00:00:00Z' }] },
    'repos/o/r/actions/runs/11/attempts/1/jobs?per_page=100': { jobs: [
      { name: 'e2e-tests (1/2)', conclusion: 'failure', started_at: '2026-01-02T00:00:00Z', completed_at: '2026-01-02T00:05:00Z', steps: [{ name: 'Install Playwright Dependencies (system deps)', conclusion: 'failure' }] },
      { name: 'e2e-test', conclusion: 'failure', started_at: '2026-01-02T00:06:00Z', completed_at: '2026-01-02T00:06:10Z', steps: [] }] },
    'repos/o/r/actions/runs/11/attempts/2/jobs?per_page=100': { jobs: [
      { name: 'e2e-tests (1/2)', conclusion: 'failure', started_at: '2026-01-02T01:00:00Z', completed_at: '2026-01-02T01:09:00Z', steps: [{ name: 'Run E2E Tests (Sharded)', conclusion: 'failure' }] }] },
    'repos/o/r/actions/runs/11/artifacts?per_page=100': { artifacts: [{ id: 99, name: 'e2e-diagnostics-shard-0', created_at: '2026-01-02T01:08:59Z', expired: false }] },
    'repos/o/r/actions/runs/10/attempts/1/jobs?per_page=100': { jobs: [
      { name: 'e2e-tests (2/2)', conclusion: 'failure', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:09:00Z', steps: [{ name: 'Run E2E Tests (Sharded)', conclusion: 'failure' }] }] },
    'repos/o/r/actions/runs/10/artifacts?per_page=100': { artifacts: [] },
  };
  const gh = { call: (endpoint, { binary } = {}) => (binary ? zip : responses[endpoint] ?? assert.fail(`unexpected ${endpoint}`)) };
  const report = collectReport({ gh, slug: 'o/r', options: { runs: 2, branch: null, event: null } });
  assert.deepEqual(report.failures.map(({ run, attempt, cause }) => [run, attempt, cause]),
    [[11, 1, 'infra:playwright-install'], [11, 2, 'test:e2e'], [10, 1, 'test:e2e']]);
  assert.deepEqual(report.tests.map(({ run, status, signature }) => [run, status, signature]), [[11, 'flaky', 'React #418']]);
  assert.equal(report.gaps.length, 1, '진단 산출물이 없는 실행은 읽지 못한 자료로 남긴다');
  const text = renderText(report);
  assert.match(text, /infra:playwright-install: 1 \(회복 0\)/u);
  assert.match(text, /flaky 1 · 실패 0: quality\/a\.spec\.ts:7 a \| React #418/u);
  assert.match(text, /## 읽지 못한 자료/u);
});

// 취소된 샤드는 산출물을 읽지 않고, 깨진 산출물·원인 없는 실패는 보고를 멈추지 않고 읽지 못한 자료로 남는다.
test('cancelled shards, broken artifacts and unexplained failures do not abort the report', () => {
  const window = (minute) => ({ started_at: `2026-01-03T00:${minute}:00Z`, completed_at: `2026-01-03T00:${minute}:30Z` });
  const zips = {
    1: makeZip([{ name: 'tmp/other.json', text: '{}' }]),
    2: makeZip([{ name: 'tmp/e2e-results.json', text: '{not json' }]),
    3: makeZip([{ name: 'tmp/e2e-results.json', text: JSON.stringify(results([{ status: 'expected', results: [] }])) }]),
  };
  const responses = {
    'repos/o/r/actions/workflows/ci.yml/runs?per_page=2': { workflow_runs: [
      { id: 21, run_attempt: 1, conclusion: 'failure', created_at: '2026-01-03T00:00:00Z' },
      { id: 20, run_attempt: 1, conclusion: 'cancelled', created_at: '2026-01-02T23:00:00Z' }] },
    'repos/o/r/actions/runs/21/attempts/1/jobs?per_page=100': { jobs: [1, 2, 3].map(shard => ({
      name: `e2e-tests (${shard}/3)`, conclusion: 'failure', ...window(`1${shard}`), steps: [{ name: 'Run E2E Tests (Sharded)', conclusion: 'failure' }] })) },
    'repos/o/r/actions/runs/21/artifacts?per_page=100': { artifacts: [1, 2, 3].map(shard => ({
      id: shard, name: `e2e-diagnostics-shard-${shard - 1}`, created_at: `2026-01-03T00:1${shard}:20Z`, expired: false })) },
    'repos/o/r/actions/runs/20/attempts/1/jobs?per_page=100': { jobs: [
      { name: 'e2e-tests (1/2)', conclusion: 'cancelled', ...window('05'), steps: [{ name: 'Run E2E Tests (Sharded)', conclusion: 'cancelled' }] }] },
  };
  const zipFor = endpoint => zips[endpoint.match(/artifacts\/(\d+)\/zip$/)?.[1]] ?? assert.fail(`unexpected ${endpoint}`);
  const gh = { call: (endpoint, { binary } = {}) => (binary ? zipFor(endpoint) : responses[endpoint] ?? assert.fail(`unexpected ${endpoint}`)) };
  const report = collectReport({ gh, slug: 'o/r', options: { runs: 2, branch: null, event: null } });
  assert.deepEqual(report.failures.map(({ run, cause }) => [run, cause]),
    [[21, 'test:e2e'], [21, 'test:e2e'], [21, 'test:e2e'], [20, 'cancelled']]);
  assert.deepEqual(report.tests, []);
  assert.equal(report.gaps.length, 3, report.gaps.join('\n'));
  assert.match(report.gaps[0], /e2e-results\.json 가 0개다/u);
  assert.match(report.gaps[1], /진단 산출물을 읽지 못함/u);
  assert.match(report.gaps[2], /실패 원인이 시험·전역 오류 결과에 없다/u);
  assert.match(renderText(report), /cancelled: 1 \(회복 0\) \[원인 아님/u);
  // 예산 초과는 부분 결과를 내지 않는다 — 산출물 읽기 중에 닿아도 그대로 멈춘다.
  const budget = { call: (endpoint, options) => { if (options?.binary) throw new BudgetError('budget'); return gh.call(endpoint, options); } };
  assert.throws(() => collectReport({ gh: budget, slug: 'o/r', options: { runs: 2, branch: null, event: null } }), BudgetError);
});
