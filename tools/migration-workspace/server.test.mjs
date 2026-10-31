import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { request } from 'node:http';
import { connect } from 'node:net';
import { inspect } from 'node:util';
import { startWorkspaceServer } from './server.mjs';
import { AI_PROFILE_ROW_LIMIT_MAX } from './ai.mjs';

const LAUNCH = 'X-Migration-Workspace-Launch';
async function fixture(t, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-http-'));
  const app = await startWorkspaceServer({ directory, port: 0, ...options });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  // The launch secret comes from the start function only; tests never print or log it.
  const session = await (await fetch(`${app.url}/api/session`, { headers: { [LAUNCH]: app.launchSecret } })).json();
  const headers = { 'X-Workspace-Token': session.data.csrfToken, 'Content-Type': 'application/json' };
  return { app, directory, headers };
}
function raw(url, { method = 'GET', headers = {} } = {}) {
  const call = request(url, { method, headers });
  const response = new Promise((resolve, reject) => {
    call.on('response', incoming => { const chunks = []; incoming.on('data', chunk => chunks.push(chunk)); incoming.on('end', () => { const text = Buffer.concat(chunks).toString('utf8'); resolve({ status: incoming.statusCode, text, json: text.startsWith('{') ? JSON.parse(text) : undefined }); }); });
    call.on('error', reject);
  });
  return { call, response };
}
const within = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: no response within ${ms} ms`)), ms))]);

test('loopback server rejects cross-origin/Host/token bypass and serves only allowlisted static assets', async t => {
  const { app, headers } = await fixture(t);
  assert.equal((await fetch(`${app.url}/api/state`)).status, 403);
  for (const override of [{ Origin: 'https://outside.invalid' }, { Host: 'outside.invalid' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'X-Workspace-Token': 'wrong' }]) {
    // Node fetch rewrites Host. Use the HTTP transport to prove the malicious header reaches the server.
    const status = await new Promise((resolve, reject) => { const call = request(`${app.url}/api/state`, { headers: { ...headers, ...override } }, response => { response.resume(); resolve(response.statusCode); }); call.on('error', reject); call.end(); });
    assert.equal(status, 403, Object.keys(override)[0]);
  }
  const page = await fetch(app.url); assert.equal(page.status, 200); assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  const navigation = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' };
  const navigate = url => new Promise((resolve, reject) => { const call = request(url, { headers: navigation }, response => { response.resume(); resolve(response.statusCode); }); call.on('error', reject); call.end(); });
  assert.equal(await navigate(app.url), 200);
  assert.equal(await navigate(`${app.url}/api/session`), 403);
  assert.equal(await navigate(`${app.url}/app.js`), 403);
  assert.equal((await fetch(`${app.url}/../workspace.json`)).status, 403);
  assert.equal((await fetch(`${app.url}/api/state`, { headers })).status, 200);
});

test('forwarded and duplicate Host requests are rejected before any route', async t => {
  const { app } = await fixture(t);
  const target = new URL(app.url);
  for (const name of ['Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto']) {
    assert.equal((await fetch(`${app.url}/`, { headers: { [name]: 'value' } })).status, 403, name);
  }
  assert.equal((await fetch(`${app.url}/`, { headers: { 'Sec-Fetch-Site': 'same-site' } })).status, 403);
  const duplicated = await new Promise((resolve, reject) => {
    const socket = connect(Number(target.port), target.hostname);
    let data = '';
    socket.on('data', chunk => { data += chunk; });
    socket.on('close', () => resolve(data));
    socket.on('error', reject);
    socket.write(`GET / HTTP/1.1\r\nHost: ${target.host}\r\nHost: ${target.host}\r\nConnection: close\r\n\r\n`);
  });
  assert.doesNotMatch(duplicated.split('\r\n')[0], / 200 /);
});

test('the request token is issued only to a client holding the terminal launch secret', async t => {
  const { app } = await fixture(t);
  const secret = app.launchSecret;
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(app.launchUrl, `${app.url}/#launch=${secret}`);
  assert.ok(!Object.keys(app).includes('launchSecret') && !Object.keys(app).includes('launchUrl'));
  assert.ok(!inspect(app, { depth: 0 }).includes(secret));
  const get = (url, headers = {}) => { const { call, response } = raw(url, { headers }); call.end(); return response; };
  const session = headers => get(`${app.url}/api/session`, headers);
  // A local non-browser client (another OS account on the same host) has neither Origin nor Sec-Fetch headers.
  for (const [label, headers] of [
    ['missing', {}],
    ['wrong same length', { [LAUNCH]: `${secret.slice(0, -1)}${secret.endsWith('A') ? 'B' : 'A'}` }],
    ['wrong length', { [LAUNCH]: secret.slice(1) }],
    ['duplicated', { [LAUNCH]: [secret, secret] }],
  ]) {
    const result = await session(headers);
    assert.equal(result.status, 403, label);
    assert.equal(result.json.code, 'LAUNCH_REQUIRED', label);
    assert.ok(!result.text.includes('csrfToken'), label);
  }
  // The secret travels only in the URL fragment and header; a query string is never a session channel.
  const queried = await get(`${app.url}/api/session?launch=${secret}`);
  assert.equal(queried.status, 403);
  assert.ok(!queried.text.includes('csrfToken'));
  const granted = await session({ [LAUNCH]: secret });
  assert.equal(granted.status, 200);
  assert.match(granted.json.data.csrfToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(granted.json.data.csrfToken, secret);
  for (const asset of ['/', '/app.js', '/api.js']) assert.ok(!(await (await fetch(app.url + asset)).text()).includes(secret), asset);
});

async function loadBrowserApi(label) {
  // A data: URL gives each case a fresh module instance, as a page load would.
  const source = await readFile(new URL('./public/api.js', import.meta.url), 'utf8');
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(`${source}\n// ${label}\n`)}`);
}

test('browser session opener reads the launch fragment once, clears it from the address and sends it only as a header', async t => {
  const { app } = await fixture(t);
  const storage = new Map(), sent = [], originalFetch = globalThis.fetch;
  const browser = {
    location: { hash: `#launch=${app.launchSecret}`, pathname: '/', search: '' },
    history: { state: null, replaceState(state, unused, url) { browser.location.hash = new URL(url, 'http://local.invalid').hash; } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
  };
  for (const name of Object.keys(browser)) globalThis[name] = browser[name];
  globalThis.fetch = (target, options) => { sent.push({ target, headers: options.headers }); return originalFetch(new URL(target, app.url), options); };
  t.after(() => { for (const name of Object.keys(browser)) delete globalThis[name]; globalThis.fetch = originalFetch; });
  const opened = await loadBrowserApi('fragment');
  assert.equal(browser.location.hash, '');
  assert.deepEqual([...storage.values()], [app.launchSecret]);
  await opened.openSession();
  assert.equal(typeof (await opened.api.state()).revision, 'number');
  assert.equal(sent.find(item => item.target === '/api/session').headers['X-Migration-Workspace-Launch'], app.launchSecret);
  assert.ok(sent.every(item => !item.target.includes(app.launchSecret)));
  assert.ok(sent.filter(item => item.target !== '/api/session').every(item => !JSON.stringify(item.headers).includes(app.launchSecret)));
  // A reload in the same tab reopens from sessionStorage without the fragment.
  await (await loadBrowserApi('reload')).openSession();
  // A relaunched executor has a new secret: the stale one is cleared and the person is sent back to the terminal URL.
  storage.set([...storage.keys()][0], 'A'.repeat(43));
  await assert.rejects((await loadBrowserApi('stale')).openSession(), error => error.code === 'LAUNCH_REQUIRED' && error.message.includes('실행기 터미널에 표시된 주소'));
  assert.equal(storage.size, 0);
  await assert.rejects((await loadBrowserApi('bare')).openSession(), { code: 'LAUNCH_REQUIRED' });
  browser.location.hash = '#launch=short';
  await loadBrowserApi('malformed');
  assert.equal(browser.location.hash, '');
  assert.equal(storage.size, 0);
});

test('upload preparation lock is taken before the body is read and a busy upload is refused without buffering', async t => {
  const { app, headers } = await fixture(t);
  const upload = revision => ({ 'X-Workspace-Token': headers['X-Workspace-Token'], 'Content-Type': 'application/octet-stream', 'X-Workspace-Revision': String(revision) });
  const ddl = Buffer.from('CREATE TABLE person (id NUMBER(10) PRIMARY KEY);');
  const arrived = new Promise(resolve => app.server.once('request', resolve));
  const slow = raw(`${app.url}/api/uploads?kind=ddl`, { method: 'POST', headers: { ...upload(0), 'Content-Length': String(ddl.length) } });
  slow.call.write(ddl.subarray(0, 8));
  await arrived;
  // The second upload declares 64 MiB and never sends it. It must be refused before any body is read.
  const busy = raw(`${app.url}/api/uploads?kind=zip`, { method: 'POST', headers: { ...upload(0), 'Content-Length': String(64 * 1024 ** 2) } });
  busy.call.flushHeaders();
  try {
    const refused = await within(busy.response, 3000, 'busy upload');
    assert.equal(refused.status, 409);
    assert.equal(refused.json.code, 'INPUT_BUSY');
  } finally { busy.call.destroy(); }
  assert.equal((await fetch(`${app.url}/api/jobs`, { method: 'POST', headers, body: JSON.stringify({ revision: 0, requestId: 'while-uploading', operation: 'discover' }) })).status, 409);
  slow.call.end(ddl.subarray(8));
  const completed = await within(slow.response, 5000, 'first upload');
  assert.equal(completed.status, 200, completed.text);
  assert.equal(completed.json.data.kind, 'ddl');
  // The lock is released, and a chunked body without Content-Length takes the bounded fallback path.
  const chunked = raw(`${app.url}/api/uploads?kind=ddl`, { method: 'POST', headers: { ...upload(1), 'Transfer-Encoding': 'chunked' } });
  chunked.call.write(ddl.subarray(0, 5)); chunked.call.end(ddl.subarray(5));
  assert.equal((await within(chunked.response, 5000, 'chunked upload')).status, 200);
  const oversized = raw(`${app.url}/api/uploads?kind=ddl`, { method: 'POST', headers: { ...upload(2), 'Content-Length': String(512 * 1024 ** 2) } });
  oversized.call.flushHeaders();
  try { assert.equal((await within(oversized.response, 3000, 'oversized upload')).status, 413); } finally { oversized.call.destroy(); }
});

test('an unknown load blocks only new loads; inputs stay usable and acknowledgement is an explicit revision-bound record', async t => {
  const { app, headers, directory } = await fixture(t);
  const id = randomUUID();
  await app.store.update(0, draft => { draft.jobs.push({ id, operation: 'commit', status: 'unknown', errorCode: 'CLI_FAILED' }); });
  const state = async () => (await (await fetch(`${app.url}/api/state`, { headers })).json()).data;
  const uncertain = await state();
  assert.ok(uncertain.operationReadiness.commit.blockers.includes('JOB_RESULT_UNKNOWN'));
  assert.ok(uncertain.operationReadiness['dry-run'].blockers.includes('JOB_RESULT_UNKNOWN'));
  assert.ok(!uncertain.operationReadiness.discover.blockers.includes('JOB_RESULT_UNKNOWN'));
  const ddl = await fetch(`${app.url}/api/uploads?kind=ddl`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Workspace-Revision': String(uncertain.revision) }, body: 'CREATE TABLE person (id NUMBER(10) PRIMARY KEY);' });
  assert.equal(ddl.status, 200);
  const evidence = await (await fetch(`${app.url}/api/jobs/${id}/evidence`, { headers })).json();
  assert.deepEqual({ located: evidence.data.evidenceLocated, files: evidence.data.evidence }, { located: false, files: [] });
  const acknowledge = (input, extra = headers) => fetch(`${app.url}/api/jobs/${id}/acknowledge`, { method: 'POST', headers: extra, body: JSON.stringify(input) });
  const current = (await state()).revision;
  assert.equal((await acknowledge({ revision: current, note: '대상 확인' }, { 'Content-Type': 'application/json' })).status, 403);
  assert.equal((await acknowledge({ revision: current - 1, note: '대상 확인' })).status, 409);
  assert.equal((await (await acknowledge({ revision: current, note: '대상 확인', resume: true })).json()).code, 'INVALID_REQUEST');
  assert.equal((await state()).revision, current);
  const accepted = await acknowledge({ revision: current, note: '대상 제어 기록과 행 수를 기관 절차로 확인함' });
  assert.equal(accepted.status, 200);
  const resolved = (await accepted.json()).data;
  assert.equal(resolved.jobs.find(job => job.id === id).acknowledgement.note, '대상 제어 기록과 행 수를 기관 절차로 확인함');
  assert.ok(!resolved.operationReadiness.commit.blockers.includes('JOB_RESULT_UNKNOWN'));
  assert.ok(JSON.parse(await readFile(path.join(directory, 'workspace.json'), 'utf8')).jobs.find(job => job.id === id).acknowledgement);
  assert.equal((await (await acknowledge({ revision: resolved.revision, note: '다시' })).json()).code, 'JOB_ALREADY_ACKNOWLEDGED');
});

test('connection secrets remain session-only, revisions conflict, unsupported import cannot bypass engine', async t => {
  const { app, headers, directory } = await fixture(t);
  const body = { revision: 0, role: 'source', profile: { vendor: 'postgresql', host: 'localhost', port: 5432, database: 'synthetic', schema: 'public', username: 'reader', tlsMode: 'disable' }, password: 'synthetic-memory-only' };
  const response = await fetch(`${app.url}/api/profiles`, { method: 'POST', headers, body: JSON.stringify(body) }); assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes(body.password)); assert.ok(!(await readFile(path.join(directory, 'workspace.json'), 'utf8')).includes(body.password));
  assert.equal((await fetch(`${app.url}/api/profiles`, { method: 'POST', headers, body: JSON.stringify(body) })).status, 409);
  assert.equal((await fetch(`${app.url}/api/uploads?kind=plan`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Workspace-Revision': '1' }, body: '{}' })).status, 400);
  assert.equal((await fetch(`${app.url}/api/jobs`, { method: 'POST', headers, body: JSON.stringify({ revision: 1, requestId: 'test-request', operation: 'shell', options: {} }) })).status, 400);
});

test('DDL upload yields partial draft, never live inventory, and supports artifact readback', async t => {
  const { app, headers } = await fixture(t);
  const response = await fetch(`${app.url}/api/uploads?kind=ddl`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Workspace-Revision': '0' }, body: 'CREATE TABLE person (id NUMBER(10) PRIMARY KEY); GRANT ALL ON person TO public;' });
  assert.equal(response.status, 200); const result = (await response.json()).data; assert.equal(result.liveInventory, false); assert.equal(result.unsupported.length, 1);
  const artifact = await (await fetch(`${app.url}/api/artifacts/ddl`, { headers })).json(); assert.equal(JSON.parse(artifact.data.content).tables[0].name, 'person');
});

test('explicit password retention stays bound to the endpoint and remains excluded from AI', async t => {
  let forbiddenValues;
  const { app, headers, directory } = await fixture(t, { aiFactory: async input => {
    forbiddenValues = input.forbiddenValues;
    return { status: async () => ({}), close: async () => {} };
  } });
  const profile = { vendor: 'postgresql', host: 'localhost', port: 5432, database: 'synthetic', schema: 'public', username: 'reader', tlsMode: 'verify-full' };
  const state = async () => (await (await fetch(`${app.url}/api/state`, { headers })).json()).data;
  const save = async input => {
    const response = await fetch(`${app.url}/api/profiles`, { method: 'POST', headers, body: JSON.stringify({ revision: (await state()).revision, role: 'source', profile, ...input }) });
    return { status: response.status, body: await response.json() };
  };
  const secret = 'synthetic-retention-only';
  assert.equal((await save({ credentialAction: 'replace', password: secret })).status, 200);
  const updated = { ...profile, schema: 'analysis', tlsMode: 'require' };
  const retained = await save({ profile: updated, credentialAction: 'keep' });
  assert.equal(retained.status, 200);
  assert.equal(retained.body.data.profiles.source.credentialReady, true);
  assert.deepEqual(forbiddenValues(), [secret]);
  assert.ok(!JSON.stringify(retained.body).includes(secret));
  assert.ok(!(await readFile(path.join(directory, 'workspace.json'), 'utf8')).includes(secret));
  const rejected = await save({ profile: { ...updated, host: 'other.invalid' }, credentialAction: 'keep' });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.code, 'CREDENTIAL_REENTRY_REQUIRED');
  assert.equal((await state()).profiles.source.host, profile.host);
  assert.deepEqual(forbiddenValues(), [secret]);
  assert.equal((await save({ profile: updated, credentialAction: 'clear' })).status, 200);
  assert.equal((await state()).profiles.source.credentialReady, false);
  assert.deepEqual(forbiddenValues(), []);
  assert.equal((await save({ profile: updated, credentialAction: 'keep' })).status, 400);
  assert.equal((await save({ profile: updated, credentialAction: 'invented' })).status, 400);
});

test('connection test cannot accept workspace prompts or bypass the local session', async t => {
  const { app, headers } = await fixture(t);
  const response = await fetch(`${app.url}/api/ai/test`, { method: 'POST', headers, body: JSON.stringify({ question: 'do not transmit this user input' }) });
  assert.equal(response.status, 400);
  assert.equal((await fetch(`${app.url}/api/ai/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  const empty = await (await fetch(`${app.url}/api/ai/test`, { method: 'POST', headers, body: '{}' })).json();
  assert.equal(empty.data.connectionTest.status, 'failed'); assert.equal(empty.data.authenticated, false);
});

test('read plan carries the profile row limit to the AI layer, which keeps the range and pairing checks', async t => {
  const { app, headers } = await fixture(t);
  const plan = input => fetch(`${app.url}/api/ai/read-plan`, { method: 'POST', headers, body: JSON.stringify(input) });
  const status = async () => (await (await fetch(`${app.url}/api/ai/status`, { headers })).json()).data;
  const { revision } = (await (await fetch(`${app.url}/api/state`, { headers })).json()).data;
  for (const [label, input, code] of [
    ['missing limit', { revision, operations: ['profile'] }, 'AI_PROFILE_ROW_LIMIT_REQUIRED'],
    ['zero', { revision, operations: ['profile'], profileRowLimit: 0 }, 'AI_PROFILE_ROW_LIMIT_REQUIRED'],
    ['above maximum', { revision, operations: ['profile'], profileRowLimit: AI_PROFILE_ROW_LIMIT_MAX + 1 }, 'AI_PROFILE_ROW_LIMIT_REQUIRED'],
    ['fraction', { revision, operations: ['profile'], profileRowLimit: 1.5 }, 'AI_PROFILE_ROW_LIMIT_REQUIRED'],
    ['string', { revision, operations: ['profile'], profileRowLimit: '5000' }, 'AI_PROFILE_ROW_LIMIT_REQUIRED'],
    ['limit without profile', { revision, operations: ['app-scan'], profileRowLimit: 5000 }, 'AI_READ_PLAN_INVALID'],
    ['unknown field', { revision, operations: ['profile'], profileRowLimit: 5000, rowLimit: 5000 }, 'INVALID_REQUEST'],
  ]) {
    const response = await plan(input);
    assert.equal(response.status, 400, label);
    assert.equal((await response.json()).code, code, label);
  }
  assert.equal((await status()).readPlan, null);
  const accepted = await plan({ revision, operations: ['discover', 'profile'], profileRowLimit: AI_PROFILE_ROW_LIMIT_MAX });
  assert.equal(accepted.status, 200);
  const approved = (await accepted.json()).data;
  assert.deepEqual({ operations: approved.operations, profileRowLimit: approved.profileRowLimit }, { operations: ['discover', 'profile'], profileRowLimit: AI_PROFILE_ROW_LIMIT_MAX });
  assert.equal((await status()).readPlan.profileRowLimit, AI_PROFILE_ROW_LIMIT_MAX);
  const minimum = await (await plan({ revision, operations: ['profile'], profileRowLimit: 1 })).json();
  assert.equal(minimum.data.profileRowLimit, 1);
  // 화면 입력의 범위는 AI 계층의 상한과 같다. 상한이 바뀌면 화면도 함께 바꿔야 한다.
  const input = (await readFile(new URL('./public/index.html', import.meta.url), 'utf8')).match(/<input id="ai-profile-row-limit"[^>]*>/)?.[0];
  assert.ok(input, 'index.html 의 표당 행 한도 입력');
  assert.match(input, / min="1"/);
  assert.match(input, new RegExp(` max="${AI_PROFILE_ROW_LIMIT_MAX}"`));
});

test('chat uses the local session, exact request shape and a fixed static field contract', async t => {
  const { app, headers } = await fixture(t);
  const input = { revision: 0, message: '이관 절차의 전체 흐름을 설명해 주세요.', screen: 'start', filledFields: [] };
  assert.equal((await fetch(`${app.url}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })).status, 403);
  const unexpected = await fetch(`${app.url}/api/ai/chat`, { method: 'POST', headers, body: JSON.stringify({ ...input, profiles: { source: { host: 'synthetic' } } }) });
  assert.equal((await unexpected.json()).code, 'INVALID_REQUEST');
  const unauthenticated = await fetch(`${app.url}/api/ai/chat`, { method: 'POST', headers, body: JSON.stringify(input) });
  assert.equal((await unauthenticated.json()).code, 'AI_LOGIN_REQUIRED');
  for (const asset of ['/chat-ui.js', '/chat-contract.mjs']) assert.equal((await fetch(app.url + asset)).status, 200);
  const cleared = await fetch(`${app.url}/api/ai/chat-reset`, { method: 'POST', headers, body: '{}' });
  assert.equal((await cleared.json()).data.cleared, true);
});
