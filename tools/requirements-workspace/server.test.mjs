import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startRequirementsServer } from './server.mjs';
import { verifyRequirementsWorkspace } from '../../scripts/export-deliverables-workspace.mjs';

const context = { snapshotDigest: 'server-test-context', capabilities: [], screens: [], interfaces: [], tables: [], gates: [], modules: [], presets: [] };
async function fixture(t) {
  const workspace = mkdtempSync(join(tmpdir(), 'requirements-server-test-'));
  const app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, staticAssets: { '/': { type: 'text/html', bytes: '<!doctype html><title>synthetic transport fixture</title>' } } });
  t.after(async () => { await app.close(); rmSync(workspace, { recursive: true, force: true }); });
  app.testWorkspace = workspace;
  return app;
}
async function session(app) {
  const response = await fetch(`${app.url}/api/session`, { headers: { 'x-requirements-launch': app.launchSecret } });
  assert.equal(response.status, 200);
  return { token: (await response.json()).token, cookie: response.headers.get('set-cookie').split(';')[0] };
}
test('session requires launch proof and supports reload with HttpOnly Strict session cookie', async t => {
  const app = await fixture(t);
  assert.equal((await fetch(`${app.url}/api/session`)).status, 403);
  const auth = await session(app);
  const response = await fetch(`${app.url}/api/session`, { headers: { cookie: auth.cookie } });
  assert.equal((await response.json()).token, auth.token);
  const unauth = await fetch(`${app.url}/api/state`);
  assert.equal(unauth.status, 403);
  const state = await fetch(`${app.url}/api/state`, { headers: { 'x-workspace-token': auth.token } });
  assert.equal(state.status, 200);
  assert.equal((await state.json()).backlog.businessRequirements.length, 0);
});
test('cross-origin writes, host rebinding, forwarded headers, content type and oversized body rejected', async t => {
  const app = await fixture(t), auth = await session(app);
  const endpoint = `${app.url}/api/action`, base = { 'x-workspace-token': auth.token, 'Content-Type': 'application/json' };
  for (const headers of [{ ...base, Origin: 'https://evil.invalid' }, { ...base, 'X-Forwarded-For': '127.0.0.1' }, { ...base, 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await fetch(endpoint, { method: 'POST', headers, body: '{}' })).status, 403, Object.keys(headers).join(','));
  }
  const rebound = await new Promise((resolve, reject) => { const call = request(endpoint, { method: 'POST', headers: { ...base, Host: 'evil.invalid' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }); call.on('error', reject); call.end('{}'); });
  assert.equal(rebound, 403);
  assert.equal((await fetch(endpoint, { method: 'POST', headers: { 'x-workspace-token': auth.token }, body: '{}' })).status, 415);
  assert.equal((await fetch(endpoint, { method: 'POST', headers: base, body: JSON.stringify({ value: 'x'.repeat(4 * 1024 ** 2 + 1) }) })).status, 413);
});
test('revision CAS protects actual disk and arbitrary paths/actions are unavailable', async t => {
  const app = await fixture(t), auth = await session(app);
  const headers = { 'x-workspace-token': auth.token, 'Content-Type': 'application/json' };
  const state = await (await fetch(`${app.url}/api/state`, { headers })).json();
  const input = { revision: state.revision, action: 'project.save', payload: { code: 'PRJ-1', name: '합성 검증', institution: '검증기관', baselineProfile: 'core' } };
  assert.equal((await fetch(`${app.url}/api/action`, { method: 'POST', headers, body: JSON.stringify(input) })).status, 200);
  assert.equal((await fetch(`${app.url}/api/action`, { method: 'POST', headers, body: JSON.stringify(input) })).status, 409);
  assert.equal((await fetch(`${app.url}/api/artifacts/no-such-file`, { headers })).status, 404);
  assert.equal((await fetch(`${app.url}/.env`, { headers })).status, 404);
  assert.equal((await fetch(`${app.url}/?path=backlog.json`, { headers })).status, 404);
});

test('validation and CSV diagnostics reach the UI as safe 400 errors without discarding persisted data', async t => {
  const app = await fixture(t), auth = await session(app), headers = { 'x-workspace-token': auth.token, 'Content-Type': 'application/json' };
  const state = await (await fetch(`${app.url}/api/state`, { headers })).json();
  const post = (action, payload) => fetch(`${app.url}/api/action`, { method: 'POST', headers, body: JSON.stringify({ revision: state.revision, action, payload }) });
  const invalid = await post('source.save', { id: 'SRC-1', title: '검증 자료', sourceType: 'not-valid', clauses: [] });
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).errors.length > 0);
  const csv = await post('sheets.import', { requirements: 'wrong\nheader', workItems: 'wrong\nheader' });
  assert.equal(csv.status, 400);
  const diagnostic = await csv.json();
  assert.equal(diagnostic.code, 'CSV_IMPORT_INVALID');
  assert.ok(diagnostic.errors.length > 0);
  assert.equal((await app.engine.state()).revision, state.revision);
  const sensitive = await post('source.save', { id: 'SRC-1', title: '비식별 전 자료', sourceType: 'interview', clauses: [{ id: 'C-1', text: 'person@example.invalid' }] });
  const hints = await sensitive.json();
  assert.equal(hints.code, 'SENSITIVE_INPUT');
  assert.match(JSON.stringify(hints.errors), /clauses\[0\]\.text/);
  assert.doesNotMatch(JSON.stringify(hints), /person@example/);
});

test('external edits show only the trusted read-only snapshot and cannot be overwritten', async t => {
  const app = await fixture(t), auth = await session(app), headers = { 'x-workspace-token': auth.token, 'Content-Type': 'application/json' };
  const trusted = await app.engine.state(), file = join(app.testWorkspace, 'backlog.json');
  const foreign = JSON.parse(readFileSync(file, 'utf8')); foreign.project.name = '외부 수정본';
  writeFileSync(file, JSON.stringify(foreign));
  const response = await fetch(`${app.url}/api/state`, { headers });
  assert.equal(response.status, 200);
  const state = await response.json();
  assert.equal(state.readOnly, true);
  assert.equal(state.backlog.project.name, trusted.backlog.project.name);
  const rejected = await fetch(`${app.url}/api/action`, { method: 'POST', headers, body: JSON.stringify({ revision: trusted.revision, action: 'project.save', payload: { code: 'PRJ-1', name: '덮어쓰기 시도' } }) });
  assert.equal(rejected.status, 409);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).project.name, '외부 수정본');
});

test('UI to CLI to UI preserves context and explicitly reconciles a newer CLI snapshot', async t => {
  const app = await fixture(t), workspace = app.testWorkspace;
  assert.equal(JSON.parse(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8')).snapshotDigest, context.snapshotDigest);
  await app.close();
  const newer = { ...context, snapshotDigest: 'newer-cli-context' };
  await verifyRequirementsWorkspace(process.cwd(), workspace, { contextSnapshot: newer, refreshContext: true });
  const reopened = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => newer, staticAssets: {} });
  try {
    const before = await reopened.engine.state();
    assert.equal(before.contextChanged, true);
    assert.equal(before.contextConflict, true);
    const after = await reopened.engine.action(before.revision, 'context.refresh', {});
    assert.equal(after.contextChanged, false);
    assert.equal(after.context.snapshotDigest, newer.snapshotDigest);
    assert.equal(JSON.parse(readFileSync(join(workspace, 'context.snapshot.json'), 'utf8')).snapshotDigest, newer.snapshotDigest);
  } finally { await reopened.close(); }
});
