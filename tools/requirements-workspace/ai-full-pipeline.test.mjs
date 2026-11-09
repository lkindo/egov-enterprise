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
    return envelope(result);
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
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); prompts.push(request.instructions); return envelope(reply(request)); });
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

test('unresolved policy decisions pause automatic planning and preserve the previous live workspace', async t => {
  const phases = [];
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); return envelope(reply(request, { blocking: true })); });
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
    execute: async () => envelope({ documentTypes: ['other'], summary: '처리기간과 열람 범위를 설명한다.', blocks: [{ inputId: 'U-1', heading: '업무 규칙', kind: 'paragraph', text: '처리기간은 8일이며 타인 자료 열람은 가능하다.', certainty: 'clear', note: '모델이 확신한 합성 오판독' }], unreadable: [] }),
  });
  const app = await setup(t, async ({ request }) => { phases.push(request.phase); return envelope(reply(request)); }, reader);
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
  let expanded = false; const epicId = 'EPIC-1', batches = [];
  const app = await setup(t, async ({ request }) => {
    if (!expanded) return envelope(reply(request));
    if (request.phase === 'analysis') {
      const value = analysis(request, { question: false }), first = value.requirements[0];
      value.requirements = Array.from({ length: 5 }, (_, index) => ({ ...first, id: `REQ-${index + 1}`, title: `조회 규칙 ${index + 1}` }));
      value.coverage[0].requirementIds = value.requirements.map(req => req.id); return envelope(value);
    }
    if (request.phase === 'decomposition') {
      const batch = request.data.planningBatch, ids = batch.requirementIds, base = decomposition(); batches.push(ids);
      const first = batch.index === 1, child = first ? 'STORY-1' : `${batch.idPrefix}STORY`, allow = first ? 'AC-ALLOW' : `${batch.idPrefix}ALLOW`, forbid = first ? 'AC-FORBID' : `${batch.idPrefix}FORBID`;
      return envelope({ workItems: [{ ...base.workItems[0], id: epicId, requirementIds: ids }, { ...base.workItems[1], id: child, parentEpicId: epicId, requirementIds: ids }], acceptanceCriteria: base.acceptanceCriteria.map(ac => ({ ...ac, id: ac.polarity === 'allow' ? allow : forbid, workItemId: child, requirementIds: ids })), traceLinks: ids.map((id, index) => ({ ...base.traceLinks[0], id: id === 'REQ-1' ? 'TRACE-1' : `${batch.idPrefix}TRACE-${index}`, requirementId: id, workItemId: child, acId: allow })), issues: [] });
    }
    return envelope(reply(request));
  });
  await app.start(); await app.engine.waitForAi(); let state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); await app.act('ai.confirm', { jobId: state.ai.current.id }); expanded = true;
  await app.start(); await app.engine.waitForAi(); state = await app.engine.state();
  assert.equal(state.ai.current.status, 'ready'); assert.deepEqual(batches.map(batch => batch.length), [4, 1]);
  assert.equal(state.ai.proposal.workItems.find(item => item.id === epicId).requirementIds.length, 5);
  assert.equal(state.ai.proposal.acceptanceCriteria.length, 4); assert.equal(state.ai.proposal.traceLinks.length, 5);
  await app.act('ai.confirm', { jobId: state.ai.current.id }); state = await app.engine.state();
  assert.equal(state.backlog.businessRequirements.length, 5); assert.equal(state.backlog.workItems.length, 3); assert.equal(state.readiness.valid, true);
});

test('corrupt stored document structure cannot be rendered or confirmed as a valid proposal', async t => {
  const app = await setup(t, async ({ request }) => envelope(reply(request)));
  await app.start(); await app.engine.waitForAi(); const state = await app.engine.state();
  const record = JSON.parse(app.store.readArchive(state.ai.current.resultRef)); record.pipeline.documents[0].sections = 'untrusted wrong shape';
  const ref = app.store.writeArchive('ai', JSON.stringify(record));
  app.store.transact(app.store.read().revision, next => { next.metadata.ai.jobs.at(-1).resultRef = ref; });
  assert.equal((await app.engine.state()).ai.current.status, 'unavailable');
  await assert.rejects(app.act('ai.confirm', { jobId: state.ai.current.id }), { code: 'AI_OUTPUT_INVALID' });
  assert.equal(app.store.read().backlog.businessRequirements.length, 0);
});

test('a checkpoint cannot inject notices from an unrelated phase into a resumed analysis', async t => {
  const app = await setup(t, async ({ request }) => envelope(reply(request)));
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
      return envelope(value);
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
    return envelope(value);
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
      value.coverage[0].requirementIds = ['REQ-1', 'REQ-2']; return envelope(value);
    }
    if (request.phase === 'decomposition') {
      const value = decomposition(), ids = narrowed ? ['REQ-1'] : ['REQ-1', 'REQ-2'];
      for (const item of [...value.workItems, ...value.acceptanceCriteria]) item.requirementIds = ids;
      if (!narrowed) value.traceLinks.push({ ...value.traceLinks[0], id: 'TRACE-2', requirementId: 'REQ-2' });
      else value.retirements = [{ entity: 'traceLink', id: 'TRACE-2', reason: '합성 후속 결정으로 보조 조회를 범위에서 제외한다.' }];
      if (narrowed) value.workItems = value.workItems.filter(item => item.workItemType !== 'epic');
      return envelope(value);
    }
    return envelope(reply(request));
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
    return envelope(result);
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
    if (request.phase !== 'analysis') return envelope(reply(request));
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
