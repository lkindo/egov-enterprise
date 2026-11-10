import { validatePrivateBacklog } from './private-validation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyBacklogPack, validateBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { context, source, analysis, decomposition, envelope } from './test-fixtures/ai.mjs';
import { planAnalysisBatches } from './ai-analysis-batches.mjs';
import { buildAiRequest, validateAnalysisBatchProposal, validateAnalysisProposal } from './ai-contract.mjs';

async function fixture(t, aiRunner, artifactExtractor) {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-ai-workflow-'));
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validatePrivateBacklog(pack).valid) throw new Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner, artifactExtractor });
  t.after(async () => { await engine.close?.(); store.close(); rmSync(workspace, { recursive: true, force: true }); });
  const act = (action, payload) => engine.action(store.read().revision, action, payload);
  await act('project.save', { code: 'SYNTHETIC', name: '합성 접수 업무', institution: '합성 기관', baselineProfile: '' });
  await act('source.save', source);
  const start = async (options = {}) => { const state = await engine.state(); return act('ai.start', { phase: 'analysis', inputDigest: state.ai.inputDigests.analysis, consent: true, model: 'claude-opus-5-5', ...options }); };
  return { engine, store, act, start };
}

test('standalone analysis resumes its validated completed prefix with metrics and no duplicate call', async t => {
  const seen = []; let app, cancel = false;
  app = await fixture(t, async ({ request }) => {
    seen.push(request.data.analysisBatch.index);
    if (cancel) throw Object.assign(Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' });
    cancel = true;
    const src = request.data.sources[0], clause = src.clauses[0];
    return envelope({ requirements: [], issues: [{ id: 'QUESTION-1', kind: 'decision', severity: 'blocking', question: '접수 업무의 적용 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: clause.text }] }], coverage: request.data.sources.flatMap(value => value.clauses.map(item => ({ sourceId: value.id, clauseId: item.id, disposition: 'excluded', rationale: '업무 범위에 대한 원문 확인 필요' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index}` })) });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.batches.completed, 1);
  assert.ok(state.ai.current.checkpoints?.analysis, 'every entry path must durably save the completed analysis');
  const checkpoint = state.ai.current.checkpoints.analysis;
  seen.length = 0;
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(seen, [2]);
  assert.equal(state.ai.current.batches.completed, 1);
  assert.deepEqual(state.ai.current.checkpoints.analysis, checkpoint);
  assert.equal(state.ai.current.callMetrics.requests, 1);
  assert.equal(state.backlog.businessRequirements.length, 0);
});

test('adjacent analysis partitions share a call while every original clause and prior question remains', async t => {
  const calls = [], keys = [];
  const app = await fixture(t, async ({ request }) => {
    calls.push(request.data.analysisBatch);
    const src = request.data.sources[0], clause = src.clauses[0];
    keys.push(...request.data.sources.flatMap(value => value.clauses.map(item => `${value.id}/${item.id}`)));
    if (calls.length > 1) assert.ok(request.data.previousAnalysis.issues.some(issue => issue.question === '업무 경계를 확정해 주세요.'));
    return envelope({ requirements: [], issues: calls.length === 1 ? [{ id: 'QUESTION-GROUP', kind: 'decision', severity: 'blocking', question: '업무 경계를 확정해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: clause.text }] }] : [], coverage: request.data.sources.flatMap(value => value.clauses.map(item => ({ sourceId: value.id, clauseId: item.id, disposition: 'excluded', rationale: '개발 범위의 배경 설명' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 288 }, (_, index) => ({ ...source.clauses[0], id: `C-${index}` })) });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(calls.length, 3, 'nine legacy partitions need three complete bounded calls');
  assert.equal(keys.length, 288); assert.equal(new Set(keys).size, 288);
  assert.deepEqual(calls.map(batch => [batch.index, batch.lastIndex]), [[1, 3], [4, 6], [7, 9]]);
  assert.deepEqual(state.ai.current.batches, { completed: 9, total: 9 });
  assert.equal(state.ai.proposal.coverage.length, 288);
});

test('a complete standalone analysis can be reused with zero model calls and keeps human confirmation pending', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => { calls++; return envelope(analysis(request, { question: false })); });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  let state = await app.engine.state(); assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  const previous = structuredClone(state.ai.proposal.requirements), checkpoint = state.ai.current.checkpoints.analysis;
  calls = 0;
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode); assert.equal(calls, 0);
  assert.deepEqual(state.ai.proposal.requirements, previous); assert.deepEqual(state.ai.current.checkpoints.analysis, checkpoint);
  assert.equal(state.ai.current.modelCalls, 0); assert.equal(state.backlog.businessRequirements.length, 0);
});

for (const change of ['reuse-disabled', 'visual-policy', 'source-text']) test(`analysis checkpoint compatibility rejects ${change} before reusing a prefix`, async t => {
  let completed = false; const calls = [];
  const app = await fixture(t, async ({ request }) => {
    calls.push(request.data.analysisBatch.index);
    if (completed) throw Object.assign(Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' });
    completed = true;
    const src = request.data.sources[0];
    return envelope({ requirements: [], issues: [{ id: 'Q', kind: 'decision', severity: 'blocking', question: '업무 정책의 적용 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: src.clauses[0].id, quote: src.clauses[0].text }] }], coverage: src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, disposition: 'excluded', rationale: '업무 배경의 범위 확인' })) });
  });
  const material = { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index}` })) };
  await app.act('source.save', material); await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  assert.equal((await app.engine.state()).ai.current.batches.completed, 1);
  if (change === 'source-text') { material.clauses[0].text += ' 변경된 접수 조건을 확인한다.'; await app.act('source.save', material); }
  calls.length = 0;
  await app.start({ includeVisuals: change === 'visual-policy', ...(change === 'reuse-disabled' ? { reuseCheckpoints: false } : {}) });
  await app.engine.waitForAi(); const state = await app.engine.state();
  assert.deepEqual(calls, [1]); assert.equal(state.ai.current.resumeFrom, undefined);
  assert.equal(state.ai.current.batches.completed, 0); assert.equal(state.backlog.businessRequirements.length, 0);
});

test('high analysis preserves legacy xhigh history and rejects unsupported history efforts', async t => {
  const app = await fixture(t, async ({ request }) => ({ ...envelope(analysis(request, { question: false })), effort: 'high' }));
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.effort, 'high'); assert.equal(state.ai.readingEffort, 'xhigh');
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  assert.equal(state.ai.current.effort, 'high');
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs[0].effort = 'xhigh'; });
  state = await app.engine.state();
  assert.equal(state.metadata.ai.jobs[0].effort, 'xhigh');
  const invalid = structuredClone(state.metadata); invalid.ai.jobs[0].effort = 'low';
  assert.throws(() => validateRequirementsMetadata(invalid), { code: 'AI_METADATA_INVALID' });
  assert.throws(() => app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs[0].effort = 'low'; }), { code: 'REQUIREMENTS_INVALID_METADATA' });
});

test('a runner returning xhigh for a new high analysis is rejected instead of mislabeled', async t => {
  const app = await fixture(t, async ({ request }) => ({ ...envelope(analysis(request, { question: false })), effort: 'xhigh' }));
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'failed');
  assert.equal(state.ai.current.errorCode, 'AI_MODEL_MISMATCH');
});

test('multi-megabyte registered sources fit bounded batches and retain complete coverage without partial writes', async t => {
  let release, received, started;
  const entered = new Promise(resolve => { started = resolve; });
  const app = await fixture(t, ({ request, signal }) => new Promise(resolve => { received = request; release = () => resolve(envelope({})); signal.addEventListener('abort', release, { once: true }); started(); }));
  const output = request => {
    const first = request.data.sources[0], clause = first.clauses[0];
    return { requirements: [], issues: request.data.analysisBatch.index === 1 ? [{ id: 'ISSUE-LARGE', kind: 'decision', severity: 'blocking', question: '합성 자료의 업무 범위를 확인해 주세요.', options: ['담당자 확인'], requirementIds: [], citations: [{ sourceId: first.id, clauseId: clause.id, quote: clause.text.slice(0, 60) }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', requirementIds: [], rationale: '합성 설명 조항이며 업무 범위는 담당자가 결정한다.' }))) };
  };
  const sources = Array.from({ length: 40 }, (_, index) => ({ ...structuredClone(source), id: `SRC-LARGE-${index}`, clauses: Array.from({ length: 60 }, (_, part) => ({ ...structuredClone(source.clauses[0]), id: `C-${part}`, text: '합성 업무를 검토하는 원문이다. '.repeat(25) })) }));
  app.store.transact(app.store.read().revision, next => { next.backlog.sources = sources; });
  assert.ok(Buffer.byteLength(JSON.stringify(sources)) > 2 * 1024 ** 2);
  const snapshot = app.store.read(), batches = planAnalysisBatches(snapshot), keys = [];
  let previous;
  for (const [index, sources] of batches.entries()) {
    const request = buildAiRequest(snapshot, 'analysis', [], { sources, batch: { index: index + 1, total: batches.length }, previousAnalysis: previous });
    assert.ok(Buffer.byteLength(JSON.stringify(request)) <= 768 * 1024);
    keys.push(...sources.flatMap(src => src.clauses.map(part => `${src.id}/${part.id}`)));
    previous = validateAnalysisBatchProposal(output(request), snapshot, sources, previous);
  }
  assert.ok(batches.length > 1);
  assert.equal(keys.length, 2400);
  assert.equal(new Set(keys).size, 2400, 'every original clause is analysed exactly once');
  assert.equal(validateAnalysisProposal(previous, snapshot).coverage.length, 2400);
  await app.start({ includeVisuals: false });
  await entered;
  assert.ok(Buffer.byteLength(JSON.stringify(received)) <= 768 * 1024);
  let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'running');
  assert.equal(state.backlog.businessRequirements.length, 0, 'a partial batch never becomes a human baseline');
  await app.act('ai.cancel', { jobId: state.ai.current.id }); release(); await app.engine.waitForAi();
  state = await app.engine.state();
  assert.deepEqual(state.backlog.sources, sources);
  assert.equal(state.ai.current.status, 'cancelled');
  assert.equal(state.ai.current.resultRef, undefined);
});

test('cancellation or an input change stops a multi-batch run before it transmits the next batch', async t => {
  for (const cancel of [true, false]) {
    let release, calls = 0;
    const app = await fixture(t, () => { calls++; if (calls > 1) throw Error('unexpected next batch'); return new Promise(resolve => { release = () => resolve(envelope({})); }); });
    app.store.transact(app.store.read().revision, next => { next.backlog.sources[0].clauses = Array.from({ length: 33 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}` })); });
    await app.start({ includeVisuals: false });
    const state = await app.engine.state();
    assert.deepEqual(state.ai.current.batches, { completed: 0, total: 2 });
    if (cancel) await app.act('ai.cancel', { jobId: state.ai.current.id });
    else await app.act('source.save', { ...state.backlog.sources[0], title: '변경한 합성 자료' });
    release(); await app.engine.waitForAi();
    const after = await app.engine.state();
    assert.equal(after.ai.current.status, cancel ? 'cancelled' : 'stale');
    assert.equal(calls, 1);
    assert.equal(after.ai.current.resultRef, undefined);
    assert.equal(after.backlog.businessRequirements.length, 0);
  }
});

test('the final whole-proposal validation shares the single correction budget with batch validation', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++;
    const src = request.data.sources[0], part = src.clauses[0];
    return envelope({ requirements: [], issues: calls === 3 ? [{ id: 'ISSUE-FINAL', kind: 'decision', severity: 'blocking', question: '분석된 합성 자료의 업무 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: part.id, quote: part.text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', requirementIds: [], rationale: '합성 설명 조항' }))) });
  });
  app.store.transact(app.store.read().revision, next => { next.backlog.sources[0].clauses = Array.from({ length: 33 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}` })); });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.current.attempts, 2);
  assert.equal(calls, 3);
  assert.equal(state.ai.proposal.coverage.length, 33);
});

test('each analysis batch has its own single correction while keeping prior verified questions', async t => {
  const attempts = new Map(), indices = [];
  const app = await fixture(t, async ({ request }) => {
    const index = request.data.analysisBatch.index, attempt = (attempts.get(index) ?? 0) + 1; attempts.set(index, attempt); indices.push(index);
    const src = request.data.sources[0], clause = src.clauses[0];
    return envelope({ requirements: [], issues: attempt === 1 || index === 1 ? [{ id: `Q-${index}`, kind: 'decision', severity: 'blocking', question: `${index}번 업무의 범위를 확인해 주세요.`, options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: attempt === 1 ? '원문에 없는 합성 인용문' : clause.text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', rationale: '업무 배경이며 범위를 확인한다.' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.deepEqual(indices, [1, 1, 2, 2]); assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.proposal.coverage.length, 33); assert.equal(state.ai.proposal.issues[0].question, '1번 업무의 범위를 확인해 주세요.');
  assert.equal(state.backlog.businessRequirements.length, 0); assert.equal(state.metadata.baselines.length, 0);
});

test('malformed batch output is regenerated once without retransmitting the rejected body', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++;
    if (calls === 1) return envelope({ SYNTHETIC_REJECTED_BODY: 'discard this malformed draft' });
    if (calls === 2) { assert.ok(request.data.correction); assert.equal(JSON.stringify(request).includes('SYNTHETIC_REJECTED_BODY'), false); }
    const src = request.data.sources[0], clause = src.clauses[0];
    return envelope({ requirements: [], issues: calls === 2 ? [{ id: 'Q-KEEP', kind: 'decision', severity: 'blocking', question: '업무 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: clause.text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', rationale: '업무 배경' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(calls, 3); assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.proposal.coverage.length, 33);
});

test('failed batch diagnostics keep safe validation locations while rejecting raw or forged metadata fields', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++; const value = analysis(request, { question: false }); value.requirements[0].citations[0].quote = 'SYNTHETIC_REJECTED_BODY'; return envelope(value);
  });
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(calls, 2); assert.equal(state.ai.current.status, 'failed');
  assert.deepEqual(state.ai.current.validationFailures, [{ kind: 'citation-quote', path: 'items[0].citations[0]' }]);
  assert.equal(JSON.stringify(state.metadata).includes('SYNTHETIC_REJECTED_BODY'), false);
  const reordered = structuredClone(state.metadata); reordered.ai.jobs.at(-1).validationFailures = [{ path: 'items[0].citations[0]', kind: 'citation-quote' }];
  assert.doesNotThrow(() => validateRequirementsMetadata(reordered));
  const forged = structuredClone(state.metadata); forged.ai.jobs.at(-1).validationFailures[0].raw = 'SYNTHETIC_REJECTED_BODY';
  assert.throws(() => validateRequirementsMetadata(forged), { code: 'AI_METADATA_INVALID' });
});

test('a batch runner parsing rejection receives one value-free correction without echoing its exception', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++;
    if (calls === 1) throw Object.assign(Error('SYNTHETIC_REJECTED_BODY'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'SYNTHETIC_REJECTED_BODY', path: '$.SYNTHETIC_REJECTED_BODY' }] });
    if (calls === 2) { assert.deepEqual(request.data.correction.violations, [{ kind: 'schema', path: '$' }]); assert.equal(JSON.stringify(request).includes('SYNTHETIC_REJECTED_BODY'), false); }
    const src = request.data.sources[0], clause = src.clauses[0];
    return envelope({ requirements: [], issues: calls === 2 ? [{ id: 'Q-KEEP', kind: 'decision', severity: 'blocking', question: '업무 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: clause.text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', rationale: '업무 배경' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(calls, 3); assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.current.attempts, 2, 'the current run retains its earlier correction without reusing that batch budget');
});

test('automatic decomposition attaches visuals only from its confirmed requirement source scope', async t => {
  const attachmentsByPhase = [];
  const app = await fixture(t, async ({ request, attachments }) => {
    attachmentsByPhase.push([request.phase, attachments.length]);
    if (request.phase === 'decomposition') return envelope(decomposition());
    const value = analysis(request, { question: false });
    value.requirements[0].citations = value.requirements[0].citations.filter(cite => cite.sourceId === source.id);
    for (const entry of value.coverage) if (entry.sourceId !== source.id) { entry.disposition = 'excluded'; entry.requirementIds = []; entry.rationale = '이번 합성 업무 범위에 포함하지 않는 참고 자료'; }
    return envelope(value);
  });
  await app.act('source.ingest', { requestId: randomUUID(), filename: 'background.pdf', base64: readFileSync(new URL('./test-fixtures/receipt.pdf', import.meta.url)).toString('base64'), classification: 'internal', sourceType: 'other', redacted: true });
  await app.engine.waitForImports();
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  await app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  assert.equal((await app.engine.state()).ai.current.status, 'ready');
  assert.deepEqual(attachmentsByPhase, [['analysis', 1], ['decomposition', 0]]);
});

test('multi-batch reanalysis starts with existing human requirements and accepts empty unchanged deltas', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++;
    return envelope({ requirements: [], issues: [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: part.requirementIds.length ? 'included' : 'excluded', requirementIds: part.requirementIds, rationale: part.requirementIds.length ? '사람이 연결한 기존 요구사항' : '합성 참고 문단' }))) });
  });
  app.store.transact(app.store.read().revision, next => { next.backlog.sources[0].clauses = Array.from({ length: 33 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}` })); });
  for (const [id, clause] of [['HUMAN-1', 'C-0'], ['HUMAN-2', 'C-32']]) await app.act('requirement.save', { requirement: { id, title: `사람 요구사항 ${id}`, description: '담당자가 본인 접수 목록을 조회한다.', sourceIds: [source.id], requirementType: 'functional', solutionDisposition: 'gap-dev', scopeDisposition: 'included', rationale: '담당자의 원문 검토', moduleCandidates: [], nfrCriteria: null, openQuestions: [], acceptanceDisposition: 'pending' }, clauseIds: [`${source.id}/${clause}`], reviewed: true });
  const before = structuredClone(app.store.read().backlog.businessRequirements);
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.notEqual(state.ai.current.status, 'failed', state.ai.current.errorCode);
  assert.equal(calls, 2);
  assert.equal(state.ai.current.attempts, 1);
  assert.deepEqual(state.ai.proposal.requirements.map(req => req.id), ['HUMAN-1', 'HUMAN-2']);
  assert.deepEqual(state.backlog.businessRequirements, before);
});

test('explicit batch updates and relinked draft reasons remain reviewable in the final archive', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    calls++;
    const src = request.data.sources[0], part = src.clauses[0];
    if (calls === 1) return envelope({ requirements: [], issues: [{ id: 'QUESTION', kind: 'decision', severity: 'blocking', question: '담당자 확인이 필요합니다.', options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: part.id, quote: part.text }] }], coverage: src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, disposition: 'deferred', rationale: '이전 초안의 확인 대기 사유', requirementIds: [] })) });
    const old = request.data.previousAnalysis.issues[0].citations[0];
    const value = analysis({ data: { ...request.data, sources: [{ ...src, clauses: [part] }] } }, { question: false });
    value.requirements[0].id = `${request.data.analysisBatch.idPrefix}REQ-1`;
    const currentEvidence = request.data.evidenceCatalog.find(row => row[0] === src.id && row[1] === part.id && row[3])[4];
    value.requirements[0].citations = [currentEvidence, old];
    value.coverage[0].requirementIds = [value.requirements[0].id];
    return envelope(value);
  });
  app.store.transact(app.store.read().revision, next => { next.backlog.sources[0].clauses = Array.from({ length: 33 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}` })); });
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.proposal.batchAudit[0].batch, 2);
  assert.equal(state.ai.proposal.batchAudit[0].coverageChanges[0].beforeRationale, '이전 초안의 확인 대기 사유');
  assert.equal(state.ai.proposal.batchAudit[0].coverageChanges[0].afterDisposition, 'merged');
  assert.deepEqual(JSON.parse(app.store.readArchive(state.ai.current.resultRef)).batchAudit, state.ai.proposal.batchAudit);
  assert.equal(state.ai.current.usage.inputTokens, 2);
});

test('artifacts -> AI issues -> human answers -> confirmed baseline -> automatic epic generation -> task package', async t => {
  const phases = [];
  const app = await fixture(t, async ({ request }) => { phases.push(request.phase); return envelope(request.phase === 'analysis' ? analysis(request) : decomposition()); });
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions');
  assert.equal(state.ai.proposal.requirements.length, 1);
  assert.equal(state.backlog.businessRequirements.length, 0, 'AI has no human approval authority');
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true }), { code: 'AI_DECISIONS_REQUIRED' });
  await app.act('ai.answer', { jobId: state.ai.current.id, answers: [{ issueId: 'ISSUE-1', answer: '담당자는 본인 접수만 열람한다.' }], continueWithAI: true });
  await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.equal(state.backlog.sources.length, 2, 'the human policy decision becomes a cited source');
  await app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true });
  await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.baselineCurrent, true);
  assert.equal(state.backlog.businessRequirements[0].scopeDisposition, 'included');
  assert.equal(state.ai.current.phase, 'decomposition');
  assert.equal(state.ai.proposal.workItems.length, 2);
  await app.act('ai.confirm', { jobId: state.ai.current.id });
  state = await app.engine.state();
  assert.equal(state.readiness.valid, true, JSON.stringify(state.readiness.errors));
  assert.equal(state.backlog.acceptanceCriteria.every(ac => ac.acceptanceDisposition === 'pending'), true);
  await app.act('export.create', { kind: 'task' });
  assert.match(app.engine.artifact(app.store.read().metadata.exports.at(-1).id).content, /STORY-1/);
  assert.deepEqual(phases, ['analysis', 'analysis', 'decomposition']);
});

test('analysis is asynchronous; changed sources mark its completion stale and never overwrite current data', async t => {
  let release;
  const app = await fixture(t, ({ request }) => new Promise(resolve => { release = () => resolve(envelope(analysis(request, { question: false }))); }));
  await app.start();
  assert.equal((await app.engine.state()).ai.current.status, 'running');
  await assert.rejects(app.start(), { code: 'AI_BUSY' });
  await app.act('source.save', { ...structuredClone(source), title: '변경된 회의록' });
  release(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'stale');
  assert.equal(state.backlog.sources[0].title, '변경된 회의록');
  assert.equal(state.backlog.businessRequirements.length, 0);
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true }), { code: 'AI_STALE_RESULT' });
});

test('explicit processing consent and a current digest are required; malformed output preserves original backlog', async t => {
  const app = await fixture(t, async () => envelope({ requirements: [], issues: [], coverage: [] }));
  const state = await app.engine.state();
  await assert.rejects(app.act('ai.start', { phase: 'analysis', inputDigest: state.ai.inputDigests.analysis, model: 'claude-opus-5-5' }), { code: 'AI_CONSENT_REQUIRED' });
  await assert.rejects(app.act('ai.start', { phase: 'analysis', inputDigest: 'old', consent: true, model: 'claude-opus-5-5' }), { code: 'AI_STALE_INPUT' });
  await assert.rejects(app.act('ai.start', { phase: 'analysis', inputDigest: state.ai.inputDigests.analysis, consent: true, model: 'claude-opus-5-5', command: 'MUST-NOT-EXECUTE' }), { code: 'AI_METADATA_INVALID' });
  await app.start(); await app.engine.waitForAi();
  const after = await app.engine.state();
  assert.equal(after.ai.current.status, 'failed');
  assert.equal(after.ai.current.errorCode, 'AI_OUTPUT_INVALID');
  assert.equal(after.backlog.businessRequirements.length, 0);
  assert.equal(after.backlog.sources[0].clauses[0].text, source.clauses[0].text);
});

test('one bounded correction can repair structural AI links without storing the invalid draft or granting approval', async t => {
  const calls = [];
  const app = await fixture(t, async ({ request }) => {
    calls.push(request);
    const output = analysis(request, { question: false });
    if (calls.length === 1) output.coverage[0].requirementIds = ['UNKNOWN'];
    return envelope(output);
  });
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.equal(calls.length, 2);
  assert.equal(Object.hasOwn(calls[1].data.correction, 'previousOutput'), false);
  assert.doesNotMatch(JSON.stringify(calls[1]), /UNKNOWN/);
  assert.equal(calls[1].data.correction.violations[0].kind, 'coverage-reference');
  assert.equal(state.backlog.businessRequirements.length, 0);
  assert.doesNotMatch(app.store.readArchive(state.ai.current.resultRef), /UNKNOWN/);
});

test('correction is bounded; schema-valid sensitive output completes as a private advisory', async t => {
  for (const sensitive of [false, true]) {
    let count = 0;
    const app = await fixture(t, async ({ request }) => {
      count++;
      const output = analysis(request, { question: false });
      if (sensitive) output.requirements[0].description = 'person@example.invalid';
      else output.coverage[0].requirementIds = ['UNKNOWN'];
      return envelope(output);
    });
    await app.start(); await app.engine.waitForAi();
    const state = await app.engine.state();
    assert.equal(state.ai.current.status, sensitive ? 'ready' : 'failed');
    assert.equal(count, sensitive ? 1 : 2);
    assert.equal(Boolean(state.ai.current.resultRef), sensitive);
    if (sensitive) { assert.ok(state.ai.current.sensitivityWarnings.length); assert.doesNotMatch(JSON.stringify(state.ai.current.sensitivityWarnings), /person@/); }
    assert.equal(state.backlog.businessRequirements.length, 0);
  }
});

test('discarded invalid citation output cannot leave a false sensitive notice after correction', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => {
    const output = analysis(request, { question: false });
    if (++calls === 1) { output.requirements[0].description = 'person@example.invalid'; output.requirements[0].citations[0].quote = '원문에 없는 가짜 인용문'; }
    return envelope(output);
  });
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); assert.equal(calls, 2);
  assert.deepEqual(state.ai.current.sensitivityWarnings, []);
  assert.deepEqual(state.sensitivityWarnings, []);
});

test('cancellation stops only the current AI operation and late success cannot become an applicable proposal', async t => {
  let release;
  const app = await fixture(t, ({ request }) => new Promise(resolve => { release = () => resolve(envelope(analysis(request))); }));
  await app.start(); const state = await app.engine.state();
  await app.act('ai.cancel', { jobId: state.ai.current.id });
  release(); await app.engine.waitForAi();
  assert.equal((await app.engine.state()).ai.current.status, 'cancelled');
  assert.equal(app.store.read().backlog.businessRequirements.length, 0);
});

test('a completed proposal is visibly stale after a source edit and cannot be confirmed', async t => {
  const app = await fixture(t, async ({ request }) => envelope(analysis(request, { question: false })));
  await app.start(); await app.engine.waitForAi();
  await app.act('source.save', { ...structuredClone(source), title: '새 회의록 판' });
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'stale');
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true }), { code: 'AI_STALE_RESULT' });
});

test('AI analysis refuses incomplete source locations before making a model call', async t => {
  let calls = 0;
  const app = await fixture(t, async ({ request }) => { calls++; return envelope(analysis(request)); });
  await app.act('source.save', { ...structuredClone(source), locator: '' });
  await assert.rejects(app.start(), { code: 'AI_SOURCE_METADATA_REQUIRED' });
  assert.equal(calls, 0);
});

test('a human explicitly classifies a decomposition answer as planning-only to keep the confirmed requirement baseline', async t => {
  const phases = []; let planningAnswered = false;
  const app = await fixture(t, async ({ request }) => {
    phases.push(request.phase);
    if (request.phase === 'analysis') return envelope(analysis(request, { question: false }));
    const output = decomposition();
    planningAnswered = request.data.decisions.some(decision => decision.scope === 'planning');
    if (!planningAnswered) output.issues = [{ id: 'PLAN-QUESTION', kind: 'decision', severity: 'blocking', question: '구현 작업을 두 배치로 나눌까요?', options: ['두 배치', '한 배치'], requirementIds: ['REQ-1'], citations: [{ sourceId: source.id, clauseId: source.clauses[0].id, quote: source.clauses[0].text }] }];
    return envelope(output);
  });
  await app.start(); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  let state = await app.engine.state(); const beforeSources = structuredClone(state.backlog.sources);
  await app.act('ai.answer', { jobId: state.ai.current.id, scope: 'planning', answers: [{ issueId: 'PLAN-QUESTION', answer: '두 배치로 나눈다. 확정한 업무 요구사항은 바꾸지 않는다.' }], continueWithAI: true }); await app.engine.waitForAi();
  state = await app.engine.state();
  assert.equal(state.baselineCurrent, true);
  assert.equal(state.ai.current.phase, 'decomposition');
  assert.equal(state.ai.current.status, 'ready');
  assert.deepEqual(state.backlog.sources, beforeSources);
  assert.equal(planningAnswered, true);
  assert.deepEqual(phases, ['analysis', 'decomposition', 'decomposition']);
});

test('regenerating identical work preserves actual acceptance evidence and its build attribution', async t => {
  const app = await fixture(t, async ({ request }) => envelope(request.phase === 'analysis' ? analysis(request, { question: false }) : decomposition()));
  await app.start(); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id });
  for (const ac of app.store.read().backlog.acceptanceCriteria) await app.act('uat.record', { acId: ac.id, disposition: 'accepted', signer: '합성 검수 역할', date: '2026-11-04', evidence: '합성 시험 근거 ONLY-TEST', buildRef: 'SYNTHETIC-BUILD-1' });
  const before = app.store.read().backlog.acceptanceCriteria;
  const state = await app.engine.state();
  await app.act('ai.start', { phase: 'decomposition', inputDigest: state.ai.inputDigests.decomposition, consent: true, model: state.ai.model }); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id });
  assert.deepEqual(app.store.read().backlog.acceptanceCriteria, before);
});

test('a changed AI requirement can be reviewed while existing human acceptance remains untouched until confirmation', async t => {
  const app = await fixture(t, async ({ request }) => {
    const output = request.phase === 'analysis' ? analysis(request, { question: false }) : decomposition();
    if (request.phase === 'analysis' && request.data.previousRequirements.length) output.requirements[0].description += ' 변경 제안';
    return envelope(output);
  });
  await app.start(); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id });
  for (const ac of app.store.read().backlog.acceptanceCriteria) await app.act('uat.record', { acId: ac.id, disposition: 'accepted', signer: '합성 검수 역할', date: '2026-11-06', evidence: '합성 시험 근거', buildRef: 'SYNTHETIC-BUILD' });
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.equal(state.backlog.acceptanceCriteria.every(ac => ac.acceptanceDisposition === 'accepted'), true);
  await app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: false });
  assert.equal(app.store.read().backlog.acceptanceCriteria.every(ac => ac.acceptanceDisposition === 'pending'), true);
});

test('a previously human-excluded requirement needs a separate scope-change confirmation', async t => {
  const app = await fixture(t, async ({ request }) => { const value = analysis(request, { question: false }); value.requirements[0].scope = 'included'; return envelope(value); });
  const requirement = { id: 'REQ-1', title: '접수 목록 조회', description: '접수 목록 조회', sourceIds: [source.id], requirementType: 'functional', solutionDisposition: 'gap-dev', scopeDisposition: 'excluded', rationale: '기관의 명시적 제외 결정', moduleCandidates: [], openQuestions: [], acceptanceDisposition: 'pending' };
  await app.act('requirement.save', { requirement, clauseIds: [`${source.id}/${source.clauses[0].id}`], reviewed: true });
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.ok(state.ai.proposal.changes.some(change => change.requiresScopeReview));
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }), { code: 'AI_CHANGE_REVIEW_REQUIRED' });
  assert.equal(app.store.read().backlog.businessRequirements[0].scopeDisposition, 'excluded');
  await app.act('ai.confirm', { jobId: state.ai.current.id, confirmedScopeChanges: ['REQ-1'] });
  assert.equal(app.store.read().backlog.businessRequirements[0].scopeDisposition, 'included');
});

test('human open questions become mandatory AI decisions and clear only after an explicit answer and confirmation', async t => {
  const app = await fixture(t, async ({ request }) => envelope(analysis(request, { question: false })));
  const requirement = { id: 'REQ-1', title: '접수 목록 조회', description: '접수 목록 조회', sourceIds: [source.id], requirementType: 'functional', solutionDisposition: 'gap-dev', scopeDisposition: 'included', rationale: '회의록 근거', moduleCandidates: [], openQuestions: ['법무 검토가 필요합니다.'], acceptanceDisposition: 'pending' };
  await app.act('requirement.save', { requirement, clauseIds: [`${source.id}/${source.clauses[0].id}`], reviewed: true });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  const question = state.ai.proposal.issues.find(issue => issue.question === '법무 검토가 필요합니다.');
  assert.ok(question); assert.equal(state.ai.current.status, 'needs-decisions');
  await app.act('ai.answer', { jobId: state.ai.current.id, answers: [{ issueId: question.id, answer: '합성 법무 검토 역할이 이 범위로 진행하도록 결정했다.' }], continueWithAI: true }); await app.engine.waitForAi();
  state = await app.engine.state(); assert.equal(state.ai.current.status, 'ready');
  assert.equal(state.backlog.businessRequirements[0].openQuestions.length, 1);
  await app.act('ai.confirm', { jobId: state.ai.current.id });
  assert.deepEqual(app.store.read().backlog.businessRequirements[0].openQuestions, []);
});

test('retiring judged work requires an explicit reason and per-item confirmation and the previous plan is downloadable', async t => {
  let count = 0;
  const app = await fixture(t, async ({ request }) => {
    if (request.phase === 'analysis') return envelope(analysis(request, { question: false }));
    const value = decomposition(); if (++count === 1) return envelope(value);
    value.workItems[1].id = 'STORY-NEW';
    for (const ac of value.acceptanceCriteria) { ac.id += '-NEW'; ac.workItemId = 'STORY-NEW'; }
    value.traceLinks[0].id = 'TRACE-NEW'; value.traceLinks[0].workItemId = 'STORY-NEW'; value.traceLinks[0].acId = 'AC-ALLOW-NEW';
    value.retirements = [['workItem', 'STORY-1'], ['acceptanceCriterion', 'AC-ALLOW'], ['acceptanceCriterion', 'AC-FORBID'], ['traceLink', 'TRACE-1']].map(([entity, id]) => ({ entity, id, reason: '합성 시험의 명시적 작업 계획 대체안' }));
    return envelope(value);
  });
  await app.start(); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  await app.act('ai.confirm', { jobId: (await app.engine.state()).ai.current.id });
  for (const ac of app.store.read().backlog.acceptanceCriteria) await app.act('uat.record', { acId: ac.id, disposition: 'rejected', signer: '합성 검수 역할', date: '2026-11-06', evidence: '합성 반려 근거', buildRef: 'SYNTHETIC-BUILD' });
  let state = await app.engine.state();
  await app.act('ai.start', { phase: 'decomposition', inputDigest: state.ai.inputDigests.decomposition, consent: true, model: state.ai.model }); await app.engine.waitForAi();
  state = await app.engine.state(); assert.equal(state.ai.current.status, 'ready');
  assert.ok(state.ai.proposal.changes.some(change => change.action === 'removed' && change.hasJudgment));
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }), { code: 'AI_CHANGE_REVIEW_REQUIRED' });
  const keys = state.ai.proposal.retirements.map(item => `${item.entity}:${item.id}`);
  await app.act('ai.confirm', { jobId: state.ai.current.id, confirmedRetirements: keys });
  const record = JSON.parse(app.engine.artifact(state.ai.current.id).content);
  assert.equal(record.inputBacklog.acceptanceCriteria[0].acceptanceDisposition, 'rejected');
  assert.equal(app.store.read().metadata.uatRecords.length, 2);
  assert.equal(app.store.read().backlog.acceptanceCriteria.every(ac => ac.acceptanceDisposition === 'pending'), true);
});

test('text-only processing consent excludes visual bytes and remains text-only when automatic decomposition starts', async t => {
  const calls = [];
  const app = await fixture(t, async ({ request, attachments }) => { calls.push({ phase: request.phase, attachments: attachments?.length ?? 0 }); return envelope(request.phase === 'analysis' ? analysis(request, { question: false }) : decomposition()); }, async input => ({ filename: input.filename, format: 'png', sha256: createHash('sha256').update(input.bytes).digest('hex'), method: 'local-ocr', needsReview: true, warningCodes: [], segments: [{ text: '담당자는 본인 접수 목록을 조회한다.', locator: '합성 이미지 1영역' }] }));
  await app.act('source.ingest', { requestId: randomUUID(), filename: 'receipt.png', base64: readFileSync(new URL('./test-fixtures/receipt.png', import.meta.url)).toString('base64'), sourceType: 'as-is-artifact', classification: 'internal', redacted: true }); await app.engine.waitForImports();
  await app.start({ includeVisuals: false }); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.includeVisuals, false);
  await app.act('ai.confirm', { jobId: state.ai.current.id, continueWithAI: true }); await app.engine.waitForAi();
  state = await app.engine.state();
  assert.equal(state.ai.current.includeVisuals, false);
  assert.deepEqual(calls, [{ phase: 'analysis', attachments: 0 }, { phase: 'decomposition', attachments: 0 }]);
});

test('a corrupt AI archive blocks that proposal while the actual project and sources remain readable', async t => {
  const app = await fixture(t, async ({ request }) => envelope(analysis(request, { question: false })));
  await app.start(); await app.engine.waitForAi();
  const job = (await app.engine.state()).ai.current;
  writeFileSync(join(app.store.directory, 'records', `${job.resultRef.id}.record`), '{}');
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'unavailable');
  assert.equal(state.ai.proposal, null);
  assert.equal(state.backlog.sources[0].title, source.title);
  await assert.rejects(app.act('ai.confirm', { jobId: job.id }));
});

test('reopening persisted running AI and extraction jobs marks them interrupted without replaying either worker', async t => {
  const app = await fixture(t, async ({ request }) => envelope(analysis(request, { question: false })));
  await app.start(); await app.engine.waitForAi();
  app.store.transact(app.store.read().revision, next => {
    next.metadata.ai.jobs.at(-1).status = 'running';
    next.metadata.imports = [{ requestId: randomUUID(), requestDigest: 'a'.repeat(64), sha256: 'b'.repeat(64), filename: 'synthetic-restart.txt', status: 'extracting', startedAt: new Date().toISOString() }];
  });
  await app.engine.close(); app.store.close();
  let calls = 0;
  const store = createRequirementsStore({ workspace: app.store.directory, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validatePrivateBacklog(pack).valid) throw Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner: async () => { calls++; throw Error('MUST-NOT-REPLAY'); }, artifactExtractor: async () => { calls++; throw Error('MUST-NOT-REPLAY'); } });
  try {
    const state = await engine.state();
    assert.equal(state.ai.current.status, 'interrupted');
    assert.equal(state.imports.jobs[0].status, 'interrupted');
    assert.equal(state.ai.active || state.imports.active, false);
    assert.equal(state.backlog.sources.length, 1);
    assert.equal(calls, 0);
  } finally { await engine.close(); store.close(); }
});
