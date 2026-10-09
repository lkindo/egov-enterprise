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
  for (const path of ['/', '/app.js', '/confirm.js', '/styles.css']) {
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
  // 해석기가 거부한 구성은 입력 오류(400)로, 그 밖의 엔진 오류는 점검 실패(500)로 답한다.
  next = Object.assign(new Error('Unknown capability: nosuchdomain'), { code: 'INVALID_RECIPE' });
  const invalid = await post('/api/plan/deep', { recipe: recipe() });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'INVALID_RECIPE');
  assert.doesNotMatch(invalid.text, /nosuchdomain/);
  next = new Error('spawnSync git ENOENT');
  assert.equal((await post('/api/plan/deep', { recipe: recipe() })).body.error.code, 'DEEP_FAILED');
});
