import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import test from 'node:test';
import { createComposerServer, validateComposerRequestRecipe } from './project-composer-server.mjs';

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
  for (const path of ['/', '/app.js', '/styles.css']) {
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
  assert.equal(rejection.status, 400);
  assert.doesNotMatch(rejection.text, /private-/);
  assert.equal(invalid.calls.generate.length, 0);
  const failure = await fixture(t, { generate: () => { throw new Error(secret); } });
  const created = await failure.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  const job = await finished(failure.origin, created.body.job.id);
  assert.equal(job.status, 'failed');
  assert.deepEqual(job.recipe, recipe());
  assert.doesNotMatch(JSON.stringify(job), /private-/);
  assert.equal(job.error.code, 'GENERATION_FAILED');
  assert.equal(job.failure, undefined, 'an error without a structured failure shows only the generic message');
  const retry = await failure.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal(retry.status, 202);
});

test('a structured generation failure exposes only stage, command identity, exit code and log location', async t => {
  const log = 'D:/work/build/project-composer/jobs/demo-0123456789abcdef/logs/verify.log';
  const detailed = await fixture(t, { generate: () => { throw Object.assign(new Error('postgresql://u:private-password@h/db'), {
    failure: { stage: 'verify', code: 'COMMAND_FAILED', commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1, durationMs: 9,
      log, message: 'private-password', output: 'private-password' } }); } });
  const created = await detailed.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  const job = await finished(detailed.origin, created.body.job.id);
  assert.deepEqual(job.failure, { stage: 'verify', stageLabel: '생성 프로젝트 검증', commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1, log });
  assert.doesNotMatch(JSON.stringify(job), /private-/);
  const unsafe = await fixture(t, { generate: () => { throw Object.assign(new Error('x'), {
    failure: { stage: 'complete', commandId: 'node -e "steal()"', exitCode: 'one', log: 'a\nb' } }); } });
  const rejected = await unsafe.post('/api/jobs', { recipe: recipe(), requestId: randomUUID() });
  assert.equal((await finished(unsafe.origin, rejected.body.job.id)).failure, undefined, 'unsafe failure fields are dropped');
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
  assert.equal(broken.status, 400);
  assert.equal(broken.body.error.code, 'INVALID_RECIPE');
  assert.doesNotMatch(broken.text, /private-catalog-detail/);
  assert.equal((await send(origin, '/api/plan/diff', { method: 'POST', data: { recipe: recipe(), domain: 'mail' }, headers: { Origin: origin } })).status, 403);
  assert.equal((await send(origin, '/api/plan/diff')).status, 405);
  assert.deepEqual(diffs.map(call => call.domain), ['mail', 'broken']);
});

test('an engine without plan diff answers not found instead of guessing', async t => {
  const { post } = await fixture(t);
  assert.equal((await post('/api/plan/diff', { recipe: recipe(), domain: 'mail' })).status, 404);
});
