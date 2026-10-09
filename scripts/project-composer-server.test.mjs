import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import test from 'node:test';
import { VERIFY_STEP_LABELS, createComposerServer, validateComposerRequestRecipe } from './project-composer-server.mjs';
import { ComposerError, JOB_ERROR_CODES, MENUS_REFRESH_COMMAND, REQUEST_ERROR_CODES } from './project-composer-errors.mjs';
import { VERIFICATION_STEP_IDS } from './verify-reusable-artifact.mjs';
import { CHILD_FAILURE_CODES } from './project-composer-child-failure.mjs';
import { NAME_RULE_MESSAGE } from './project-composer-name.mjs';
import { ProjectRecipeError } from './project-composer-recipe.mjs';

const recipe = () => ({ schemaVersion: 1, project: { name: 'agency-service' }, sourceRef: 'HEAD',
  selection: { domains: ['board'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });
const catalog = { sourceRef: 'HEAD', sourceCommit: 'a'.repeat(40), mandatory: ['foundation', 'core'],
  presets: [{ id: 'core', label: '공통 기반', description: '기본 기능', domains: [] }],
  capabilities: [{ id: 'board', label: '게시판', description: '게시글', available: true }] };

function send(origin, path, { method = 'GET', headers = {}, data, raw, chunked = false } = {}) {
  const payload = raw ?? (data === undefined ? undefined : JSON.stringify(data));
  return new Promise((accept, reject) => {
    const call = request(`${origin}${path}`, { method, headers: {
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json',
        ...(chunked ? {} : { 'Content-Length': Buffer.byteLength(payload) }) }), ...headers,
    } }, response => {
      const chunks = [];
      response.on('data', value => chunks.push(value));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let body;
        try { body = JSON.parse(text); } catch { body = text; }
        accept({ status: response.statusCode, headers: response.headers, body, text });
      });
    });
    call.on('error', reject);
    call.end(payload);
  });
}
async function fixture(t, overrides = {}) {
  const calls = { plan: [], generate: [] };
  const engine = {
    catalog: () => catalog,
    plan: value => { calls.plan.push(value); return { resolvedDomains: ['board', 'comment', 'scrap'], tables: [], menus: [] }; },
    generate: async (value, options) => {
      calls.generate.push(value); options.onProgress({ stage: 'source', progress: 50 });
      return { verified: true, projectDirectory: 'build/project-composer/agency-service',
        databaseDirectory: 'build/project-composer/agency-service/db', reportPath: 'build/report.json' };
    }, ...overrides,
  };
  const app = createComposerServer({ engine });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const session = (await send(origin, '/api/session')).body;
  const headers = { Origin: origin, 'X-Composer-CSRF': session.csrfToken };
  const post = (path, data, options = {}) => send(origin, path, { method: 'POST', data, headers, ...options });
  return { app, origin, calls, headers, post, session };
}
async function finished(origin, id) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await send(origin, `/api/jobs/${id}`);
    if (response.body.job?.status !== 'running') return response.body.job;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail('job did not finish');
}

test('local server binds only loopback and serves explicit static assets with a restrictive policy', async t => {
  const { app, origin, session } = await fixture(t);
  assert.equal(app.server.address().address, '127.0.0.1');
  assert.match(session.csrfToken, /^[a-f0-9]{64}$/);
  assert.deepEqual(session.catalog, catalog);
  assert.equal(session.job, null);
  for (const path of ['/', '/app.js', '/confirm.js', '/job.js', '/inclusion-change.js', '/inclusions.js', '/menu-tree.js', '/styles.css']) {
    const result = await send(origin, path);
    assert.equal(result.status, 200, path);
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.match(result.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.doesNotMatch(result.headers['content-security-policy'], /unsafe-inline|unsafe-eval|https:/);
  }
  for (const path of ['/package.json', '/.env', '/../../.env', '/api/session?token=hidden']) {
    assert.ok([400, 404].includes((await send(origin, path)).status), path);
  }
  assert.equal((await send(origin, '/', { headers: {
    'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document',
  } })).status, 200, 'opening the local link must work; it exposes no session token');
});

test('DNS rebinding, cross-origin and forwarded requests are rejected before catalog or generation', async t => {
  const { origin, headers, calls } = await fixture(t);
  for (const bad of [
    { Host: 'attacker.example' }, { Host: new URL(origin).host.replace('127.0.0.1', 'localhost') },
    { Origin: 'https://attacker.example' }, { 'Sec-Fetch-Site': 'cross-site' },
    { Forwarded: 'host=127.0.0.1' }, { 'X-Forwarded-Host': new URL(origin).host }, { 'X-Forwarded-Proto': 'http' },
  ]) assert.equal((await send(origin, '/api/session', { headers: bad })).status, 403);
  for (const bad of [ {}, { Origin: origin }, { 'X-Composer-CSRF': headers['X-Composer-CSRF'] },
    { ...headers, Origin: 'null' }, { ...headers, 'X-Composer-CSRF': '0'.repeat(64) },
    { ...headers, 'X-Composer-CSRF': 'é'.repeat(64) } ]) {
    assert.equal((await send(origin, '/api/jobs', { method: 'POST', headers: bad, data: { recipe: recipe(), requestId: randomUUID() } })).status, 403);
  }
  assert.equal(calls.plan.length, 0);
  assert.equal(calls.generate.length, 0);
});

test('method, content type, malformed JSON, size and unrecognized recipe input fail before planning', async t => {
  const { origin, post, headers, calls } = await fixture(t);
  assert.equal((await send(origin, '/api/plan')).status, 405);
  assert.equal((await send(origin, '/api/session', { method: 'POST', headers })).status, 405);
  assert.equal((await post('/api/plan', { recipe: recipe() }, { headers: { ...headers, 'Content-Type': 'text/plain' } })).status, 400);
  assert.equal((await post('/api/plan', undefined, { raw: '{' })).status, 400);
  assert.equal((await post('/api/plan', undefined, { raw: 'x'.repeat(32769) })).status, 413);
  assert.equal((await post('/api/plan', undefined, { raw: 'x'.repeat(32769), chunked: true })).status, 413);
  for (const value of [
    { ...recipe(), password: 'must-not-be-accepted' }, { ...recipe(), project: { name: '../existing' } },
    { ...recipe(), project: { name: 'a'.repeat(64) } }, { ...recipe(), project: { name: 'trailing-' } },
    { ...recipe(), sourceRef: 'HEAD;exec' }, { ...recipe(), selection: { domains: ['board'], preset: 'core' } },
    { ...recipe(), selection: { domains: ['board', 'board'] } }, { ...recipe(), selection: { domains: ['../board'] } },
    { ...recipe(), database: { vendor: 'oracle' } }, { ...recipe(), backendLayout: 'flat' },
    { ...recipe(), outputDirectory: 'C:/outside' },
  ]) assert.equal((await post('/api/plan', { recipe: value })).status, 400);
  assert.equal(calls.plan.length, 0);
  assert.equal(calls.generate.length, 0);
  assert.throws(() => validateComposerRequestRecipe(null));
});

test('plan and generate receive the same recipe, polling shows bounded progress and only safe result fields', async t => {
  const { origin, post, calls } = await fixture(t, { generate: async (value, { onProgress }) => {
    calls.generate.push(value);
    onProgress({ stage: 'source', progress: 40, message: 'password=do-not-return' });
    onProgress({ stage: 'unknown', progress: 999, message: 'do-not-return' });
    return { projectDirectory: 'build/project', databaseDirectory: 'build/db', reportPath: 'build/report.json', verified: true,
      logs: 'do-not-return', environment: { password: 'do-not-return' } };
  } });
  const value = recipe();
  assert.equal((await post('/api/plan', { recipe: value })).status, 200);
  const response = await post('/api/jobs', { recipe: value, requestId: randomUUID() });
  assert.equal(response.status, 202);
  const job = await finished(origin, response.body.job.id);
  assert.equal(job.status, 'succeeded');
  assert.equal(job.progress, 100);
  assert.deepEqual(job.result.recipe, value);
  assert.equal(job.result.verified, true);
  assert.doesNotMatch(JSON.stringify(job), /do-not-return|environment|logs/);
  assert.deepEqual(calls.plan, [value, value]);
  assert.deepEqual(calls.generate, [value]);
  assert.equal((await send(origin, '/api/session')).body.job.id, job.id, 'refresh can recover the latest job');
});

test('one job at a time, repeat request identity is idempotent, conflicting retries cannot generate again', async t => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const { origin, post } = await fixture(t, { generate: () => wait });
  const value = recipe();
  const requestId = randomUUID();
  const first = await post('/api/jobs', { recipe: value, requestId });
  assert.equal(first.status, 202);
  assert.equal(first.body.job.requestId, requestId, 'the accepted request identity must be available for response-loss recovery');
  const repeat = await post('/api/jobs', { recipe: value, requestId });
  assert.equal(repeat.status, 200);
  assert.equal(repeat.body.job.id, first.body.job.id);
  assert.equal((await post('/api/jobs', { recipe: value, requestId: randomUUID() })).status, 409);
  assert.equal((await post('/api/jobs', { recipe: { ...value, project: { name: 'different' } }, requestId })).status, 409);
  assert.equal((await send(origin, '/api/session')).body.job.requestId, requestId, 'rejected requests must not change the active request identity');
  release({ verified: true, projectDirectory: 'build/project' });
  assert.equal((await finished(origin, first.body.job.id)).status, 'succeeded');
});

test('concurrent async plans reserve the job slot before invoking a generator', async t => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  let plans = 0;
  const { post, origin } = await fixture(t, { plan: async () => { plans += 1; await wait; return {}; } });
  const first = post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  while (!plans) await new Promise(resolve => setTimeout(resolve, 2));
  const second = await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal(second.status, 409);
  release();
  const response = await first;
  assert.equal(response.status, 202);
  await finished(origin, response.body.job.id);
  assert.equal(plans, 1);
});

test('engine validation and generation errors preserve input without exposing exception details', async t => {
  const secret = 'postgresql://private-user:private-password@private-host/db';
  const invalid = await fixture(t, { plan: () => { throw new Error(secret); } });
  const rejection = await invalid.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal(rejection.status, 500, 'an unclassified engine error is not blamed on the input');
  assert.equal(rejection.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(rejection.text, /private-/);
  assert.equal(invalid.calls.generate.length, 0);
  const failure = await fixture(t, { generate: () => { throw new Error(secret); } });
  const created = await failure.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  const job = await finished(failure.origin, created.body.job.id);
  assert.equal(job.status, 'failed');
  assert.deepEqual(job.recipe, recipe());
  assert.doesNotMatch(JSON.stringify(job), /private-/);
  assert.equal(job.error.code, 'GENERATION_FAILED');
  assert.doesNotMatch(job.error.message, /Docker/, 'an unclassified failure does not blame Docker');
  assert.equal(job.failure, undefined, 'an error without a structured failure shows only the generic message');
  const retry = await failure.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal(retry.status, 202);
});

test('a structured generation failure exposes only stage, command identity, exit code and repository locations', async t => {
  const log = 'build/project-composer/jobs/demo-0123456789abcdef/logs/verify.log';
  const report = 'build/project-composer/jobs/demo-0123456789abcdef/report.json';
  const detailed = await fixture(t, { generate: () => { throw Object.assign(new Error('postgresql://u:private-password@h/db'), {
    failure: { stage: 'verify', code: 'COMMAND_FAILED', causeCode: 'COMMAND_FAILED', commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1,
      durationMs: 9, log, report, sourceCommit: 'c'.repeat(40), message: 'private-password', output: 'private-password',
      logTail: ['private-password'] } }); } });
  const created = await detailed.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  const job = await finished(detailed.origin, created.body.job.id);
  assert.deepEqual(job.failure, { stage: 'verify', stageLabel: '생성 프로젝트 검증', commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1,
    log, report, sourceCommit: 'c'.repeat(40) });
  assert.equal(job.error.code, 'GENERATION_FAILED', 'an unbranded failure code is not a job code');
  assert.doesNotMatch(JSON.stringify(job), /private-/);
  // 이 컴퓨터의 경로를 흘릴 수 있는 위치는 버린다.
  for (const [unsafeLog, unsafeReport] of [['D:/work/build/x/verify.log', 'D:/work/build/project-composer/jobs/demo/report.json'],
    ['/home/me/build/x.log', '../build/project-composer/jobs/demo/report.json'], ['build\\x\\verify.log', 'build/project-composer/jobs/demo/other.json']]) {
    const absolute = await fixture(t, { generate: () => { throw Object.assign(new Error('x'), {
      failure: { stage: 'verify', log: unsafeLog, report: unsafeReport, sourceCommit: 'not-a-commit' } }); } });
    const started = await absolute.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
    assert.deepEqual((await finished(absolute.origin, started.body.job.id)).failure, { stage: 'verify', stageLabel: '생성 프로젝트 검증' }, unsafeLog);
  }
  const unsafe = await fixture(t, { generate: () => { throw Object.assign(new Error('x'), {
    failure: { stage: 'complete', commandId: 'node -e "steal()"', exitCode: 'one', log: 'a\nb' } }); } });
  const rejected = await unsafe.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal((await finished(unsafe.origin, rejected.body.job.id)).failure, undefined, 'unsafe failure fields are dropped');
});

/*
 * 생성 작업 오류(E4b). 서버는 작업 허용 목록의 코드가 붙은 ComposerError 이고 그 코드가 나올 수 있는 단계일 때만 그 코드로 말한다.
 * 검증 실패는 검증 명령의 실패이고 단계 id 가 단계 표에 있어야 한다. 로그 끝부분은 검증 실패에서만, 다시 걸러 보낸다.
 */
const jobFailureFixture = async (t, error, failure) => {
  const app = await fixture(t, { generate: () => { throw Object.assign(error, { failure }); } });
  const created = await app.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  return finished(app.origin, created.body.job.id);
};
const coded = (code, details = {}) => new ComposerError(code, details, `internal ${code} private-detail`);
const verifyFailure = (extra = {}) => ({ stage: 'verify', commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1, ...extra });

test('every job code has a rule, a Korean sentence and a stage, and verification steps match the verifier exactly', async t => {
  assert.deepEqual(Object.keys(VERIFY_STEP_LABELS), [...VERIFICATION_STEP_IDS]);
  const cases = {
    SOURCE_CHANGED: [{}, { stage: 'source' }, 'reload-source'],
    TOOL_UNAVAILABLE: [{ tool: 'docker' }, { stage: 'database' }, 'recheck'],
    DB_NOT_READY: [{}, { stage: 'database' }, 'regenerate'],
    OUTPUT_CONFLICT: [{ path: 'build/reusable-base/source/x' }, { stage: 'source' }, 'regenerate'],
    SOURCE_SURVIVAL: [{ files: ['frontend/src/a.tsx'] }, { stage: 'source' }, 'copy-diagnostics'],
    VERIFY_FAILED: [{ step: 'lint' }, verifyFailure(), 'copy-diagnostics'],
    MENU_SNAPSHOT_STALE: [{}, { stage: 'database' }, 'copy-command'],
    CATALOG_DRIFT: [{ violations: ['first'] }, { stage: 'database' }, 'show-violations'],
  };
  // 취소는 실패 문장이 아니라 취소된 작업으로 끝난다(취소 시험이 따로 본다).
  assert.deepEqual(Object.keys(cases).sort(), JOB_ERROR_CODES.filter(code => code !== 'CANCELLED').sort(), 'the table covers every job code');
  for (const [code, [details, failure, action]] of Object.entries(cases)) {
    const job = await jobFailureFixture(t, coded(code, details), failure);
    assert.equal(job.error.code, code);
    assert.equal(job.error.action, action, code);
    assert.equal(job.message, job.error.message);
    assert.doesNotMatch(job.error.message, /[A-Z]+_[A-Z_]+|catalog|Error|private-/, code);
    assert.match(job.error.message, /[가-힣]/);
  }
});

test('a job code is trusted only when branded, allowed and raised at a stage that can produce it', async t => {
  const plain = await jobFailureFixture(t, Object.assign(new Error('x'), { code: 'DB_NOT_READY' }), { stage: 'database' });
  assert.equal(plain.error.code, 'GENERATION_FAILED', 'an unbranded look-alike');
  assert.equal((await jobFailureFixture(t, coded('INVALID_RECIPE'), { stage: 'resolve' })).error.code, 'GENERATION_FAILED', 'a request code after planning');
  assert.equal((await jobFailureFixture(t, coded('DB_NOT_READY'), { stage: 'verify' })).error.code, 'GENERATION_FAILED', 'a stage mismatch');
  assert.equal((await jobFailureFixture(t, coded('SOURCE_SURVIVAL', { files: ['a'] }), { stage: 'install' })).error.code, 'GENERATION_FAILED');
  for (const [details, failure] of [[{ step: 'lint' }, verifyFailure({ stage: 'database' })], [{ step: 'lint' }, verifyFailure({ commandId: 'docker' })],
    [{ step: 'rm -rf' }, verifyFailure()], [{ step: 'unknown' }, verifyFailure()], [{ step: 'constructor' }, verifyFailure()], [{}, verifyFailure()]]) {
    assert.equal((await jobFailureFixture(t, coded('VERIFY_FAILED', details), failure)).error.code, 'GENERATION_FAILED', JSON.stringify([details, failure]));
  }
  // Docker 는 DB 단계, git 은 구성 확인 단계다. 모르는 도구는 일반 실패다. git 에는 '다시 점검' 을 주지 않는다.
  const git = await jobFailureFixture(t, coded('TOOL_UNAVAILABLE', { tool: 'git' }), { stage: 'resolve' });
  assert.equal(git.error.code, 'TOOL_UNAVAILABLE');
  assert.equal(git.error.action, undefined);
  assert.match(git.error.message, /Git/);
  assert.equal((await jobFailureFixture(t, coded('TOOL_UNAVAILABLE', { tool: 'docker' }), { stage: 'resolve' })).error.code, 'GENERATION_FAILED');
  assert.equal((await jobFailureFixture(t, coded('TOOL_UNAVAILABLE', { tool: 'pnpm' }), { stage: 'database' })).error.code, 'GENERATION_FAILED');
  const docker = await jobFailureFixture(t, coded('TOOL_UNAVAILABLE', { tool: 'docker' }), { stage: 'database' });
  assert.match(docker.error.message, /Linux 컨테이너 모드/);
  // 취소 코드는 화면이 취소를 요청한 작업에서만 취소다. 요청 없이 오면 일반 실패다.
  assert.equal((await jobFailureFixture(t, coded('CANCELLED'), { stage: 'install' })).error.code, 'GENERATION_FAILED');
});

test('every code a generator child may report is accepted at that child\u2019s stage', async t => {
  for (const [stage, codes] of Object.entries(CHILD_FAILURE_CODES)) {
    for (const code of codes) {
      const job = await jobFailureFixture(t, coded(code), { stage, commandId: `scripts/generate-reusable-base-${stage === 'database' ? 'db' : 'source'}.mjs`, exitCode: 1 });
      assert.equal(job.error.code, code, `${stage}:${code}`);
    }
  }
});

test('a command without an exit code is "not started" only when the tool itself was missing', async t => {
  const missing = await jobFailureFixture(t, new Error('x'), { stage: 'install', causeCode: 'TOOL_UNAVAILABLE', commandId: 'pnpm', exitCode: null });
  assert.equal(missing.failure.notStarted, true);
  const killed = await jobFailureFixture(t, new Error('x'), { stage: 'install', causeCode: 'COMMAND_FAILED', commandId: 'pnpm', exitCode: null });
  assert.equal(killed.failure.notStarted, undefined, 'a signal or time limit is not a missing tool');
  const exited = await jobFailureFixture(t, new Error('x'), { stage: 'install', causeCode: 'TOOL_UNAVAILABLE', commandId: 'pnpm', exitCode: 1 });
  assert.equal(exited.failure.notStarted, undefined);
  assert.match(killed.error.message, /작업 보고서/, 'the generic sentence points at the job report too');
});

test('job details are re-filtered per code and never carry engine sentences or local paths', async t => {
  const survival = await jobFailureFixture(t, coded('SOURCE_SURVIVAL', { files: Array.from({ length: 25 }, (_, n) => `frontend/src/${n}.tsx`) }), { stage: 'source' });
  assert.equal(survival.error.details.files.length, 20);
  assert.equal(survival.error.details.fileCount, 25);
  const absolute = await jobFailureFixture(t, coded('SOURCE_SURVIVAL', { files: ['D:/work/x.tsx'] }), { stage: 'source' });
  assert.equal(absolute.error.details, undefined, 'an absolute file list is dropped');
  const drift = await jobFailureFixture(t, coded('CATALOG_DRIFT', { violations: ['bad key in D:\\Users\\me\\egov\\config\\x.json'] }), { stage: 'database' });
  assert.deepEqual(drift.error.details, { violations: ['bad key in <로컬 경로>'] });
  const stale = await jobFailureFixture(t, coded('MENU_SNAPSHOT_STALE', { command: 'rm -rf /' }), { stage: 'database' });
  assert.deepEqual(stale.error.details, { command: MENUS_REFRESH_COMMAND });
  const conflict = await jobFailureFixture(t, coded('OUTPUT_CONFLICT', { path: 'D:/x' }), { stage: 'source' });
  assert.equal(conflict.error.details, undefined, 'the output path is not shown (the job report has it)');
  assert.doesNotMatch(JSON.stringify([survival, absolute, drift, stale, conflict]), /private-detail|D:\/work|Users/);
});

test('a verification failure names its step and keeps a cleaned log tail; other codes never carry a tail', async t => {
  const tail = ['\u001b[31merror\u001b[39m TS2322 at C:\\Users\\John Smith\\egov\\a.ts', 'see https://nextjs.org/docs/messages/x and file:///D:/egov/b.ts',
    'carriage\rreturn\ttab', 'password=hunter2hunter2', '', 'at /home/runner/work/egov/x.ts and https://example.com/home/y', 'L'.repeat(400)];
  const job = await jobFailureFixture(t, coded('VERIFY_FAILED', { step: 'typecheck' }), verifyFailure({ logTail: tail }));
  assert.equal(job.error.code, 'VERIFY_FAILED');
  assert.equal(job.failure.step, 'typecheck');
  assert.equal(job.failure.stepLabel, '타입 검사');
  assert.match(job.error.message, /「타입 검사」/);
  assert.equal(job.failure.logTail[0], 'error TS2322 at <로컬 경로> Smith\\egov\\a.ts', 'the server is only a safety net; the engine hides the home folder first');
  assert.equal(job.failure.logTail[1], 'see https://nextjs.org/docs/messages/x and file:///<로컬 경로>', 'a URL is kept');
  assert.equal(job.failure.logTail[2], 'carriagereturn tab');
  assert.equal(job.failure.logTail[3], 'password=***', 'secret shapes are masked again');
  assert.equal(job.failure.logTail[4], '', 'an empty line is kept');
  assert.equal(job.failure.logTail[5], 'at <로컬 경로> and https://example.com/home/y');
  assert.equal(job.failure.logTail[6].length, 300);
  const build = await jobFailureFixture(t, coded('VERIFY_FAILED', { step: 'build' }), verifyFailure({ logTail: ['x'] }));
  assert.equal(build.error.action, 'regenerate', 'an environment-sensitive step may be generated again');
  for (const logTail of [Array.from({ length: 41 }, () => 'x'), ['ok', 7], [], 'flat', ['ok', , 'hole']]) {
    const dropped = await jobFailureFixture(t, coded('VERIFY_FAILED', { step: 'lint' }), verifyFailure({ logTail }));
    assert.equal(dropped.failure.logTail, undefined, JSON.stringify(logTail));
  }
  const other = await jobFailureFixture(t, coded('DB_NOT_READY'), { stage: 'database', logTail: ['private-detail'] });
  assert.equal(other.failure.logTail, undefined);
  assert.equal(other.failure.step, undefined);
});

/*
 * 계획 차이(POST /api/plan/diff)는 계획과 같은 출처·CSRF 경계를 지난다. 엔진이 차이를 주지 않으면 없는 경로이고,
 * 기능 id 형식이 틀리거나 해석이 실패하면 원문 없이 400 으로 답한다.
 */
test('plan diff shares the plan boundary, validates the domain and hides engine errors', async t => {
  const diffs = [];
  const { post, origin } = await fixture(t, { diff: (value, domain) => {
    diffs.push({ value, domain });
    if (domain === 'broken') throw new Error('private-catalog-detail');
    return { domain, action: 'add', summary: '고르면 기능 +1' };
  } });
  const ok = await post('/api/plan/diff', { recipe: recipe(), domain: 'mail' });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { diff: { domain: 'mail', action: 'add', summary: '고르면 기능 +1' } });
  assert.deepEqual(diffs.map(call => call.domain), ['mail']);
  for (const domain of ['Mail', '../x', '', 7, undefined]) {
    assert.equal((await post('/api/plan/diff', { recipe: recipe(), domain })).status, 400, String(domain));
  }
  assert.equal((await post('/api/plan/diff', { recipe: recipe(), domain: 'mail', extra: 1 })).status, 400);
  const broken = await post('/api/plan/diff', { recipe: recipe(), domain: 'broken' });
  assert.equal(broken.status, 500, 'an unclassified engine error is not blamed on the input');
  assert.equal(broken.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(broken.text, /private-catalog-detail/);
  assert.equal((await send(origin, '/api/plan/diff', { method: 'POST', data: { recipe: recipe(), domain: 'mail' }, headers: { Origin: origin } })).status, 403);
  assert.equal((await send(origin, '/api/plan/diff')).status, 405);
  assert.deepEqual(diffs.map(call => call.domain), ['mail', 'broken']);
});

test('an engine without plan diff answers not found instead of guessing', async t => {
  const { post } = await fixture(t);
  assert.equal((await post('/api/plan/diff', { recipe: recipe(), domain: 'mail' })).status, 404);
});

/*
 * 생성 전 점검(설계서 10장, E5). 이 컴퓨터에서 명령을 띄우므로 계획·생성과 같은 출처·CSRF 경계를 지나고,
 * 원본 비교 기준인 화면의 커밋을 본문으로 받는다. 정해진 모양의 항목만 넘기며, 모양이 어긋난 결과는 생성할 수
 * 있다고 말하지 않도록 통째로 실패시킨다. 차단 여부는 서버가 항목에서 다시 센다.
 */
const SCREEN = 'a'.repeat(40);
test('preflight crosses the plan boundary, passes checked items and recounts the block itself', async t => {
  const checks = [
    { id: 'docker', status: 'pass', label: 'Docker 엔진이 응답합니다', detail: '29.1.3' },
    { id: 'source', status: 'block', label: '원본이 새 커밋으로 바뀌었습니다.', code: 'SOURCE_CHANGED' },
  ];
  const asked = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  // 정해진 필드 밖의 값(경로 같은 명령 출력)은 넘기지 않는다.
  const { origin, post, headers } = await fixture(t, { preflight: async options => {
    asked.push(options); await gate;
    return { checks: checks.map(check => ({ ...check, path: 'C:/Users/me' })), blocked: false, extra: 'x' };
  } });
  // 같은 커밋을 묻는 겹친 요청은 한 번의 점검을 함께 기다리고, 다른 커밋은 따로 점검한다.
  const pending = [post('/api/preflight', { sourceCommit: SCREEN }), post('/api/preflight', { sourceCommit: SCREEN }),
    post('/api/preflight', { sourceCommit: 'b'.repeat(40) })];
  await new Promise(resolve => setTimeout(resolve, 20));
  release();
  const [first, second, other] = await Promise.all(pending);
  assert.deepEqual(asked, [{ sourceCommit: SCREEN }, { sourceCommit: 'b'.repeat(40) }]);
  assert.equal(first.status, 200);
  assert.deepEqual(first.body, { preflight: { checks, blocked: true } });
  assert.deepEqual(second.body, first.body);
  assert.equal(other.status, 200);
  // 끝난 점검은 다시 쓰지 않는다.
  await post('/api/preflight', { sourceCommit: SCREEN });
  assert.equal(asked.length, 3);
  // 경계: GET 은 없고, CSRF·출처가 맞아야 하며, 본문은 커밋 하나뿐이다.
  assert.equal((await send(origin, '/api/preflight')).status, 405);
  assert.equal((await post('/api/preflight', { sourceCommit: SCREEN }, { headers: { ...headers, 'X-Composer-CSRF': '0'.repeat(64) } })).status, 403);
  assert.equal((await post('/api/preflight', { sourceCommit: SCREEN }, { headers: { ...headers, Origin: 'http://evil.example' } })).status, 403);
  for (const body of [{}, { sourceCommit: 'HEAD' }, { sourceCommit: SCREEN.toUpperCase() }, { sourceCommit: SCREEN, extra: 1 }, { sourceCommit: 42 }]) {
    assert.equal((await post('/api/preflight', body)).status, 400, JSON.stringify(body));
  }
  assert.equal(asked.length, 3, 'rejected requests never reach the engine');
});

test('a malformed or failing preflight is a failure, never a pass without detail', async t => {
  const failures = [
    { checks: [] },
    { checks: [{ id: 'docker', status: 'ok', label: '응답' }] },
    { checks: [{ id: 'docker', status: 'pass', label: '응답\n/home/user/secret' }] },
    { checks: [{ id: 'Docker', status: 'pass', label: '응답' }] },
    { checks: [{ id: 'docker', status: 'pass', label: '응답', detail: 'x'.repeat(41) }] },
    { checks: [{ id: 'docker', status: 'block', label: '차단', code: 'lowercase' }] },
    { checks: [{ id: 'java', status: 'block', label: '차단' }, null] },
  ];
  for (const value of failures) {
    const { post } = await fixture(t, { preflight: () => value });
    const response = await post('/api/preflight', { sourceCommit: SCREEN });
    assert.equal(response.status, 500, JSON.stringify(value));
    assert.deepEqual(response.body, { error: { code: 'PREFLIGHT_FAILED', message: '생성 환경을 점검하지 못했습니다. 잠시 후 다시 점검해 주세요.' } });
  }
  const { post } = await fixture(t, { preflight: () => { throw new Error('C:/Users/me/private-path'); } });
  const thrown = await post('/api/preflight', { sourceCommit: SCREEN });
  assert.equal(thrown.status, 500);
  assert.doesNotMatch(thrown.text, /private-path/);
  // 엔진이 점검을 제공하지 않으면 없는 경로로 답한다.
  const { post: without } = await fixture(t);
  assert.equal((await without('/api/preflight', { sourceCommit: SCREEN })).status, 404);
});

/*
 * 소스 정밀 점검(설계서 10장 plan/deep, C3). 계획과 같은 경계(출처·CSRF·recipe 검증)를 지난다. 지워질 파일의 경로 목록은
 * 화면에 보내지 않고 개수만 넘기며, 차단 사유의 파일 목록은 앞 200개와 전체 수만 넘긴다. 차단 여부는 서버가 다시 센다.
 */
const deepResult = (blockers = []) => ({
  java: { removedFiles: 517, cascadeFiles: 114, files: ['business-app/src/main/java/A.java'] },
  frontend: { removedFiles: 388, cascadeFiles: 73, files: ['frontend/src/a.ts'] },
  removedGates: ['api-server/src/test/java/nuri/api/harness/XLinterTest.java'],
  blockers, summary: '제거: Java 517개(연쇄 114) · 프런트 388개(연쇄 73) · 검증 게이트 1건', durationMs: 4210, blocked: false, extra: 'x',
});
test('plan deep shares the plan boundary and passes only counts, gates and bounded blockers', async t => {
  const asked = [];
  let next = deepResult();
  const { origin, post, headers } = await fixture(t, { deep: value => {
    asked.push(value);
    if (value.project.name === 'broken') throw new Error('C:/Users/me/private-path');
    return next;
  } });
  const ok = await post('/api/plan/deep', { recipe: recipe() });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { deep: { java: { removedFiles: 517, cascadeFiles: 114 }, frontend: { removedFiles: 388, cascadeFiles: 73 },
    removedGates: ['api-server/src/test/java/nuri/api/harness/XLinterTest.java'], blockers: [], blocked: false,
    summary: '제거: Java 517개(연쇄 114) · 프런트 388개(연쇄 73) · 검증 게이트 1건', durationMs: 4210 } });
  assert.deepEqual(asked, [recipe()]);
  // 차단 사유: 파일 목록은 앞 200개와 전체 수만, 메시지는 한 줄 500자까지. 엔진이 blocked 를 거짓으로 말해도 서버가 다시 센다.
  const many = Array.from({ length: 250 }, (_, index) => `frontend/src/app/page-${index}.tsx`);
  next = deepResult([
    { code: 'SOURCE_SURVIVAL', label: '선택한 기능의 소스가 투영 중 지워집니다', files: many, extra: 1 },
    { code: 'JAVA_PROJECTION', label: 'Java 소스를 투영할 수 없습니다', message: `첫 줄\r\n둘째 줄${'x'.repeat(600)}` },
  ]);
  const blocked = await post('/api/plan/deep', { recipe: recipe() });
  assert.equal(blocked.status, 200);
  assert.equal(blocked.body.deep.blocked, true);
  assert.deepEqual(blocked.body.deep.blockers[0], { code: 'SOURCE_SURVIVAL', label: '선택한 기능의 소스가 투영 중 지워집니다', files: many.slice(0, 200), fileCount: 250 });
  assert.equal(blocked.body.deep.blockers[1].message, `첫 줄 둘째 줄${'x'.repeat(600)}`.slice(0, 500));
  // 계획을 통과한 구성의 엔진 오류는 입력 탓이 아니므로 점검 실패로 답하고 내용을 숨긴다.
  const broken = await post('/api/plan/deep', { recipe: { ...recipe(), project: { name: 'broken' } } });
  assert.equal(broken.status, 500);
  assert.equal(broken.body.error.code, 'DEEP_FAILED');
  assert.doesNotMatch(broken.text, /private-path/);
  // 경계: GET 은 없고, CSRF·출처가 맞아야 하며, 본문은 recipe 하나뿐이고 형식이 맞아야 엔진에 닿는다.
  const before = asked.length;
  assert.equal((await send(origin, '/api/plan/deep')).status, 405);
  assert.equal((await post('/api/plan/deep', { recipe: recipe() }, { headers: { ...headers, 'X-Composer-CSRF': '0'.repeat(64) } })).status, 403);
  assert.equal((await post('/api/plan/deep', { recipe: recipe() }, { headers: { ...headers, Origin: 'http://evil.example' } })).status, 403);
  for (const body of [{}, { recipe: recipe(), extra: 1 }, { recipe: { ...recipe(), schemaVersion: 2 } }, { recipe: { ...recipe(), selection: { domains: ['../x'] } } }]) {
    assert.equal((await post('/api/plan/deep', body)).status, 400, JSON.stringify(body));
  }
  assert.equal(asked.length, before, 'rejected requests never reach the engine');
});

test('a malformed deep plan is a failure, never a pass', async t => {
  const failures = [
    null,
    { ...deepResult(), blockers: undefined },
    { ...deepResult(), java: { removedFiles: 3, cascadeFiles: 4 } },
    { ...deepResult(), frontend: { removedFiles: -1, cascadeFiles: 0 } },
    { ...deepResult(), removedGates: ['a\nb'] },
    { ...deepResult(), summary: '' },
    { ...deepResult(), durationMs: 1.5 },
    deepResult([{ code: 'lowercase', label: '차단' }]),
    deepResult([{ code: 'SOURCE_SURVIVAL', label: '' }]),
    deepResult([{ code: 'SOURCE_SURVIVAL', label: '차단', files: [] }]),
    deepResult([{ code: 'SOURCE_SURVIVAL', label: '차단', files: ['a\r\nb'] }]),
    deepResult([{ code: 'SOURCE_SURVIVAL', label: '차단', message: 7 }]),
    deepResult(Array.from({ length: 21 }, () => ({ code: 'GATE_STALE', label: '차단' }))),
    // 투영 결과가 비었는데 그 투영의 차단 사유가 없으면 계산하지 않은 결과를 통과로 말하게 된다.
    { ...deepResult(), java: null },
    { ...deepResult([{ code: 'JAVA_PROJECTION', label: '차단', message: 'x' }]), frontend: null },
    // 빈 칸 있는 배열은 JSON 에서 null 이 된다.
    { ...deepResult(), removedGates: new Array(2) },
    deepResult(new Array(1)),
    deepResult([{ code: 'GATE_STALE', label: '차단', files: new Array(3) }]),
    // 저장소 기준이 아닌 경로는 이 컴퓨터의 폴더 이름을 흘린다.
    { ...deepResult(), removedGates: ['C:/Users/me/x.java'] },
    { ...deepResult(), removedGates: ['/home/me/x.java'] },
    deepResult([{ code: 'GATE_STALE', label: '차단', files: ['../outside.java'] }]),
    deepResult([{ code: 'GATE_STALE', label: '차단', files: ['api-server\\x.java'] }]),
  ];
  for (const value of failures) {
    const { post } = await fixture(t, { deep: () => value });
    const response = await post('/api/plan/deep', { recipe: recipe() });
    assert.equal(response.status, 500, JSON.stringify(value));
    assert.deepEqual(response.body, { error: { code: 'DEEP_FAILED', message: '소스 정밀 점검 결과를 확인하지 못했습니다. 다시 점검해 주세요.' } });
  }
  // 엔진이 정밀 점검을 제공하지 않으면 없는 경로로 답한다.
  const { post: without } = await fixture(t);
  assert.equal((await without('/api/plan/deep', { recipe: recipe() })).status, 404);
});

test('plan deep accepts an explained projection failure, hides local paths in messages and tells input errors apart', async t => {
  let next = { ...deepResult([{ code: 'JAVA_PROJECTION', label: 'Java 소스를 투영할 수 없습니다',
    message: "ENOENT: open 'C:\\Users\\me\\egov\\x.java' and /home/me/egov/y.java" }]), java: null };
  const { post } = await fixture(t, { deep: () => {
    if (next instanceof Error) throw next;
    return next;
  } });
  const explained = await post('/api/plan/deep', { recipe: recipe() });
  assert.equal(explained.status, 200);
  assert.equal(explained.body.deep.java, null);
  assert.equal(explained.body.deep.blocked, true);
  assert.equal(explained.body.deep.blockers[0].message, "ENOENT: open '<로컬 경로>' and <로컬 경로>");
  assert.doesNotMatch(explained.text, /Users|home\/me/);
  // 코드가 붙은 오류(해석기가 거부한 구성 등)는 그 코드로, 그 밖의 엔진 오류는 점검 실패(500)로 답한다.
  next = new ComposerError('INVALID_RECIPE', { field: 'selection.domains' }, 'Unknown domain: nosuchdomain');
  const invalid = await post('/api/plan/deep', { recipe: recipe() });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'INVALID_RECIPE');
  assert.equal(invalid.body.error.action, 'reload-source');
  assert.doesNotMatch(invalid.text, /nosuchdomain/);
  // 코드 이름만 흉내 낸 오류는 분류하지 않는다(엔진이 달아 준 ComposerError 만 믿는다).
  next = Object.assign(new Error('Unknown capability: nosuchdomain'), { code: 'INVALID_RECIPE' });
  assert.equal((await post('/api/plan/deep', { recipe: recipe() })).body.error.code, 'DEEP_FAILED');
  next = new Error('spawnSync git ENOENT');
  assert.equal((await post('/api/plan/deep', { recipe: recipe() })).body.error.code, 'DEEP_FAILED');
});

/*
 * 요청 오류 허용 목록(설계서 14.2, E4). 엔진이 코드를 단 오류는 세션·계획·계획 차이·정밀 점검·생성 요청 어디서 나든
 * 같은 상태·문장·행동으로 답한다. 문장은 서버 표의 것이고 엔진의 기술 문장과 세부 원문은 보내지 않는다.
 */
// 문장은 가이드의 오류 표와 같아야 한다(입력을 탓하던 옛 INVALID_RECIPE 문장 같은 회귀를 막는다).
const EXPECTED_REQUEST_ERRORS = {
  INVALID_NAME: { status: 400, action: 'focus-name', field: 'project.name', message: NAME_RULE_MESSAGE },
  INVALID_RECIPE: { status: 400, action: 'reload-source',
    message: '선택한 구성을 지금 원본에서 만들 수 없습니다. 원본이 바뀌었을 수 있으니 기능 목록을 다시 불러온 뒤 확인해 주세요.' },
  SOURCE_CHANGED: { status: 409, action: 'reload-source',
    message: '화면을 연 뒤 원본 저장소가 바뀌었습니다. 기능 목록을 새 원본으로 다시 불러온 뒤 확인해 주세요.' },
  MENU_SNAPSHOT_STALE: { status: 409, action: 'copy-command', details: { command: MENUS_REFRESH_COMMAND },
    message: '메뉴 미리보기 자료가 원본 DB 변경을 따라가지 못했습니다. 아래 명령으로 메뉴 자료를 갱신한 뒤 다시 확인해 주세요.' },
  CATALOG_DRIFT: { status: 500, action: 'show-violations', details: { violations: ['declared drift'] },
    message: '기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.' },
  TOOL_UNAVAILABLE: { status: 503, details: { tool: 'git' },
    message: 'Git 을 실행하지 못했습니다. Git 을 설치하거나 PATH 를 확인한 뒤 생성기를 다시 시작해 주세요.' },
};
test('every request error code reaches the screen with its status, sentence and action on every route', async t => {
  assert.deepEqual(Object.keys(EXPECTED_REQUEST_ERRORS).sort(), [...REQUEST_ERROR_CODES].sort(), 'the server table covers every request code');
  let failing;
  const fail = () => {
    if (failing) throw new ComposerError(failing, { violations: ['declared drift'], tool: 'git', command: 'rm -rf /' }, `private ${failing} detail`);
  };
  const { origin, post } = await fixture(t, {
    catalog: () => { fail(); return catalog; },
    plan: () => { fail(); return { resolvedDomains: [], tables: [], menus: [] }; },
    diff: () => { fail(); return { domain: 'board', action: 'add', summary: '고르면 기능 +1' }; },
    deep: () => { fail(); return deepResult([]); },
  });
  for (const code of REQUEST_ERROR_CODES) {
    failing = code;
    const responses = {
      session: await send(origin, '/api/session'),
      plan: await post('/api/plan', { recipe: recipe() }),
      diff: await post('/api/plan/diff', { recipe: recipe(), domain: 'board' }),
      deep: await post('/api/plan/deep', { recipe: recipe() }),
      jobs: await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() }),
    };
    for (const [route, response] of Object.entries(responses)) {
      const { status, message: sentence, ...shape } = EXPECTED_REQUEST_ERRORS[code];
      assert.equal(response.status, status, `${code} via ${route}`);
      const { message, ...rest } = response.body.error;
      assert.deepEqual(rest, { code, ...shape }, `${code} via ${route}`);
      assert.equal(message, sentence, `${code} via ${route}: the documented sentence`);
      assert.doesNotMatch(response.text, /private|rm -rf/, `${code} via ${route}: no engine text`);
    }
  }
  failing = undefined;
  assert.equal((await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() })).status, 202, 'a rejected job request releases the slot');
});

test('only engine-tagged errors are classified, resolver errors are mapped by field, and details are filtered again', async t => {
  let next;
  const { post } = await fixture(t, { plan: () => { throw next; } });
  const error = async () => { const response = await post('/api/plan', { recipe: recipe() }); return { status: response.status, text: response.text, ...response.body.error }; };
  // 코드 이름만 흉내 낸 오류는 분류하지 않는다.
  next = Object.assign(new Error('moved'), { code: 'SOURCE_CHANGED' });
  assert.deepEqual(await error().then(({ status, code }) => ({ status, code })), { status: 500, code: 'INTERNAL_ERROR' });
  // 해석기 오류는 field 를 code 보다 먼저 본다. 카탈로그 결함은 입력 오류가 아니다.
  next = new ProjectRecipeError('INVALID_RECIPE', 'project.name', 'Reserved filesystem project name');
  assert.deepEqual(await error().then(({ status, code, field }) => ({ status, code, field })), { status: 400, code: 'INVALID_NAME', field: 'project.name' });
  next = new ProjectRecipeError('INVALID_RECIPE', 'catalog', 'Dependency is unavailable: a -> b');
  let failure = await error();
  assert.deepEqual([failure.status, failure.code, failure.details], [500, 'CATALOG_DRIFT', { violations: ['Dependency is unavailable: a -> b'] }]);
  next = new ProjectRecipeError('CATALOG_MISMATCH', 'catalog', 'Capability catalog hash mismatch');
  assert.equal((await error()).code, 'CATALOG_DRIFT');
  next = new ProjectRecipeError('UNAVAILABLE_DOMAIN', 'selection.domains', 'Domain is not available: x');
  assert.deepEqual(await error().then(({ status, code, action }) => ({ status, code, action })), { status: 400, code: 'INVALID_RECIPE', action: 'reload-source' });
  // 위반 문장은 한 건·한 줄·300자로 줄이고 이 컴퓨터의 절대 경로를 가린다.
  next = new ComposerError('CATALOG_DRIFT', { violations: [`첫 줄\r\n둘째 C:\\Users\\me\\egov\\x.ts /home/me/egov/y.ts ${'z'.repeat(400)}`, 'second'] });
  failure = await error();
  assert.equal(failure.details.violations.length, 1);
  assert.ok(failure.details.violations[0].length <= 300);
  assert.doesNotMatch(failure.details.violations[0], /[\r\n]|Users|home\/me/);
  assert.match(failure.details.violations[0], /^첫 줄 둘째 <로컬 경로> <로컬 경로> z+$/);
  next = new ComposerError('CATALOG_DRIFT', {});
  assert.equal((await error()).details, undefined, 'no violation, no developer details');
  // 도구 이름은 아는 것만 넘기고 문장도 도구에 맞춘다. 명령은 엔진 값이 아니라 서버 상수다.
  next = new ComposerError('TOOL_UNAVAILABLE', { tool: 'npm' });
  failure = await error();
  assert.equal(failure.details, undefined);
  assert.doesNotMatch(failure.message, /Git|Docker/);
  next = new ComposerError('TOOL_UNAVAILABLE', { tool: 'docker' });
  failure = await error();
  assert.deepEqual(failure.details, { tool: 'docker' });
  assert.match(failure.message, /Docker/);
  next = new ComposerError('TOOL_UNAVAILABLE', { tool: 'git' });
  assert.match((await error()).message, /^Git /);
  // 문자열로 바뀌는 객체·배열은 알려진 이름이 아니다. 그대로 실어 보내지 않는다.
  for (const tool of [{ toString: () => 'git', path: 'C:\Users\secret\bin\git.exe' }, ['git']]) {
    next = new ComposerError('TOOL_UNAVAILABLE', { tool });
    failure = await error();
    assert.equal(failure.details, undefined, 'only a known tool name string is sent');
    assert.doesNotMatch(failure.message, /^Git /);
  }
  next = new ComposerError('MENU_SNAPSHOT_STALE', { command: 'rm -rf /' });
  assert.deepEqual((await error()).details, { command: 'npm run project:menus:refresh' });
});

test('the request validator names the project name field for reserved and malformed names before the engine runs', async t => {
  for (const name of ['con', 'nul', 'com1', 'lpt0', 'Con', 'a--b', 'a-', '1a', 'a'.repeat(64)]) {
    assert.throws(() => validateComposerRequestRecipe({ ...recipe(), project: { name } }), error => error.code === 'INVALID_NAME', name);
  }
  assert.throws(() => validateComposerRequestRecipe({ ...recipe(), project: { name: 7 } }), error => error.code === 'INVALID_RECIPE');
  const { post, calls } = await fixture(t);
  const response = await post('/api/plan', { recipe: { ...recipe(), project: { name: 'con' } } });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body.error, { code: 'INVALID_NAME', message: NAME_RULE_MESSAGE, action: 'focus-name', field: 'project.name' });
  assert.equal(calls.plan.length, 0, 'a rejected name never reaches the engine');
});

/*
 * 생성 취소(E6b). 취소는 작업마다의 경로(POST /api/jobs/<id>/cancel, 빈 본문)로 받고 계획·생성과 같은 출처·CSRF 경계를 지난다.
 * 받으면 엔진의 취소 신호를 끊고 202 로 '취소하는 중' 작업을 돌려준다. 작업은 정리를 마칠 때까지 진행 중이고 새 작업을 받지 않는다.
 */
const PROJECT_DIR = 'build/reusable-base/source/agency-service-0123456789abcdef';
const REPORT = 'build/project-composer/jobs/agency-service-0123456789abcdef/report.json';
function cancellableEngine({ details = { database: 'removed', staging: 'removed', project: PROJECT_DIR } } = {}) {
  let release;
  const cleaned = new Promise(resolve => { release = resolve; });
  const seen = {};
  const generate = async (value, options) => {
    seen.signal = options.signal;
    options.onProgress({ stage: 'install', progress: 20 });
    await new Promise(resolve => options.signal.addEventListener('abort', resolve, { once: true }));
    options.onProgress({ stage: 'install', progress: 30 });
    await cleaned;
    throw Object.assign(new ComposerError('CANCELLED', {}, 'internal cancel private-detail'), { details, failure: { stage: 'install', report: REPORT } });
  };
  return { generate, release: () => release(), seen };
}

test('a running job is cancelled through its own route, stays running while it cleans up and then ends as cancelled', async t => {
  const engine = cancellableEngine();
  const { origin, post } = await fixture(t, { generate: engine.generate });
  const { body: { job } } = await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  const path = `/api/jobs/${job.id}/cancel`;
  assert.equal((await send(origin, path, { method: 'POST', data: {}, headers: { Origin: origin } })).status, 403, 'no CSRF token');
  assert.equal((await send(origin, path, { method: 'POST', data: {}, headers: { Origin: 'http://evil.example', 'X-Composer-CSRF': 'a'.repeat(64) } })).status, 403);
  assert.equal((await send(origin, path)).status, 405, 'a GET does not cancel');
  assert.equal((await post(path, { force: true })).status, 400, 'the body is empty');
  assert.equal((await post(path, [])).status, 400);
  assert.equal((await post(`/api/jobs/${randomUUID()}/cancel`, {})).status, 404);
  assert.equal(engine.seen.signal.aborted, false, 'nothing above cancelled the job');
  const accepted = await post(path, {});
  assert.equal(accepted.status, 202);
  assert.equal(accepted.body.job.status, 'running');
  assert.equal(accepted.body.job.cancelRequested, true);
  assert.match(accepted.body.job.message, /취소하는 중/);
  assert.equal(engine.seen.signal.aborted, true);
  assert.equal((await post(path, {})).status, 202, 'a repeated request while cleaning up is accepted');
  assert.equal((await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() })).status, 409, 'no new job until cleanup ends');
  assert.match((await send(origin, `/api/jobs/${job.id}`)).body.job.message, /취소하는 중/, 'a late progress event keeps the sentence');
  engine.release();
  const ended = await finished(origin, job.id);
  assert.equal(ended.status, 'cancelled');
  assert.equal(ended.error, undefined);
  assert.deepEqual(ended.cancellation, { database: 'removed', staging: 'removed', project: PROJECT_DIR, report: REPORT });
  assert.match(ended.message, /^생성을 취소했습니다\./);
  assert.ok(!JSON.stringify(ended).includes('private-detail'), 'the engine message never reaches the screen');
  const late = await post(path, {});
  assert.equal(late.status, 409);
  assert.equal(late.body.error.code, 'NOT_RUNNING');
  assert.match(late.body.error.message, /[가-힣]/);
  assert.equal((await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() })).status, 202, 'a new job starts after cleanup');
});

test('shutdown cancels the running job and waits for its cleanup, and says so when the cleanup outlasts the wait', async t => {
  const engine = cancellableEngine();
  const { app, post } = await fixture(t, { generate: engine.generate });
  await post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  let done;
  const waiting = app.shutdown({ timeoutMs: 5_000 }).then(value => { done = value; return value; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(engine.seen.signal.aborted, true);
  assert.equal(done, undefined, 'shutdown waits while the job cleans up');
  assert.equal(app.server.listening, false, 'no new request is taken');
  engine.release();
  assert.equal(await waiting, true);
  const stuck = cancellableEngine();
  const other = await fixture(t, { generate: stuck.generate });
  await other.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal(await other.app.shutdown({ timeoutMs: 30 }), false, 'a cleanup that outlasts the wait is reported');
  stuck.release();
  assert.equal(await (await fixture(t)).app.shutdown({ timeoutMs: 30 }), true, 'with no job there is nothing to wait for');
});
