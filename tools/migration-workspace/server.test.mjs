import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { request } from 'node:http';
import { startWorkspaceServer } from './server.mjs';

async function fixture(t, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'migration-http-'));
  const app = await startWorkspaceServer({ directory, port: 0, ...options });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  const session = await (await fetch(`${app.url}/api/session`)).json();
  const headers = { 'X-Workspace-Token': session.data.csrfToken, 'Content-Type': 'application/json' };
  return { app, directory, headers };
}

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
