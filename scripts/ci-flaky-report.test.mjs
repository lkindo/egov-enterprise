import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import {
  BudgetError, UsageError, ciRuleViolations, classifyJob, collectReport, collectScheduled, createGh, dependencyResolutionSignature,
  errorSignature, executedJobs, isDependabotRun, matchDiagnosticsArtifact, parseOptions, queueWaits, readZipEntry, recoveredByRerun,
  renderScheduled, renderText, repositoryScheduledWorkflows, scheduledStatus, scheduledWorkflowFiles, stepLogLines, stepNameMatches,
  summarizeQueueWaits, testOutcomes, workflowNeeds,
} from './ci-flaky-report.mjs';
import { parseWorkflowJobs } from './required-checks-contract.mjs';

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
  assert.deepEqual(parseOptions([]), { runs: 40, branch: null, event: null, maxCalls: 200, json: false, scheduledOnly: false });
  assert.deepEqual(parseOptions(['--runs', '5', '--branch', 'main', '--event', 'push', '--json']).runs, 5);
  assert.equal(parseOptions(['--scheduled-only']).scheduledOnly, true);
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

// [2026-10-29] 감사 D3-5: 분류 규칙이 없던 다섯 스텝. 매트릭스 템플릿 이름도 ci.yml 원문과 대조한다.
test('the added step rules name real ci.yml steps, templated names match executed names, and only the shard aggregation is derived', () => {
  assert.deepEqual(ciRuleViolations(ciYaml), []);
  const normalized = ciYaml.replace(/\r\n/g, '\n');
  const template = 'Run measured migration test shard (${{ matrix.shard }})';
  const renamed = normalized.replace(`- name: ${template}\n`, '- name: Run migration shard (${{ matrix.shard }})\n');
  assert.notEqual(renamed, normalized);
  assert.deepEqual(ciRuleViolations(renamed), [template]);
  const job = (name, step) => ({ name, conclusion: 'failure', steps: [{ name: step, conclusion: 'failure' }] });
  for (const [jobName, step, cause] of [
    ['secret-scan', 'Verify repository operational contracts', 'test:operational-contracts'],
    ['migration-test-scope (2/3)', 'Run measured migration test shard (2/3)', 'test:migration'],
    ['migration-scope', 'Require every migration test shard to succeed', 'derived'],
    ['reusable-base (core, multi-module)', 'Generate and verify reusable profile', 'test:reusable-profile'],
    ['sast-scope (java)', 'Enforce secure coding policy', 'test:secure-coding'],
    // 집계 스텝만 파생이다 — 같은 잡의 실제 검증 스텝은 원인으로 남는다.
    ['migration-scope', 'Verify the independent migration module', 'unclassified'],
    ['migration-test-scope (2/3)', 'Run measured migration test shard ()', 'unclassified'],
  ]) {
    assert.equal(classifyJob(job(jobName, step)).cause, cause, step);
  }
  assert.equal(stepNameMatches(template, 'Run measured migration test shard (1/3)'), true);
  assert.equal(stepNameMatches(template, 'Run measured migration test shard (1/3) again'), false);
  assert.equal(stepNameMatches('a ${{ x }} b ${{ y }} c', 'a 1 b 2 c'), true);
  assert.equal(stepNameMatches('a ${{ x }} b ${{ y }} c', 'a 1 c'), false);
  assert.equal(stepNameMatches('Build API image', 'Build API image 2'), false);
});

test('dependency resolution 4xx/5xx is read only from the stopped step of the job log', () => {
  const gradle429 = "> Could not GET 'https://repo.maven.apache.org/maven2/org/testcontainers/testcontainers-mariadb/2.0.5/testcontainers-mariadb-2.0.5.pom'. Received status code 429 from server: Too Many Requests";
  assert.equal(dependencyResolutionSignature([`               ${gradle429}`]), 'HTTP 429 repo.maven.apache.org');
  assert.equal(dependencyResolutionSignature(["> Could not HEAD 'https://plugins.gradle.org/m2/x.pom'. Received status code 502 from server: Bad Gateway"]), 'HTTP 502 plugins.gradle.org');
  assert.equal(dependencyResolutionSignature(['[ERROR] Could not transfer artifact a:b:pom:1 from/to central (https://repo.maven.apache.org/maven2): status code: 503, reason phrase: Service Unavailable (503)']),
    'HTTP 503 repo.maven.apache.org');
  for (const unrelated of [
    ['> Could not find org.apache.httpcomponents.client5:httpclient5:5.5.'],
    ['AuthControllerTest > logout() FAILED', 'expected: <200> but was: <500>'],
    ['the app under test: Received status code 503'],
    ["> Could not GET 'https://repo.maven.apache.org/x'. Received status code 304 from server"],
  ]) assert.equal(dependencyResolutionSignature(unrelated), null, unrelated.join(' | '));
  const log = [
    '\uFEFF2026-10-20T00:20:00.1000000Z ##[group]Run ./gradlew --version',
    "2026-10-20T00:20:01.2000000Z > Could not GET 'https://services.gradle.org/x'. Received status code 503 from server: retrying",
    '2026-10-20T00:27:12.0000000Z ##[group]Run ./gradlew build',
    '2026-10-20T00:27:40.7318913Z > Could not resolve all files for configuration',
    `2026-10-20T00:27:40.7335469Z ${gradle429}`,
    'continuation line without timestamp',
  ].join('\r\n');
  const step = { started_at: '2026-10-20T00:27:12Z', completed_at: '2026-10-20T00:27:41Z' };
  const lines = stepLogLines(log, step);
  assert.equal(lines[0], '##[group]Run ./gradlew build');
  assert.equal(lines.at(-1), 'continuation line without timestamp');
  assert.equal(dependencyResolutionSignature(lines), 'HTTP 429 repo.maven.apache.org');
  // 앞 스텝(재시도로 넘어간 배포판 내려받기)의 503 은 이 스텝의 원인이 아니다.
  const testOnly = log.replace(gradle429, '> There were failing tests.');
  assert.notEqual(testOnly, log);
  assert.equal(dependencyResolutionSignature(stepLogLines(testOnly, step)), null);
  assert.equal(dependencyResolutionSignature(stepLogLines(testOnly, null)), 'HTTP 503 services.gradle.org', '스텝 시각이 없으면 전체 로그를 본다');
});

test('Dependabot runs are recognized by actor or head branch', () => {
  assert.equal(isDependabotRun({ actor: { login: 'dependabot[bot]' }, head_branch: 'main' }), true);
  assert.equal(isDependabotRun({ actor: { login: 'lkindo' }, head_branch: 'dependabot/gradle/x-1.2' }), true);
  assert.equal(isDependabotRun({ actor: { login: 'lkindo' }, head_branch: 'fix/dependabot-notes' }), false);
  assert.equal(isDependabotRun({}), false);
});

test('runner queue wait is measured from the later of job creation and the completion of its needs', () => {
  const needs = workflowNeeds(ciYaml);
  assert.deepEqual(needs.get('backend-build'), ['change-scope', 'backend-scope', 'backend-schema-scope', 'migration-scope', 'reusable-base', 'reusable-custom']);
  assert.deepEqual(needs.get('e2e-merge-reports'), ['e2e-tests']);
  assert.deepEqual(needs.get('change-scope'), []);
  assert.deepEqual(workflowNeeds('jobs:\n  a:\n    runs-on: x\n  b:\n    needs:\n      - a\n      - "c"\n    runs-on: x\n').get('b'), ['a', 'c']);
  const t = (second) => new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString();
  const ran = [{ name: 's', conclusion: 'success' }];
  const changeScope = { name: 'change-scope', conclusion: 'success', created_at: t(0), started_at: t(5), completed_at: t(60), steps: ran };
  const attempts = [
    { attempt: 1, jobs: [
      changeScope,
      { name: 'backend-scope', conclusion: 'failure', created_at: t(1), started_at: t(90), completed_at: t(200), steps: ran },
      { name: 'backend-build', conclusion: 'failure', created_at: t(1), started_at: t(230), completed_at: t(240), steps: ran },
      { name: 'frontend-scope', conclusion: 'skipped', created_at: t(1), started_at: t(1), completed_at: t(1), steps: [] },
    ] },
    { attempt: 2, jobs: [
      changeScope,
      { name: 'backend-scope', conclusion: 'success', created_at: t(1000), started_at: t(1010), completed_at: t(1100), steps: ran },
      { name: 'backend-build', conclusion: 'success', created_at: t(1000), started_at: t(1130), completed_at: t(1140), steps: ran },
    ] },
  ];
  const waits = queueWaits(attempts, needs);
  assert.deepEqual(waits.map(({ attempt, job, waitSeconds }) => [attempt, job, waitSeconds]),
    [[1, 'change-scope', 5], [1, 'backend-scope', 30], [1, 'backend-build', 30], [2, 'backend-scope', 10], [2, 'backend-build', 30]]);
  // needs 완료를 보지 않으면 앞 잡을 기다린 시간까지 러너 대기로 센다.
  assert.equal(queueWaits(attempts, new Map()).find(wait => wait.job === 'backend-scope').waitSeconds, 89);
  assert.deepEqual(summarizeQueueWaits([...waits, { job: 'backend-scope', waitSeconds: 50 }]).map(({ job, count, median, max }) => [job, count, median, max]),
    [['backend-scope', 3, 30, 50], ['backend-build', 2, 30, 30], ['change-scope', 1, 5, 5]]);
});

test('a report reclassifies dependency-resolution failures from job logs, separates Dependabot runs and lists runner waits', () => {
  const at = (minute, second = 0) => `2026-01-05T00:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;
  const responses = {
    'repos/o/r/actions/workflows/ci.yml/runs?per_page=2': { workflow_runs: [
      { id: 31, run_attempt: 1, created_at: at(0), actor: { login: 'lkindo' }, head_branch: 'feature' },
      { id: 30, run_attempt: 1, created_at: at(0), actor: { login: 'dependabot[bot]' }, head_branch: 'dependabot/gradle/x' }] },
    'repos/o/r/actions/runs/31/attempts/1/jobs?per_page=100': { jobs: [
      { id: 1, name: 'change-scope', conclusion: 'success', created_at: at(0), started_at: at(0, 5), completed_at: at(1), steps: [{ name: 'Classify', conclusion: 'success' }] },
      { id: 2, name: 'backend-scope', conclusion: 'failure', created_at: at(0), started_at: at(1, 30), completed_at: at(5),
        steps: [{ name: 'Build and Test with Gradle', conclusion: 'failure', started_at: at(2), completed_at: at(5) }] },
      { id: 3, name: 'migration-scope', conclusion: 'failure', created_at: at(0), started_at: at(1, 10), completed_at: at(2),
        steps: [{ name: 'Require every migration test shard to succeed', conclusion: 'failure', started_at: at(1, 20), completed_at: at(1, 21) }] },
      { id: 4, name: 'mutation-scope (core)', conclusion: 'failure', created_at: at(0), started_at: at(1, 2), completed_at: at(3),
        steps: [{ name: 'Mutation Test (core)', conclusion: 'failure', started_at: at(1, 5), completed_at: at(3) }] },
      { id: 5, name: 'frontend-build', conclusion: 'skipped', created_at: at(0), started_at: at(5), completed_at: at(5), steps: [] }] },
    'repos/o/r/actions/jobs/2/logs': `2026-01-05T00:02:01.5000000Z > Could not GET 'https://repo.maven.apache.org/x.pom'. Received status code 429 from server: Too Many Requests\n`,
    'repos/o/r/actions/runs/30/attempts/1/jobs?per_page=100': { jobs: [
      { id: 7, name: 'backend-scope', conclusion: 'failure', created_at: at(0), started_at: at(0, 40), completed_at: at(4),
        steps: [{ name: 'Build and Test with Gradle', conclusion: 'failure', started_at: at(1), completed_at: at(4) }] }] },
    'repos/o/r/actions/jobs/7/logs': '2026-01-05T00:03:00.0000000Z > There were failing tests.\n',
  };
  const asked = [];
  const gh = { call: (endpoint, options = {}) => {
    asked.push(endpoint);
    if (endpoint === 'repos/o/r/actions/jobs/4/logs') throw Object.assign(new Error('gh failed'), { stderr: 'gh: HTTP 410: Gone' });
    const response = responses[endpoint] ?? assert.fail(`unexpected ${endpoint}`);
    assert.equal(typeof response === 'string', options.text === true, `${endpoint}: 로그만 text 로 읽는다`);
    return response;
  } };
  const report = collectReport({ gh, slug: 'o/r', options: { runs: 2, branch: null, event: null }, needs: workflowNeeds(ciYaml) });
  assert.deepEqual(report.failures.map(({ run, job, cause, dependabot, signature }) => [run, job, cause, dependabot, signature ?? null]), [
    [31, 'backend-scope', 'infra:dependency-resolution', false, 'HTTP 429 repo.maven.apache.org'],
    [31, 'mutation-scope (core)', 'mutation', false, null],
    [30, 'backend-scope', 'test:backend', true, null],
  ]);
  assert.ok(!asked.includes('repos/o/r/actions/jobs/3/logs'), '파생 집계 스텝은 로그를 읽지 않는다');
  assert.equal(report.dependabotRuns, 1);
  assert.deepEqual(report.gaps, ['31 mutation-scope (core) 시도 1: 잡 로그를 읽지 못해 의존성 해석 인프라 실패인지 판정하지 못함(gh: HTTP 410: Gone)']);
  assert.deepEqual(report.queueWaits.map(({ run, job, waitSeconds }) => [run, job, waitSeconds]),
    [[31, 'change-scope', 5], [31, 'backend-scope', 30], [31, 'migration-scope', 10], [31, 'mutation-scope (core)', 2], [30, 'backend-scope', 40]]);
  assert.deepEqual(report.scheduled, []);
  const text = renderText(report);
  const [main, dependabot] = text.split('## Dependabot 실행의 실패 잡');
  assert.ok(dependabot, text);
  assert.match(main, /infra:dependency-resolution: 1 \(회복 0\) — Build and Test with Gradle \(HTTP 429 repo\.maven\.apache\.org\)/u);
  assert.doesNotMatch(main, /test:backend/u, 'Dependabot 실행의 실패는 본 표에 섞이지 않는다');
  assert.match(dependabot, /test:backend: 1 \(회복 0\)/u);
  assert.match(text, /- backend-scope: 표본 2 · 중앙 30 · 최대 40/u);
  assert.match(text, /실행 2개 .* Dependabot 실행 1개/u);
});

test('scheduled workflows come from on.schedule and their streaks count consecutive non-green scheduled runs', () => {
  // 이 목록이 바뀌면(예약 워크플로 추가·삭제) 주간 거버넌스 요약의 표가 함께 바뀐다. release.yml 은 태그·수동 실행뿐이라 없다.
  assert.deepEqual(repositoryScheduledWorkflows(), ['dependency-check.yml', 'governance-review.yml', 'lighthouse.yml', 'load-test.yml',
    'migration-tool.yml', 'reusable-nightly.yml', 'secret-scan-history.yml', 'zap-scan.yml']);
  assert.deepEqual(scheduledWorkflowFiles([
    { name: 'a.yml', content: 'name: a\non:\n  # weekly\n  schedule:\n    - cron: x\njobs: {}\n' },
    { name: 'b.yml', content: 'on:\r\n  workflow_dispatch:\r\n  push:\r\n    tags: [v*]\r\njobs:\r\n  b:\r\n    env:\r\n  schedule:\r\n' },
    { name: 'c.yml', content: 'on:\n  push:\njobs:\n  c:\n    steps: []\nschedule:\n' },
  ]), ['a.yml']);

  const run = (conclusion, status = 'completed') => ({ status, conclusion, created_at: '2026-10-25T18:23:00Z', html_url: `https://x/${conclusion}` });
  // 2026-10-04~25 주간 이관 회귀: 네 번 연속 실패, 그 앞 09-27 성공.
  assert.deepEqual(scheduledStatus([run('failure'), run('failure'), run('failure'), run('failure'), run('success'), run('failure')], 6), {
    lastConclusion: 'failure', lastAt: '2026-10-25T18:23:00Z', lastUrl: 'https://x/failure', consecutiveFailures: 4, lowerBound: false, inProgress: false });
  const mixed = scheduledStatus([run(null, 'in_progress'), run('cancelled'), run('neutral'), run('timed_out'), run('success'), run('failure')]);
  assert.deepEqual([mixed.lastConclusion, mixed.consecutiveFailures, mixed.inProgress], ['cancelled', 2, true]);
  assert.equal(scheduledStatus([run('startup_failure'), run('failure')], 30).lowerBound, true, '성공을 못 만났고 더 오래된 실행이 남으면 하한이다');
  assert.equal(scheduledStatus([run('success'), run('failure')]).consecutiveFailures, 0);
  assert.deepEqual(scheduledStatus([]), { lastConclusion: null, lastAt: null, lastUrl: null, consecutiveFailures: 0, lowerBound: false, inProgress: false });

  const asked = [];
  const gh = { call: (endpoint) => {
    asked.push(endpoint);
    return endpoint.includes('/migration-tool.yml/') ? { total_count: 9, workflow_runs: [run('failure'), run('failure'), run('success')] } : { total_count: 0, workflow_runs: [] };
  } };
  const rows = collectScheduled({ gh, slug: 'o/r', workflows: ['migration-tool.yml', 'zap-scan.yml'] });
  assert.deepEqual(asked, ['repos/o/r/actions/workflows/migration-tool.yml/runs?event=schedule&per_page=20',
    'repos/o/r/actions/workflows/zap-scan.yml/runs?event=schedule&per_page=20']);
  const table = renderScheduled(rows).join('\n');
  assert.match(table, /\| migration-tool\.yml \| \[failure\]\(https:\/\/x\/failure\) \| 2026-10-25T18:23:00Z \| 2 \| \*\*2회 이상 연속 — green 까지 known-gaps 행으로 추적\*\* \|/u);
  assert.match(table, /\| zap-scan\.yml \| - \| - \| 0 \| 완료된 예약 실행 없음 \|/u);
  assert.doesNotMatch(renderScheduled([{ workflow: 'x.yml', ...scheduledStatus([run('failure'), run('success')]) }]).join('\n'), /known-gaps/u,
    '한 번 붉은 것은 추적 표시를 달지 않는다');
  // 표 조회도 같은 호출 예산을 쓴다.
  const budget = createGh({ maxCalls: 1, exec: () => '{"workflow_runs":[]}' });
  assert.throws(() => collectScheduled({ gh: budget, slug: 'o/r', workflows: ['a.yml', 'b.yml'] }), BudgetError);
  // 전체 보고에도 표가 붙는다.
  assert.match(renderText({ runs: 0, window: null, failures: [], tests: [], gaps: [], queueWaits: [], scheduled: rows }), /## 예약 워크플로/u);
});

test('the tool only ever issues GET requests, including job logs read as raw text', () => {
  const seen = [];
  const gh = createGh({ maxCalls: 5, exec: (args, options) => { seen.push([args, options.encoding]); return 'plain log line'; } });
  assert.equal(gh.call('repos/o/r/actions/jobs/1/logs', { text: true }), 'plain log line');
  assert.deepEqual(seen, [[['api', '--method', 'GET', 'repos/o/r/actions/jobs/1/logs'], 'utf8']]);
  const source = readFileSync(path.join(repoRoot, 'scripts/ci-flaky-report.mjs'), 'utf8');
  assert.deepEqual([...source.matchAll(/'--method', '([A-Z]+)'/g)].map(match => match[1]), ['GET']);
  assert.doesNotMatch(source, /'(?:-X|--field|-f|--raw-field|-F|--input)'/u);
});

/** governance-review.yml 의 예약 워크플로 표 결속 위반. 줄 단위로 읽는다. */
function scheduledTableBindingErrors(source) {
  const errors = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n').filter(line => !/^\s*#/.test(line));
  const blockAfter = (all, header, indent) => {
    const start = all.findIndex(line => line === header);
    if (start < 0) return null;
    const body = [];
    for (const line of all.slice(start + 1)) {
      if (line.trim() === '') continue;
      if (!line.startsWith(' '.repeat(indent + 2))) break;
      body.push(line.trim());
    }
    return body.sort();
  };
  if (JSON.stringify(blockAfter(lines, 'permissions:', 0)) !== JSON.stringify(['contents: read'])) {
    errors.push('workflow permissions must stay contents: read only');
  }
  if (lines.some(line => /^\s+[a-z-]+: write\s*$/.test(line))) errors.push('no write permission');
  const jobs = parseWorkflowJobs(lines.join('\n'));
  if (jobs.size !== 1) errors.push('governance review keeps its single job');
  const review = jobs.get('review') ?? '';
  if (JSON.stringify(blockAfter(review.split('\n'), '    permissions:', 4)) !== JSON.stringify(['actions: read', 'contents: read'])) {
    errors.push('review job permissions must be exactly contents: read and actions: read');
  }
  const steps = review.split(/(?=^ {6}- )/m).slice(1);
  const index = (name) => steps.findIndex(step => step.startsWith(`      - name: ${name}\n`));
  const tables = steps.filter(step => step.startsWith('      - name: Report scheduled workflow streaks\n'));
  if (tables.length !== 1) return [...errors, 'scheduled workflow table step must exist exactly once'];
  if (JSON.stringify(tables[0].split('\n').map(line => line.trimEnd()).filter(Boolean)) !== JSON.stringify([
    '      - name: Report scheduled workflow streaks',
    '        if: ${{ !cancelled() }}',
    '        env:',
    '          GH_TOKEN: ${{ github.token }}',
    '        run: node scripts/ci-flaky-report.mjs --scheduled-only >> "$GITHUB_STEP_SUMMARY"',
  ])) errors.push('scheduled workflow table step must run the read-only report into the step summary exactly');
  if (index('Report scheduled workflow streaks') < index('Upload governance review report')) {
    errors.push('scheduled workflow table runs after the governance review report and its upload');
  }
  return errors;
}

test('the weekly governance review publishes the scheduled-workflow table with job-scoped read-only Actions access', () => {
  const source = readFileSync(path.join(repoRoot, '.github/workflows/governance-review.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(scheduledTableBindingErrors(source), []);
  const tableStep = source.slice(source.indexOf('      - name: Report scheduled workflow streaks'));
  for (const [mutated, expected] of [
    [source.replace('      actions: read\n', ''), 'review job permissions'],
    [source.replace('      actions: read\n', '      actions: write\n'), 'no write permission'],
    [source.replace('  contents: read\n\njobs:', '  contents: read\n  actions: read\n\njobs:').replace('    permissions:\n      contents: read\n      actions: read\n', ''), 'workflow permissions'],
    [source.replace(tableStep, ''), 'exactly once'],
    [source.replace(' --scheduled-only >>', ' >>'), 'step summary exactly'],
    [source.replace('        if: ${{ !cancelled() }}\n', '        if: false\n'), 'step summary exactly'],
    [source.replace('          GH_TOKEN: ${{ github.token }}\n', '          GH_TOKEN: ${{ github.token }}\n        continue-on-error: true\n'), 'step summary exactly'],
    [source.replace(tableStep, '').replace('      - name: Report governance review freshness', `${tableStep.trimEnd()}\n      - name: Report governance review freshness`), 'after the governance review report'],
  ]) {
    assert.notEqual(mutated, source, expected);
    assert.ok(scheduledTableBindingErrors(mutated).some(error => error.includes(expected)), `${expected}: ${scheduledTableBindingErrors(mutated).join('; ')}`);
  }
});
