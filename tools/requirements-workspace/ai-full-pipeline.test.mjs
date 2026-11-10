import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEmptyBacklogPack, validateBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { createRequirementsStore } from './store.mjs';
import { createRequirementsEngine, initialRequirementsMetadata, validateRequirementsMetadata } from './engine.mjs';
import { context, source, analysis, decomposition, envelope } from './test-fixtures/ai.mjs';
import { PROMPT_VERSION } from './ai-prompts.mjs';
import { readDocument } from './document-reader.mjs';
import { validatePrivateBacklog } from './private-validation.mjs';

async function setup(t, runner, documentReader) {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-full-ai-'));
  const store = createRequirementsStore({ workspace, initialBacklog: createEmptyBacklogPack(context), initialMetadata: initialRequirementsMetadata(context), validateBacklog: pack => { assert.equal(validatePrivateBacklog(pack).valid, true); }, validateMetadata: validateRequirementsMetadata });
  const engine = createRequirementsEngine({ store, root: process.cwd(), contextProvider: async () => context, aiRunner: runner, documentReader });
  t.after(async () => { await engine.close(); store.close(); rmSync(workspace, { recursive: true, force: true }); });
  const act = (name, payload) => engine.action(store.read().revision, name, payload);
  await act('project.save', { code: 'SYNTHETIC', name: '합성 통합 업무', institution: '합성 기관', baselineProfile: '' });
  await act('source.save', source);
  return { engine, store, act, async start() { const state = await engine.state(); return act('ai.start', { phase: 'analysis', fullPipeline: true, inputDigest: state.ai.inputDigests.analysis, model: 'claude-opus-5-5', consent: true }); } };
}
function reply(request, { blocking = false } = {}) {
  switch (request.phase) {
    case 'reading': return { documentTypes: ['interview'], summary: '접수 조회 업무의 담당 책임과 열람 범위를 설명한다.', blocks: request.data.units.map(unit => ({ inputId: unit.id, heading: '접수 조회', kind: 'paragraph', text: null, certainty: 'clear', note: '조회 업무와 범위 정책의 원문' })), unreadable: [] };
    case 'synthesis': return { summary: '담당자의 접수 조회 업무 흐름과 열람 범위를 통합한다.', actors: [{ name: '담당자', responsibility: '접수 목록 조회', sourceIds: ['SRC-1'] }], processes: [{ name: '접수 조회', trigger: '담당자의 조회 요청', steps: ['접수 조회', '결과 확인'], exceptions: [], rules: [], data: ['접수 목록'], sourceIds: ['SRC-1'] }], terms: [], sourceCoverage: request.data.documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: '접수 조회 업무와 담당 범위' })), issues: [] };
    case 'analysis': return analysis(request, { question: blocking });
    case 'review-requirements': return { issues: [], revisions: [] };
    case 'decomposition': return decomposition();
    case 'review-plan': return { issues: [], workItemUpdates: [], acceptanceUpdates: [], traceUpdates: [] };
    default: throw Error(`Unexpected phase ${request.phase}`);
  }
}

test('known cross-stage issue capacity stops after a saved batch and rejects resume before any new model call', async t => {
  const phases = []; let timer;
  const app = await setup(t, async ({ request, signal }) => {
    phases.push(request.phase);
    if (request.phase === 'synthesis') {
      const value = reply(request);
      value.issues = Array.from({ length: 60 }, (_, index) => ({ id: `BIZ-${index}`, kind: 'decision', severity: 'blocking', question: `기관 정책 ${index}의 적용 범위를 확인해 주세요.`, options: [], requirementIds: [], citations: [{ evidenceIndex: 0 }] }));
      return envelope(value, request.phase);
    }
    if (request.phase !== 'analysis') return envelope(reply(request), request.phase);
    if (request.data.analysisBatch.index === 2) {
      await new Promise((resolve, reject) => {
        const stop = code => { clearTimeout(timer); reject(Object.assign(Error(code), { code })); };
        signal.addEventListener('abort', () => stop('AI_CANCELLED'), { once: true });
        timer = setTimeout(() => stop('AI_CLI_FAILED'), 500);
      });
    }
    return envelope({ requirements: [], issues: Array.from({ length: 41 }, (_, index) => ({ id: `REQ-Q-${index}`, kind: 'decision', severity: 'blocking', question: `접수 조건 ${index}의 의사결정을 확인해 주세요.`, options: [], requirementIds: [], citations: [0] })), coverage: request.data.sources.flatMap(src => src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, disposition: 'excluded', rationale: '확인이 필요한 업무 배경' }))) }, request.phase);
  });
  t.after(() => clearTimeout(timer));
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.errorCode, 'AI_ISSUE_CAPACITY');
  assert.equal(state.ai.current.batches.completed, 1);
  const ref = state.ai.current.checkpoints.analysis, bytes = app.store.readArchive(ref);
  phases.length = 0; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(phases, [], 'a known impossible aggregate must not consume another model call');
  assert.equal(state.ai.current.errorCode, 'AI_ISSUE_CAPACITY');
  assert.equal(state.ai.current.modelCalls, 0); assert.equal(state.ai.current.batches.completed, 1);
  assert.equal(app.store.readArchive(ref), bytes); assert.equal(state.backlog.businessRequirements.length, 0);
});

test('full pipeline uses bounded evidence references and restores canonical proof before final validation', async t => {
  const requests = [];
  const app = await setup(t, async ({ request }) => {
    requests.push(request);
    const output = reply(request);
    if (request.phase === 'analysis') for (const requirement of output.requirements) requirement.citations = [0];
    return envelope(output, request.phase);
  });
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  for (const request of requests.filter(item => !['reading', 'synthesis'].includes(item.phase))) {
    assert.equal(request.data.evidenceProtocol, 'stored-evidence-v1');
    assert.ok(Buffer.byteLength(JSON.stringify(request)) <= 768 * 1024);
  }
  assert.equal(state.ai.proposal.requirements[0].citations[0].sourceId, source.id);
  assert.ok(source.clauses[0].text.includes(state.ai.proposal.requirements[0].citations[0].quote));
  assert.equal(state.backlog.businessRequirements.length, 0, 'transport work never approves the draft');
});

test('new call metrics count actual calls and preserve the zero-call meaning of a fully reused run', async t => {
  const phases = []; let app;
  app = await setup(t, async ({ request }) => {
    phases.push(request.phase);
    const metrics = app.store.read().metadata.ai.jobs.at(-1).callMetrics;
    assert.ok(metrics?.activeCalls.some(call => call.stage === request.phase));
    return { ...envelope(reply(request), request.phase), telemetry: { outputBytes: 123, cacheReadInputTokens: 40 } };
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  const first = structuredClone(state.ai.current.callMetrics);
  assert.equal(first.requests, phases.length); assert.equal(first.requests, 6);
  assert.equal(first.corrections, 0); assert.equal(first.peakConcurrency, 1);
  assert.equal(first.outputBytes, 123 * phases.length); assert.equal(first.measuredOutputs, phases.length);
  assert.ok(first.inputBytes > 0); assert.ok(first.logicalInputBytes > 0); assert.ok(first.modelWaitMs >= 0);
  assert.deepEqual(first.activeCalls, []);
  phases.length = 0; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); assert.deepEqual(phases, []);
  assert.equal(state.ai.current.callMetrics.requests, 0); assert.equal(state.ai.current.callMetrics.inputBytes, 0);
  assert.equal(state.ai.current.modelCalls, 0);
  assert.deepEqual(state.metadata.ai.jobs.at(-2).callMetrics, first, 'historical cost is not relabeled as a current call');
  for (const mutate of [value => { value.callMetrics.rawPrompt = 'PRIVATE'; }, value => { value.callMetrics.requests = 1; }, value => { value.callMetrics.inputBytes = -1; }, value => { value.callMetrics.activeCalls = [{ call: 1, stage: 'PRIVATE', batch: 1, startedAt: new Date().toISOString() }]; }]) {
    const invalid = structuredClone(state.metadata); mutate(invalid.ai.jobs.at(-1));
    assert.throws(() => validateRequirementsMetadata(invalid), { code: 'AI_METADATA_INVALID' });
  }
});

async function sevenRequirementReviewApp(t, review) {
  const app = await setup(t, async ({ request }) => {
    if (request.phase === 'review-requirements') return envelope(await review(request), request.phase);
    if (request.phase !== 'analysis') return envelope(reply(request), request.phase);
    const requirements = request.data.sources[0].clauses.map((clause, index) => ({ ...analysis(request, { question: false }).requirements[0], id: `REQ-${index + 1}`, title: `접수 조건 ${index + 1}`, citations: [request.data.evidenceCatalog.findIndex(([sourceId, clauseId, quote, allowed]) => sourceId === source.id && clauseId === clause.id && quote && allowed)] }));
    return envelope({ requirements, issues: [{ id: 'POLICY', kind: 'decision', severity: 'blocking', question: '기관의 접수 처리 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [requirements[0].citations[0]] }], coverage: request.data.sources[0].clauses.map((clause, index) => ({ sourceId: source.id, clauseId: clause.id, disposition: 'included', requirementIds: [requirements[index].id], rationale: '등록한 원문 처리 조건' })) }, request.phase);
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 7 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}`, text: `${source.clauses[0].text} 문단 ${index + 1}의 처리 조건을 유지한다.` })) });
  return app;
}

test('requirement generation keeps prior semantic facts available to every later batch before asking for a new identity', async t => {
  let firstId; const indices = [];
  const app = await setup(t, async ({ request }) => {
    if (request.phase !== 'analysis') return envelope(reply(request), request.phase);
    const index = request.data.analysisBatch.index; indices.push(index);
    if (index === 2) {
      const previous = request.data.previousAnalysis.requirements.find(item => item.id === firstId);
      assert.equal(previous?.description, '담당자가 접수 목록을 조회한다. 예외 승인은 기관의 결정을 기다린다.');
      assert.ok(request.data.previousAnalysis.issues.some(item => item.question === '예외 승인 정책을 확인해 주세요.'));
    }
    const requirement = { ...analysis(request).requirements[0], id: firstId ?? `${request.data.analysisBatch.idPrefix}ONLY`, description: '담당자가 접수 목록을 조회한다. 예외 승인은 기관의 결정을 기다린다.', citations: [0] };
    if (index === 1) firstId = requirement.id;
    return envelope({ requirements: index === 1 ? [requirement] : [], issues: index === 1 ? [{ id: 'POLICY', kind: 'decision', severity: 'blocking', question: '예외 승인 정책을 확인해 주세요.', options: [], requirementIds: [firstId], citations: [0] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map((clause, at) => ({ sourceId: src.id, clauseId: clause.id, disposition: index === 1 && at === 0 ? 'included' : 'excluded', rationale: '접수 업무와 원문 배경을 구별한다.' }))) }, request.phase);
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.deepEqual(indices, [1, 2]); assert.equal(state.ai.proposal.requirements.length, 1);
  assert.equal(state.ai.proposal.coverage.length, 33); assert.equal(state.backlog.businessRequirements.length, 0);
});

test('independent requirement review groups overlap and keep every source and pending decision', async t => {
  let startFirst, startSecond, release, timer;
  const first = new Promise(resolve => { startFirst = resolve; }), second = new Promise(resolve => { startSecond = resolve; }), gate = new Promise(resolve => { release = resolve; });
  const app = await sevenRequirementReviewApp(t, async request => {
    if (request.data.requirements[0].id === 'REQ-1') { startFirst(); await gate; } else startSecond();
    return { issues: [], revisions: [] };
  });
  t.after(() => { clearTimeout(timer); release(); });
  await app.start(); await first;
  const parallel = await Promise.race([second.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); })]);
  clearTimeout(timer); release(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(parallel, true);
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal(state.ai.proposal.requirements.length, 7); assert.equal(state.ai.proposal.coverage.length, 7);
  assert.ok(state.ai.proposal.issues.some(issue => issue.severity === 'blocking'));
});

test('a failed later quality review reuses earlier verified reviews and preserves their revisions exactly once', async t => {
  let fail = true; const reviewed = [];
  const app = await sevenRequirementReviewApp(t, async request => {
    const first = request.data.requirements[0]; reviewed.push(first.id);
    if (first.id === 'REQ-7' && fail) { fail = false; throw Object.assign(Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' }); }
    return { issues: [], revisions: first.id === 'REQ-1' ? [{ ...first, description: first.description + ' 검토된 표현을 한 번만 보완한다.' }] : [] };
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'failed'); assert.equal(state.ai.current.errorCode, 'AI_CLI_FAILED');
  const reference = state.ai.current.checkpoints.review;
  assert.ok(reference, 'the valid first review must be checkpointed before the later failure');
  const oldBytes = app.store.readArchive(reference), record = JSON.parse(oldBytes);
  assert.equal(record.output.version, 2); assert.equal(record.output.replies.length, 1);
  reviewed.length = 0; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(reviewed, ['REQ-7']);
  assert.equal(state.ai.current.status, 'needs-decisions', state.ai.current.errorCode);
  assert.equal((state.ai.proposal.requirements[0].description.match(/검토된 표현/g) ?? []).length, 1);
  assert.equal(app.store.readArchive(reference), oldBytes);
  assert.equal(state.backlog.businessRequirements.length, 0);
});

test('plan review failure reuses the fully validated generated plan and earlier shared-epic reviews', async t => {
  let fail = true; const phases = [], reviewed = [];
  const app = await setup(t, async ({ request }) => {
    phases.push(request.phase);
    if (request.phase === 'decomposition') {
      const base = decomposition(), children = Array.from({ length: 9 }, (_, index) => ({ ...structuredClone(base.workItems[1]), id: `STORY-${index}`, title: `접수 검증 ${index}`, description: index === 0 ? '문의 연락처 010-1234-5678' : base.workItems[1].description }));
      return envelope({ workItems: [base.workItems[0], ...children], acceptanceCriteria: children.flatMap((child, index) => base.acceptanceCriteria.map(ac => ({ ...ac, id: `${ac.id}-${index}`, workItemId: child.id }))), traceLinks: children.map((child, index) => ({ ...base.traceLinks[0], id: `TRACE-${index}`, workItemId: child.id, acId: `${base.acceptanceCriteria[0].id}-${index}` })), issues: [] }, request.phase);
    }
    if (request.phase === 'review-plan') {
      const children = request.data.workItems.filter(item => item.workItemType !== 'epic'); reviewed.push(children[0].id);
      if (children[0].id === 'STORY-8' && fail) { fail = false; throw Object.assign(Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' }); }
      return envelope({ issues: [], workItemUpdates: children[0].id === 'STORY-0' ? [{ ...children[0], title: children[0].title + ' 검토 반영' }] : [], acceptanceUpdates: [], traceUpdates: [] }, request.phase);
    }
    return envelope(reply(request), request.phase);
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'failed'); assert.equal(state.ai.current.errorCode, 'AI_CLI_FAILED');
  const ref = state.ai.current.checkpoints.planning; assert.ok(ref);
  const oldBytes = app.store.readArchive(ref), record = JSON.parse(oldBytes);
  assert.equal(record.output.version, 2); assert.equal(record.output.replies.length, 1);
  phases.length = 0; reviewed.length = 0;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(phases, ['review-plan']); assert.deepEqual(reviewed, ['STORY-8']);
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  assert.equal(state.ai.proposal.workItems.length, 10);
  assert.equal(state.ai.proposal.acceptanceCriteria.length, 18);
  assert.equal((state.ai.proposal.workItems.find(item => item.id === 'STORY-0').title.match(/검토 반영/g) ?? []).length, 1);
  assert.ok(state.ai.current.sensitivityWarnings.some(warning => warning.stage === 'decomposition' && warning.kind === 'mobile-phone'));
  assert.equal(app.store.readArchive(ref), oldBytes);
  assert.equal(state.backlog.workItems.length, 0);
});

test('patterns in original evidence and six-stage results remain private advisories through final task confirmation', async t => {
  const phases = [];
  const app = await setup(t, async ({ request }) => {
    phases.push(request.phase);
    const result = reply(request);
    if (request.phase === 'reading') result.blocks[0].note += ' 연락처 010-1234-5678';
    else if (result.summary) result.summary += ' 연락처 010-1234-5678';
    if (result.requirements) result.requirements[0].description += ' 연락처 010-1234-5678';
    if (result.workItems) result.workItems[0].description = '연락처 010-1234-5678';
    if (result.acceptanceCriteria) result.acceptanceCriteria[0].then += ' 연락처 010-1234-5678';
    return envelope(result, request.phase);
  });
  const current = app.store.read().backlog.sources[0];
  await app.act('source.save', { ...current, summary: '원문 담당 연락처 010-1234-5678' });
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  assert.equal(phases.length, 6);
  assert.ok(state.sensitivityWarnings.some(warning => warning.kind === 'mobile-phone'));
  assert.doesNotMatch(JSON.stringify(state.sensitivityWarnings), /010-1234/);
  assert.equal(state.metadata.baselines.length, 0);
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(phases.length, 6, 'unchanged completed pipeline reuses all checkpoints');
  for (const stage of ['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan']) assert.ok(state.ai.current.sensitivityWarnings.some(warning => warning.stage === stage), `reused ${stage} warning`);
  await app.act('ai.confirm', { jobId: state.ai.current.id });
  state = await app.engine.state();
  assert.equal(state.baselineCurrent, true);
  assert.equal(state.metadata.exports.at(-1).kind, 'task');
  assert.equal(validateBacklogPack(state.backlog).valid, false, 'repository export policy remains strict');
  const exported = state.metadata.exports.at(-1), artifact = app.engine.artifact(exported.id);
  assert.ok(exported.sensitivityWarnings.some(warning => warning.stage === 'export'));
  assert.match(artifact.content, /^> 민감정보 패턴 감지/);
  assert.doesNotMatch(JSON.stringify(exported.sensitivityWarnings), /010-1234/);
  await app.act('export.create', { kind: 'sheets' });
  state = await app.engine.state();
  const requirementSheet = state.metadata.exports.findLast(entry => entry.filename === 'requirements-review.csv');
  const workSheet = state.metadata.exports.findLast(entry => entry.filename === 'stories-ac-review.csv');
  assert.ok(workSheet.sensitivityWarnings.length);
  await app.act('sheets.import', { requirements: app.engine.artifact(requirementSheet.id).content, workItems: app.engine.artifact(workSheet.id).content });
  await app.act('export.create', { kind: 'uat' });
  state = await app.engine.state(); const uatSheet = state.metadata.exports.at(-1);
  assert.ok(uatSheet.sensitivityWarnings.length);
  await app.act('uat.import', { csv: app.engine.artifact(uatSheet.id).content, buildRef: 'SYNTHETIC-BUILD' });
  await app.act('export.create', { kind: 'audit' });
  state = await app.engine.state();
  assert.ok(state.metadata.exports.at(-1).sensitivityWarnings.length);
  assert.match(app.engine.artifact(state.metadata.exports.at(-1).id).content, /^> 민감정보 패턴 감지/);
  await app.act('composition.check', { selection: [] });
  assert.ok((await app.engine.state()).composition);
});

test('one full AI run produces a document model, reviewed requirements, reviewed work and task preview without fabricating human confirmation', async t => {
  const phases = [], prompts = [];
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); prompts.push(request.instructions); return envelope(reply(request), request.phase); });
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.deepEqual(phases, ['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan']);
  assert.ok(prompts.every(prompt => prompt.includes(PROMPT_VERSION)));
  assert.ok(state.ai.proposal.businessModel.processes.length);
  assert.equal(state.ai.proposal.requirements.length, 1);
  assert.equal(state.ai.proposal.workItems.length, 2);
  assert.equal(state.ai.current.promptRefs.length, 6);
  const prompt = app.engine.artifact(state.ai.current.promptRefs[0].ref.id);
  assert.match(prompt.content, /비신뢰 데이터/);
  assert.match(state.ai.proposal.taskPreview, /REQ-1/);
  const expectedPreview = state.ai.proposal.taskPreview;
  const changedRecord = JSON.parse(app.store.readArchive(state.ai.current.resultRef)); changedRecord.pipeline.taskPreview = 'UNVERIFIED TASK PACKAGE';
  const changedRef = app.store.writeArchive('ai', JSON.stringify(changedRecord));
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).resultRef = changedRef; });
  state = await app.engine.state(); assert.equal(state.ai.proposal.taskPreview, expectedPreview, 'preview is derived from the validated plan, not trusted stored display text');
  assert.equal(state.backlog.businessRequirements.length, 0); assert.equal(state.backlog.workItems.length, 0);
  assert.equal(state.metadata.baselines.length, 0); assert.deepEqual(state.metadata.reviewedRequirements, {});
  await app.act('ai.confirm', { jobId: state.ai.current.id });
  state = await app.engine.state();
  assert.equal(state.backlog.businessRequirements.length, 1); assert.equal(state.backlog.workItems.length, 2);
  assert.equal(state.baselineCurrent, true); assert.equal(state.metadata.exports.at(-1).kind, 'task');
  assert.equal(state.metadata.exports.at(-1).stale, false);
  assert.equal(state.backlog.businessRequirements[0].acceptanceDisposition, 'pending');
});

test('old xhigh analysis checkpoints are not relabeled as a new high analysis', async t => {
  const phases = [];
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); return envelope(reply(request), request.phase); });
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  const sources = structuredClone(state.backlog.sources), previousDiscovery = state.ai.current.checkpoints.discovery.id;
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).effort = 'xhigh'; });
  phases.length = 0;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
  assert.deepEqual(phases, ['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan']);
  assert.equal(state.ai.current.effort, 'high'); assert.equal(state.ai.current.resumeFrom, undefined);
  assert.deepEqual(state.ai.current.reusedStages, []);
  assert.notEqual(state.ai.current.checkpoints.discovery.id, previousDiscovery);
  assert.equal(state.metadata.ai.jobs.at(-2).effort, 'xhigh');
  assert.deepEqual(state.backlog.sources, sources); assert.equal(state.metadata.baselines.length, 0);
});

test('unresolved policy decisions pause automatic planning and preserve the previous live workspace', async t => {
  const phases = [];
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); return envelope(reply(request, { blocking: true }), request.phase); });
  await app.start(); await app.engine.waitForAi();
  const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions');
  assert.equal(phases.includes('decomposition'), false);
  assert.equal(state.metadata.baselines.length, 0); assert.equal(state.backlog.businessRequirements.length, 0);
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }), { code: 'AI_DECISIONS_REQUIRED' });
});

test('an independently detected PDF transcription mismatch blocks planning even when every model review claims no issues', async t => {
  const phases = [];
  const reader = (input, options) => readDocument(input, { ...options,
    prepare: async () => ({ format: 'pdf', warningCodes: [], units: [{ id: 'U-1', locator: 'PDF 1쪽', text: null, nativeReference: '처리기간은 3일이며 타인 자료 열람은 불가하다.', attachment: null }] }),
    execute: async () => envelope({ documentTypes: ['other'], summary: '처리기간과 열람 범위를 설명한다.', blocks: [{ inputId: 'U-1', heading: '업무 규칙', kind: 'paragraph', text: '처리기간은 8일이며 타인 자료 열람은 가능하다.', certainty: 'clear', note: '모델이 확신한 합성 오판독' }], unreadable: [] }, 'reading'),
  });
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); return envelope(reply(request), request.phase); }, reader);
  await app.act('source.ingest', { requestId: crypto.randomUUID(), filename: 'synthetic-reference.custom', base64: Buffer.from('처리기간은 3일이며 타인 자료 열람은 불가하다.').toString('base64'), sourceType: 'other', classification: 'internal', redacted: true, consent: true, model: 'claude-opus-5-5', readWithAI: true });
  await app.engine.waitForImports(); assert.equal((await app.engine.state()).imports.jobs.at(-1).needsReview, true);
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions'); assert.equal(phases.includes('decomposition'), false);
  assert.ok(state.ai.proposal.issues.some(issue => issue.id.startsWith('DOC-') && issue.severity === 'blocking'));
  assert.equal(state.backlog.businessRequirements.length, 0); assert.equal(state.metadata.baselines.length, 0);
  const issue = state.ai.proposal.issues.find(issue => issue.id.startsWith('DOC-'));
  await app.act('ai.answer', { jobId: state.ai.current.id, answers: [{ issueId: issue.id, answer: '원본을 확인했다. 처리기간은 3일이고 타인 자료 열람은 불가하다.' }], continueWithAI: true });
  await app.engine.waitForAi(); const resumed = await app.engine.state();
  assert.equal(resumed.ai.current.status, 'ready'); assert.equal(resumed.ai.proposal.issues.some(item => item.id === issue.id), false);
  assert.equal(phases.includes('decomposition'), true); assert.equal(resumed.metadata.baselines.length, 0);
});

test('multiple planning batches retain every requirement, shared epic, AC and trace through final confirmation', async t => {
  let expanded = false; const epicId = 'EPIC-1', batches = [], planningRequests = [];
  const app = await setup(t, async ({ request }) => {
    if (!expanded) return envelope(reply(request), request.phase);
    if (request.phase === 'analysis') {
      const value = analysis(request, { question: false }), first = value.requirements[0];
      value.requirements = Array.from({ length: 5 }, (_, index) => ({ ...first, id: `REQ-${index + 1}`, title: `조회 규칙 ${index + 1}` }));
      value.coverage[0].requirementIds = value.requirements.map(req => req.id); return envelope(value, request.phase);
    }
    if (request.phase === 'decomposition') {
      const batch = request.data.planningBatch, ids = batch.requirementIds, base = decomposition(); batches.push(ids);
      planningRequests.push(structuredClone(request.data));
      const first = batch.index === 1, child = first ? 'STORY-1' : `${batch.idPrefix}STORY`, allow = first ? 'AC-ALLOW' : `${batch.idPrefix}ALLOW`, forbid = first ? 'AC-FORBID' : `${batch.idPrefix}FORBID`;
      return envelope({ workItems: [{ ...base.workItems[0], id: epicId, requirementIds: ids }, { ...base.workItems[1], id: child, parentEpicId: epicId, requirementIds: ids }], acceptanceCriteria: base.acceptanceCriteria.map(ac => ({ ...ac, id: ac.polarity === 'allow' ? allow : forbid, workItemId: child, requirementIds: ids })), traceLinks: ids.map((id, index) => ({ ...base.traceLinks[0], id: id === 'REQ-1' ? 'TRACE-1' : `${batch.idPrefix}TRACE-${index}`, requirementId: id, workItemId: child, acId: allow })), issues: [] });
    }
    return envelope(reply(request), request.phase);
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); await app.act('ai.confirm', { jobId: state.ai.current.id }); expanded = true;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); assert.deepEqual(batches.map(batch => batch.length), [4, 1]);
  assert.ok(planningRequests[1].previousPlanIndex.some(item => item.id === 'STORY-1'), 'global dependency IDs stay visible');
  assert.ok(planningRequests[1].previousWorkItems.some(item => item.id === epicId), 'shared epic meaning remains complete');
  assert.ok(!planningRequests[1].previousWorkItems.some(item => item.id === 'STORY-1'), 'other groups retain their details in storage instead of resending them');
  assert.ok(!planningRequests[1].previousAcceptanceCriteria.some(item => item.workItemId === 'STORY-1'));
  assert.equal(state.ai.proposal.workItems.find(item => item.id === epicId).requirementIds.length, 5);
  assert.equal(state.ai.proposal.acceptanceCriteria.length, 4); assert.equal(state.ai.proposal.traceLinks.length, 5);
  await app.act('ai.confirm', { jobId: state.ai.current.id }); state = await app.engine.state();
  assert.equal(state.backlog.businessRequirements.length, 5); assert.equal(state.backlog.workItems.length, 3); assert.equal(state.readiness.valid, true);
});

test('corrupt stored document structure cannot be rendered or confirmed as a valid proposal', async t => {
  const app = await setup(t, async ({ request }) => envelope(reply(request), request.phase));
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  const record = JSON.parse(app.store.readArchive(state.ai.current.resultRef)); record.pipeline.documents[0].sections = 'untrusted wrong shape';
  const ref = app.store.writeArchive('ai', JSON.stringify(record));
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).resultRef = ref; });
  assert.equal((await app.engine.state()).ai.current.status, 'unavailable');
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }), { code: 'AI_OUTPUT_INVALID' });
  assert.equal(app.store.read().backlog.businessRequirements.length, 0);
});

test('a checkpoint cannot inject notices from an unrelated phase into a resumed analysis', async t => {
  const app = await setup(t, async ({ request }) => envelope(reply(request), request.phase));
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  const checkpoint = JSON.parse(app.store.readArchive(state.ai.current.checkpoints.discovery));
  checkpoint.sensitivityWarnings = [{ kind: 'mobile-phone', stage: 'export', count: 1, paths: ['project'] }];
  const ref = app.store.writeArchive('ai', JSON.stringify(checkpoint));
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).checkpoints.discovery = ref; });
  await app.start(); await app.engine.waitForAi();
  assert.equal((await app.engine.state()).ai.current.errorCode, 'AI_CHECKPOINT_INVALID');
});

test('legacy representative anchors are rebuilt from canonical originals without re-calling models or trusting forged model/source data', async t => {
  for (const fault of ['anchors-only', 'forged-model', 'source-metadata', 'later-title', 'later-source-id']) {
    const phases = [];
    const app = await setup(t, async ({ request }) => {
      phases.push(request.phase); const value = reply(request);
      if (request.phase === 'synthesis') value.summary += ' 연락처 010-1234-5678';
      if (request.phase === 'analysis') {
        value.requirements[0].citations = value.requirements[0].citations.filter(cite => cite.clauseId !== 'C-DEC');
        const decoration = value.coverage.find(entry => entry.clauseId === 'C-DEC'); decoration.disposition = 'excluded'; decoration.requirementIds = []; decoration.rationale = '장식선은 기능 요구의 근거가 아니다';
      }
      return envelope(value, request.phase);
    });
    await app.act('source.save', { ...structuredClone(source), clauses: [{ ...source.clauses[0], text: source.clauses[0].text + ' 연락처 010-1234-5678' }, { ...source.clauses[0], id: 'C-DEC', text: '─'.repeat(30) }] });
    if (fault.startsWith('later-')) await app.act('source.save', { ...structuredClone(source), id: 'SRC-2', title: '합성 두 번째 자료' });
    const originals = structuredClone(app.store.read().backlog.sources);
    await app.start(); await app.engine.waitForAi(); let state = await app.engine.state(); assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode);
    const completedCalls = phases.length;
    assert.equal(phases.filter(phase => phase === 'reading').length, originals.length); assert.equal(phases.filter(phase => phase === 'synthesis').length, 1);
    const checkpoint = JSON.parse(app.store.readArchive(state.ai.current.checkpoints.discovery));
    assert.ok(checkpoint.sensitivityWarnings.some(warning => warning.stage === 'synthesis' && warning.kind === 'mobile-phone'));
    checkpoint.output.documents[0].anchors.push({ sourceId: source.id, clauseId: 'C-DEC', quote: '─'.repeat(30) });
    if (fault === 'forged-model') checkpoint.output.businessModel.issues.push({ id: 'Q-FORGED', kind: 'risk', severity: 'blocking', question: '합성 검증 질문', options: [], requirementIds: [], citations: [{ sourceId: source.id, clauseId: source.clauses[0].id, quote: 'INVENTED-UNTRUSTED-CITATION' }] });
    if (fault === 'source-metadata') checkpoint.output.documents[0].title = 'FORGED-TITLE';
    if (fault === 'later-title') checkpoint.output.documents[1].title = 'FORGED-TITLE';
    if (fault === 'later-source-id') checkpoint.output.documents[1].sourceId = 'UNKNOWN';
    const ref = app.store.writeArchive('ai', JSON.stringify(checkpoint));
    app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).checkpoints.discovery = ref; });
    await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
    assert.equal(phases.length, completedCalls, `no original reading or model execution repeats: ${fault} ${phases.join(',')}`);
    assert.deepEqual(state.backlog.sources, originals); assert.equal(state.metadata.baselines.length, 0);
    if (fault === 'anchors-only') { assert.equal(state.ai.current.status, 'ready', state.ai.current.errorCode); assert.notEqual(state.ai.current.checkpoints.discovery.id, ref.id); const refreshed = JSON.parse(app.store.readArchive(state.ai.current.checkpoints.discovery)); assert.equal(refreshed.output.documents[0].anchors.length, 1); assert.deepEqual(refreshed.output.businessModel, checkpoint.output.businessModel); assert.deepEqual(refreshed.sensitivityWarnings, checkpoint.sensitivityWarnings); }
    else { assert.equal(state.ai.current.status, 'failed'); assert.equal(state.ai.current.errorCode, 'AI_OUTPUT_INVALID'); }
    assert.equal(JSON.parse(app.store.readArchive(ref)).output.documents[0].anchors.length, 2, 'old immutable history is retained');
  }
});

test('no executable scope asks a concrete scope question instead of failing in the planning stage', async t => {
  const phases = [];
  const app = await setup(t, async ({ request }) => {
    phases.push(request.phase); const value = reply(request);
    if (request.phase === 'analysis') { value.requirements[0].scope = 'excluded'; value.coverage[0].disposition = 'excluded'; }
    return envelope(value, request.phase);
  });
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  assert.equal(state.ai.current.status, 'needs-decisions');
  assert.match(state.ai.proposal.issues.at(-1).question, /포함할 업무 요구사항/);
  assert.equal(phases.includes('decomposition'), false);
});

test('regenerating a narrower scope removes old epic coverage only with explicit final scope and trace acknowledgements', async t => {
  let narrowed = false;
  const app = await setup(t, async ({ request }) => {
    if (request.phase === 'analysis') {
      const value = analysis(request, { question: false });
      value.requirements.push({ ...value.requirements[0], id: 'REQ-2', title: '접수 보조 조회', ...(narrowed ? { scope: 'excluded' } : {}) });
      value.coverage[0].requirementIds = ['REQ-1', 'REQ-2']; return envelope(value, request.phase);
    }
    if (request.phase === 'decomposition') {
      const value = decomposition(), ids = narrowed ? ['REQ-1'] : ['REQ-1', 'REQ-2'];
      for (const item of [...value.workItems, ...value.acceptanceCriteria]) item.requirementIds = ids;
      if (!narrowed) value.traceLinks.push({ ...value.traceLinks[0], id: 'TRACE-2', requirementId: 'REQ-2' });
      else value.retirements = [{ entity: 'traceLink', id: 'TRACE-2', reason: '합성 후속 결정으로 보조 조회를 범위에서 제외한다.' }];
      if (narrowed) value.workItems = value.workItems.filter(item => item.workItemType !== 'epic');
      return envelope(value, request.phase);
    }
    return envelope(reply(request), request.phase);
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); await app.act('ai.confirm', { jobId: state.ai.current.id });
  narrowed = true; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.deepEqual(state.ai.proposal.workItems.find(item => item.workItemType === 'epic').requirementIds, ['REQ-1']);
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }));
  assert.equal(app.store.read().backlog.businessRequirements.find(req => req.id === 'REQ-2').scopeDisposition, 'included');
  const scopeIds = state.ai.proposal.changes.filter(change => change.requiresScopeReview).map(change => change.id);
  await app.act('ai.confirm', { jobId: state.ai.current.id, confirmedScopeChanges: scopeIds, confirmedRetirements: ['traceLink:TRACE-2'] });
  state = await app.engine.state(); assert.equal(state.backlog.businessRequirements.find(req => req.id === 'REQ-2').scopeDisposition, 'excluded');
  assert.equal(state.metadata.exports.at(-1).stale, false);
});

test('an explicitly restarted unchanged pipeline reuses validated checkpoints, and changed input invalidates them', async t => {
  const phases = []; let rejectReview = true;
  const app = await setup(t, async ({ request }) => {
    phases.push(request.phase);
    if (request.phase === 'review-requirements' && rejectReview) { rejectReview = false; throw Object.assign(new Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' }); }
    const result = reply(request);
    if (result.summary) result.summary += ' 연락처 010-1234-5678';
    if (result.requirements) result.requirements[0].description += ' 연락처 010-1234-5678';
    return envelope(result, request.phase);
  });
  await app.start(); await app.engine.waitForAi();
  let state = await app.engine.state(); assert.equal(state.ai.current.status, 'failed');
  assert.deepEqual(state.sensitivityWarnings, [], 'failed unpublished results do not pollute the workspace advisory');
  assert.ok(state.ai.current.checkpoints.analysis); assert.ok(state.ai.current.checkpoints.discovery);
  phases.length = 0;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready');
  assert.deepEqual(phases, ['review-requirements', 'decomposition', 'review-plan']);
  assert.ok(state.ai.current.reusedStages.includes('analysis'));
  for (const stage of ['reading', 'synthesis', 'analysis']) assert.ok(state.ai.current.sensitivityWarnings.some(warning => warning.stage === stage && warning.kind === 'mobile-phone'), `reused ${stage} warning must be retained in this job`);
  await app.act('source.save', { ...source, clauses: [{ ...source.clauses[0], text: `${source.clauses[0].text} 빈 목록은 빈 결과로 안내한다.` }] });
  phases.length = 0;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); assert.equal(phases[0], 'reading'); assert.ok(phases.includes('analysis'));
});

test('a failed later analysis batch resumes after validated prior coverage without losing its decision question', async t => {
  let failSecond = true; const indices = [];
  const app = await setup(t, async ({ request }) => {
    if (request.phase !== 'analysis') return envelope(reply(request), request.phase);
    const batch = request.data.analysisBatch; indices.push(batch.index);
    if (batch.index === 2 && failSecond) { failSecond = false; throw Object.assign(new Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' }); }
    return envelope({ requirements: [], issues: batch.index === 1 ? [{ id: 'POLICY', kind: 'decision', severity: 'blocking', question: '접수 업무의 적용 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: 'SRC-1', clauseId: request.data.sources[0].clauses[0].id, quote: source.clauses[0].text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, disposition: 'excluded', rationale: '업무 배경이며 적용 범위 결정이 필요하다.' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}`, locator: `문단 ${index + 1}` })) });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state(); assert.equal(state.ai.current.status, 'failed');
  const checkpoint = JSON.parse(app.store.readArchive(state.ai.current.checkpoints.analysis));
  const originalQuestion = checkpoint.output.output.issues[0];
  assert.equal(originalQuestion.question, '접수 업무의 적용 범위를 확인해 주세요.');
  indices.length = 0; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(indices, [2]); assert.equal(state.ai.current.status, 'needs-decisions');
  assert.equal(state.ai.proposal.coverage.length, 33); assert.deepEqual(state.ai.proposal.issues[0], originalQuestion);
});

for (const [recovers, rejectsFirst] of [[true, true], [false, true], [true, false]]) test(`resuming a corrected checkpoint keeps fresh correction and prior evidence: recovery=${recovers}, invalid=${rejectsFirst}`, async t => {
  let failSecond = true; const indices = [], counts = new Map();
  const app = await setup(t, async ({ request }) => {
    if (request.phase !== 'analysis') return envelope(reply(request), request.phase);
    const index = request.data.analysisBatch.index; indices.push(index);
    if (index === 2 && failSecond) { failSecond = false; throw Object.assign(Error('AI_CLI_FAILED'), { code: 'AI_CLI_FAILED' }); }
    const attempt = (counts.get(index) ?? 0) + 1; counts.set(index, attempt);
    const src = request.data.sources[0], clause = src.clauses[0];
    const invalid = index === 1 && attempt === 1 || index === 2 && (rejectsFirst && attempt === 1 || !recovers);
    return envelope({ requirements: [], issues: invalid || index === 1 ? [{ id: `Q-${index}`, kind: 'decision', severity: 'blocking', question: `${index}번 업무 범위를 확인해 주세요.`, options: [], requirementIds: [], citations: [{ sourceId: src.id, clauseId: clause.id, quote: invalid ? '원문에 없는 합성 인용문' : clause.text }] }] : [], coverage: request.data.sources.flatMap(src => src.clauses.map(part => ({ sourceId: src.id, clauseId: part.id, disposition: 'excluded', rationale: '업무 배경이며 범위 확인이 필요하다.' }))) });
  });
  await app.act('source.save', { ...source, clauses: Array.from({ length: 33 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` })) });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.errorCode, 'AI_CLI_FAILED');
  assert.equal(state.ai.current.attempts, 2, 'the current run retains the earlier successful correction in its audit');
  const oldRef = state.ai.current.checkpoints.analysis, oldBytes = app.store.readArchive(oldRef), checkpoint = JSON.parse(oldBytes);
  assert.equal(checkpoint.output.completed, 1); assert.equal(checkpoint.output.corrected, true);
  indices.length = 0; await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.deepEqual(indices, rejectsFirst ? [2, 2] : [2]); assert.equal(state.ai.current.status, recovers ? 'needs-decisions' : 'failed', state.ai.current.errorCode);
  assert.equal(state.ai.current.attempts, rejectsFirst ? 2 : 1, 'old checkpoint corrections are not counted as new-run model calls');
  assert.equal(app.store.readArchive(oldRef), oldBytes);
  if (recovers) { assert.equal(state.ai.proposal.coverage.length, 33); assert.equal(state.ai.proposal.issues[0].question, checkpoint.output.output.issues[0].question); }
  else { assert.equal(state.ai.current.errorCode, 'AI_OUTPUT_INVALID'); assert.deepEqual(state.ai.current.checkpoints.analysis, oldRef); assert.equal(state.ai.current.batches.completed, 1); }
  assert.equal(state.metadata.baselines.length, 0);
});
