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

async function fixture(t, aiRunner, artifactExtractor) {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-ai-workflow-'));
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validateBacklogPack(pack).valid) throw new Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner, artifactExtractor });
  t.after(async () => { await engine.close?.(); store.close(); rmSync(workspace, { recursive: true, force: true }); });
  const act = (action, payload) => engine.action(store.read().revision, action, payload);
  await act('project.save', { code: 'SYNTHETIC', name: '합성 접수 업무', institution: '합성 기관', baselineProfile: '' });
  await act('source.save', source);
  const start = async (options = {}) => { const state = await engine.state(); return act('ai.start', { phase: 'analysis', inputDigest: state.ai.inputDigests.analysis, consent: true, model: 'claude-opus-5-5', ...options }); };
  return { engine, store, act, start };
}

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
  assert.equal(calls[1].data.correction.previousOutput.coverage[0].requirementIds[0], 'UNKNOWN');
  assert.equal(calls[1].data.correction.violations[0].kind, 'coverage-reference');
  assert.equal(state.backlog.businessRequirements.length, 0);
  assert.doesNotMatch(app.store.readArchive(state.ai.current.resultRef), /UNKNOWN/);
});

test('correction is bounded and sensitive or malformed output is never sent back for correction', async t => {
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
    assert.equal(state.ai.current.status, 'failed');
    assert.equal(count, sensitive ? 1 : 2);
    assert.equal(state.ai.current.resultRef, undefined);
    assert.equal(state.backlog.businessRequirements.length, 0);
  }
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
  const store = createRequirementsStore({ workspace: app.store.directory, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { if (!validateBacklogPack(pack).valid) throw Error('INVALID'); }, validateMetadata: validateRequirementsMetadata });
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
