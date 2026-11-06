import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { createEmptyBacklogPack, validateBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { AI_MODEL } from './ai-cli.mjs';
import { readDocument } from './document-reader.mjs';
import { context } from './test-fixtures/ai.mjs';

function setup(t, documentReader) {
  const directory = mkdtempSync(join(tmpdir(), 'synthetic-ai-reading-import-'));
  const store = createRequirementsStore({ workspace: directory, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { assert.equal(validateBacklogPack(pack).valid, true); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, contextProvider: async () => context, root: process.cwd(), documentReader });
  t.after(async () => { await engine.close(); store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { engine, store, act: (name, payload) => engine.action(store.read().revision, name, payload) };
}
const upload = () => ({ requestId: randomUUID(), filename: 'source.custom', base64: Buffer.from('담당자는 본인 접수 목록을 조회한다.').toString('base64'), classification: 'internal', sourceType: 'interview', redacted: true, readWithAI: true, consent: true, model: AI_MODEL });
const successfulReader = (input, options) => readDocument(input, { ...options, prepare: async () => ({ format: 'txt', units: [{ id: 'U-1', locator: '본문', text: Buffer.from(input.bytes).toString(), attachment: null }], warningCodes: [] }), execute: async () => ({ output: { documentTypes: ['interview'], summary: '담당자의 접수 열람 업무와 본인 범위 정책을 설명한다.', blocks: [{ inputId: 'U-1', heading: '담당 범위', kind: 'paragraph', text: null, certainty: 'clear', note: '조회 책임과 범위가 명시되어 있다.' }], unreadable: [] } }) });

test('AI document reading needs explicit transmission consent and preserves original/evidence/structured reading independently', async t => {
  let calls = 0;
  const app = setup(t, async (...args) => { calls++; return successfulReader(...args); });
  await assert.rejects(app.act('source.ingest', { ...upload(), consent: false }), { code: 'FILE_AI_CONSENT_REQUIRED' });
  assert.equal(calls, 0);
  const input = upload(); await app.act('source.ingest', input); await app.engine.waitForImports();
  let state = await app.engine.state(), job = state.imports.jobs[0];
  assert.equal(job.status, 'ready'); assert.equal(job.method, 'ai-document');
  assert.ok(job.readingRef); assert.match(state.backlog.sources[0].summary, /担当|담당자/);
  const reading = JSON.parse(app.engine.artifact(job.readingRef.id).content);
  assert.ok(reading.prompts.length); assert.match(reading.prompts[0].instructions, /비신뢰 데이터/);
  assert.equal(app.engine.sourceFile(job.sourceId).base64, input.base64);
  assert.equal(state.backlog.sources[0].clauses[0].text, Buffer.from(input.base64, 'base64').toString());
  await app.act('source.ingest', { ...input, requestId: randomUUID(), filename: 'copy.custom' }); await app.engine.waitForImports();
  state = await app.engine.state(); assert.equal(calls, 1); assert.equal(state.backlog.sources.length, 1);
  assert.deepEqual(state.imports.jobs[1].readingRef, job.readingRef);
  await app.act('source.reingest', { sourceId: job.sourceId, requestId: randomUUID(), consent: true, redacted: true, model: AI_MODEL }); await app.engine.waitForImports();
  assert.equal(calls, 1);
  state = await app.engine.state(); assert.equal(state.imports.jobs.length, 2, 'ensuring an already valid reading does not create another duplicate registration');
  assert.equal(state.imports.reused.sourceId, job.sourceId);
});

test('unreadable documents retain originals for recovery and do not manufacture a ready source', async t => {
  const app = setup(t, async () => { throw Object.assign(new Error('AI_DOCUMENT_UNREADABLE'), { code: 'AI_DOCUMENT_UNREADABLE' }); });
  const input = upload(); await app.act('source.ingest', input); await app.engine.waitForImports();
  const state = await app.engine.state(), job = state.imports.jobs[0];
  assert.equal(job.status, 'failed'); assert.equal(job.errorCode, 'AI_DOCUMENT_UNREADABLE');
  assert.ok(job.originalRef); assert.equal(state.backlog.sources.length, 0);
  assert.equal(app.engine.artifact(job.requestId).base64, input.base64);
});

test('detectable sensitive text is rejected before an original archive or model request is created', async t => {
  const app = setup(t, readDocument);
  await app.act('source.ingest', { ...upload(), filename: 'sensitive.txt', base64: Buffer.from('연락처 010-1234-5678로 회신한다.').toString('base64') }); await app.engine.waitForImports();
  const state = await app.engine.state(), job = state.imports.jobs[0];
  assert.equal(job.status, 'failed');
  assert.equal(job.originalRef, undefined);
  assert.equal(state.backlog.sources.length, 0);
});

test('manually changed evidence invalidates a reading cache and re-reading preserves its previous version for comparison', async t => {
  let calls = 0;
  const app = setup(t, async (...args) => { calls++; return successfulReader(...args); });
  const input = upload(); await app.act('source.ingest', input); await app.engine.waitForImports();
  let state = await app.engine.state(); const saved = state.backlog.sources[0];
  await app.act('source.save', { ...saved, clauses: [{ ...saved.clauses[0], text: '담당자는 사람이 수정한 접수 업무 근거를 확인한다.' }] });
  await app.act('source.ingest', { ...input, requestId: randomUUID() }); await app.engine.waitForImports();
  state = await app.engine.state();
  assert.equal(calls, 2); assert.equal(state.backlog.sources.length, 1);
  const job = state.imports.jobs.at(-1); assert.ok(job.previousSourceRef);
  assert.match(app.engine.artifact(job.previousSourceRef.id).content, /사람이 수정한/);
});

test('changing the document scenario invalidates an otherwise identical original reading cache', async t => {
  let calls = 0;
  const app = setup(t, async (...args) => { calls++; return successfulReader(...args); });
  await app.act('source.ingest', upload()); await app.engine.waitForImports();
  const saved = (await app.engine.state()).backlog.sources[0];
  await app.act('source.save', { ...saved, sourceType: 'regulation' });
  await app.act('source.reingest', { sourceId: saved.id, requestId: randomUUID(), consent: true, redacted: true, model: AI_MODEL }); await app.engine.waitForImports();
  assert.equal(calls, 2);
});

test('a human edit during AI re-reading makes that result stale instead of replacing the edited source', async t => {
  let entered, release, calls = 0;
  const started = new Promise(resolve => { entered = resolve; });
  const app = setup(t, async (...args) => { calls++; if (calls === 2) { entered(); await new Promise(resolve => { release = resolve; }); } const result = await successfulReader(...args); if (calls === 2) result.summary = '새로 생성한 AI 요약'; return result; });
  t.after(() => release?.());
  await app.act('source.ingest', upload()); await app.engine.waitForImports();
  const saved = (await app.engine.state()).backlog.sources[0];
  await app.act('source.save', { ...saved, sourceType: 'regulation' });
  await app.act('source.reingest', { sourceId: saved.id, requestId: randomUUID(), consent: true, redacted: true, model: AI_MODEL }); await started;
  await app.act('source.save', { ...(await app.engine.state()).backlog.sources[0], title: '사람이 변경한 제목' });
  release(); await app.engine.waitForImports();
  const state = await app.engine.state(); assert.equal(state.imports.jobs.at(-1).status, 'stale');
  assert.equal(state.backlog.sources[0].title, '사람이 변경한 제목'); assert.equal(state.backlog.sources[0].summary, saved.summary);
});

test('changing coverage disposition alone preserves the reusable original-reading evidence', async t => {
  let calls = 0;
  const app = setup(t, async (...args) => { calls++; return successfulReader(...args); });
  await app.act('source.ingest', upload()); await app.engine.waitForImports();
  const saved = (await app.engine.state()).backlog.sources[0];
  await app.act('source.save', { ...saved, clauses: saved.clauses.map(clause => ({ ...clause, disposition: 'excluded', rationale: '업무 배경으로 검토했다.' })) });
  await app.act('source.reingest', { sourceId: saved.id, requestId: randomUUID(), consent: true, redacted: true, model: AI_MODEL }); await app.engine.waitForImports();
  assert.equal(calls, 1);
});
