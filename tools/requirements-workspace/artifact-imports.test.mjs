import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyBacklogPack, validateBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { context, envelope, analysis } from './test-fixtures/ai.mjs';
import { extractArtifact } from './artifact-extractor.mjs';
import { startRequirementsServer } from './server.mjs';

function setup(t, artifactExtractor = extractArtifact) {
  const directory = mkdtempSync(join(tmpdir(), 'synthetic-file-import-'));
  const store = createRequirementsStore({ workspace: directory, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validateBacklogPack(pack).valid) throw Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, contextProvider: async () => context, root: process.cwd(), artifactExtractor, aiRunner: async ({ request }) => envelope(analysis(request)) });
  t.after(async () => { await engine.close(); store.close(); rmSync(directory, { recursive: true, force: true }); });
  const act = (name, payload) => engine.action(store.read().revision, name, payload);
  return { engine, store, act };
}
const upload = () => ({ requestId: randomUUID(), filename: 'meeting.txt', base64: Buffer.from('담당자는 본인 접수 목록을 조회한다.').toString('base64'), classification: 'internal', sourceType: 'interview', redacted: true });
test('artifact upload creates actual traceable sources and a verifiable original, with idempotent registration', async t => {
  const app = setup(t), input = upload();
  await app.act('source.ingest', input); await app.engine.waitForImports();
  let state = await app.engine.state();
  assert.equal(state.imports.jobs[0].status, 'ready');
  assert.match(state.backlog.sources[0].clauses[0].text, /본인 접수/);
  assert.equal(state.backlog.sources[0].fileSha256, state.imports.jobs[0].sha256);
  assert.equal(app.engine.sourceFile(state.backlog.sources[0].id).base64, input.base64);
  await app.act('source.ingest', input); await app.engine.waitForImports(); state = await app.engine.state();
  assert.equal(state.backlog.sources.length, 1);
  assert.equal(state.imports.jobs.length, 1);
});
test('an extraction failure or detected sensitive text never creates a source or original-file archive', async t => {
  for (const text of ['person@example.invalid', '']) {
    const app = setup(t);
    await app.act('source.ingest', { ...upload(), base64: Buffer.from(text || '\0').toString('base64') });
    await app.engine.waitForImports(); const state = await app.engine.state();
    assert.equal(state.imports.jobs[0].status, 'failed');
    assert.equal(state.backlog.sources.length, 0);
    assert.equal(state.imports.jobs[0].originalRef, undefined);
    assert.equal(JSON.stringify(state).includes('person@'), false);
  }
});
test('pending imports block AI analysis; cancelling an import cannot register its late completion', async t => {
  let release;
  const app = setup(t, (input, options) => new Promise(resolve => { release = async () => resolve(await extractArtifact(input, { ...options, signal: undefined })); }));
  const input = upload(); await app.act('source.ingest', input);
  const state = await app.engine.state();
  await assert.rejects(app.act('ai.start', { phase: 'analysis', consent: true, model: state.ai.model, inputDigest: state.ai.inputDigests.analysis }), { code: 'AI_DOCUMENTS_PROCESSING' });
  await app.act('source.ingest.cancel', { requestId: input.requestId });
  await release(); await app.engine.waitForImports();
  assert.equal((await app.engine.state()).imports.jobs[0].status, 'cancelled');
  assert.equal(app.store.read().backlog.sources.length, 0);
});
test('redaction declaration, strict base64 and safe metadata are required before processing', async t => {
  const app = setup(t);
  for (const input of [{ ...upload(), redacted: false }, { ...upload(), base64: '%%%not-base64%%%' }, { ...upload(), filename: '../escape.txt' }]) await assert.rejects(app.act('source.ingest', input));
  assert.equal(app.store.read().metadata.imports?.length ?? 0, 0);
});

test('an in-flight request ID cannot silently refer to different bytes or a different classification', async t => {
  for (const change of [{ base64: Buffer.from('다른 본문').toString('base64') }, { classification: 'confidential' }]) {
    let release;
    const app = setup(t, (input, options) => new Promise(resolve => { release = async () => resolve(await extractArtifact(input, { ...options, signal: undefined })); }));
    const input = upload(); await app.act('source.ingest', input);
    try { await assert.rejects(app.act('source.ingest', { ...input, ...change }), { code: 'FILE_REQUEST_CONFLICT' }); }
    finally { await release(); await app.engine.waitForImports(); }
  }
});

test('real HTTP upload uses the protected ingestion route and original downloads require the workspace credential', async t => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-upload-http-'));
  const app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context });
  t.after(async () => { await app.close(); rmSync(workspace, { recursive: true, force: true }); });
  const session = await fetch(`${app.url}/api/session`, { headers: { 'x-requirements-launch': app.launchSecret } });
  const token = (await session.json()).token;
  const input = upload(), state = await app.engine.state();
  const body = JSON.stringify({ revision: state.revision, action: 'source.ingest', payload: input });
  assert.equal((await fetch(`${app.url}/api/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, 403);
  const response = await fetch(`${app.url}/api/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-workspace-token': token }, body });
  assert.equal(response.status, 200); await app.engine.waitForImports();
  const sourceId = app.store.read().backlog.sources[0].id;
  assert.equal((await fetch(`${app.url}/api/artifacts/${sourceId}`)).status, 403);
  const download = await fetch(`${app.url}/api/artifacts/${sourceId}`, { headers: { 'x-workspace-token': token } });
  assert.equal(download.status, 200);
  assert.equal((await download.json()).base64, input.base64);
});
