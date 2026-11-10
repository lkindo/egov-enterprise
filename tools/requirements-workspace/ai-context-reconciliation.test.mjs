import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import * as pipeline from './ai-pipeline.mjs';
import { buildAiRequest, BATCH_ANALYSIS_SCHEMA, validateAnalysisProposal } from './ai-contract.mjs';
import { prepareEvidenceRequest } from './ai-evidence.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { context, source } from './test-fixtures/ai.mjs';
import { aiEffortForPhase } from './ai-cli.mjs';

test('bounded comparison and merge use analysis high while reading remains xhigh', () => {
  assert.equal(aiEffortForPhase('analysis-context'), 'high');
  assert.equal(aiEffortForPhase('analysis-merge'), 'high');
  assert.equal(aiEffortForPhase('reading'), 'xhigh');
});

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture({ many = true } = {}) {
  const backlog = createEmptyBacklogPack(context); backlog.project = { code: 'SYNTHETIC', name: '합성 문맥 재개', institution: '합성 기관', baselineProfile: '' };
  const old = Array.from({ length: many ? 200 : 2 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `OLD-${index}`, text: `기존 ${index}번 조건: ${'담당 업무의 조건과 오프라인 예외를 그대로 보존한다. '.repeat(many ? 65 : 1)}` }));
  const current = { ...structuredClone(source.clauses[0]), id: 'CURRENT', text: '담당자는 신규 접수 목록을 조회하며 타 부서 접수는 거부한다.' };
  backlog.sources = [{ ...structuredClone(source), clauses: [...old, current] }];
  const cite = clause => ({ sourceId: source.id, clauseId: clause.id, quote: clause.text });
  const requirement = (id, clauses) => ({ id, title: `${id} 접수 업무`, description: `${id}의 기존 조건과 오프라인 72시간 예외를 보존한다.`, requirementType: 'functional', solutionDisposition: 'gap-dev', moduleCandidates: [], rationale: '합성 원문 근거', nfrCriteria: null, citations: clauses.map(cite) });
  const previous = { requirements: [requirement('REQ-EARLY', old.slice(0, -1)), requirement('REQ-LATE', old.slice(-1))], issues: [], coverage: old.map(clause => ({ sourceId: source.id, clauseId: clause.id, disposition: 'included', requirementIds: [clause === old.at(-1) ? 'REQ-LATE' : 'REQ-EARLY'], rationale: '기존 원문과 연결' })) };
  const snapshot = { backlog, metadata: { context, imports: [], ai: { decisions: [] } } }, sources = [{ ...backlog.sources[0], clauses: [current] }];
  const request = buildAiRequest(snapshot, 'analysis', [], { sources, batch: { index: 24, total: 96, idPrefix: 'B-SYNTHETIC-24-' }, previousAnalysis: previous, evidenceReferences: true });
  const records = new Map(), checkpoints = [], seenQuotes = new Set(), seenPages = [], calls = [], reused = [];
  const writePart = value => { const ref = { id: randomUUID(), kind: 'ai', sha256: digest(value), bytes: Buffer.byteLength(JSON.stringify(value)) }; records.set(ref.id, structuredClone(value)); return ref; };
  const readPart = ref => { const value = records.get(ref?.id); if (!value || digest(value) !== ref.sha256 || Buffer.byteLength(JSON.stringify(value)) !== ref.bytes) throw Object.assign(Error('invalid part'), { code: 'AI_CHECKPOINT_INVALID' }); return structuredClone(value); };
  let matchBoth = false, unseen = false, relatedOnly = false;
  const run = async ({ request, schema, preparedEvidence }) => {
    const prepared = preparedEvidence ?? prepareEvidenceRequest(request, schema), wire = prepared.request, data = wire.data;
    assert.ok(Buffer.byteLength(JSON.stringify(wire)) + Buffer.byteLength(JSON.stringify(prepared.schema)) <= 72 * 1024);
    calls.push({ phase: request.phase, pages: data.contextPages?.map(page => page.pageId) ?? [] });
    let output;
    if (request.phase === 'analysis') {
      const id = `${data.analysisBatch.idPrefix}REQ-1`;
      output = { requirements: [{ ...requirement(id, [current]), description: '담당자는 신규 접수를 조회하고 타 부서 접수를 거부한다.' }], issues: [], coverage: [{ sourceId: source.id, clauseId: current.id, disposition: 'included', requirementIds: [id], rationale: '신규 조건의 임시 후보' }] };
    } else if (request.phase === 'analysis-context') {
      const candidates = data.requirements, ids = new Set((data.previousAnalysis?.requirements ?? []).map(item => item.id));
      for (const row of data.evidenceCatalog ?? []) if (typeof row[2] === 'string') seenQuotes.add(row[2]);
      seenPages.push(...data.contextPages.map(page => page.pageId));
      output = { inspectedPageIds: data.contextPages.map(page => page.pageId), matches: candidates.flatMap(candidate => [...ids].filter(id => matchBoth || id === 'REQ-LATE').map(requirementId => ({ candidateId: candidate.id, requirementId, relation: relatedOnly ? 'related' : 'same', rationale: '합성 기존 ID와 연결되는 업무 조건' }))), issues: unseen ? [{ id: 'Q-UNSEEN', kind: 'risk', severity: 'blocking', question: '제공되지 않은 증거를 선택해서는 안 된다.', options: [], requirementIds: [candidates[0].id], citations: [cite(old.at(-1))] }] : [] };
    } else if (request.phase === 'analysis-merge') {
      output = { revisions: data.mergeTargets.map(target => ({ ...target.existing, description: `${target.existing.description} ${target.candidates.map(item => item.description).join(' ')}`, citations: target.candidates.flatMap(item => [cite(current)]) })), issues: [] };
    } else throw Error('UNEXPECTED_SYNTHETIC_PHASE');
    return { output: prepared.resolve(output) };
  };
  const options = { snapshot, sources, previous, request, run, writePart, readPart, limitBytes: 72 * 1024, onCheckpoint: value => { checkpoints.push(structuredClone(value)); }, onReuse: name => reused.push(name) };
  return { options, previous, snapshot, old, current, records, checkpoints, calls, seenQuotes, seenPages, reused, matchBoth: () => { matchBoth = true; }, related: () => { relatedOnly = true; }, unseen: () => { unseen = true; } };
}

test('bounded reconciliation visits complete historical proof and resolves a match in the last window without a duplicate ID', async () => {
  assert.equal(typeof pipeline.reconcileAnalysisBatch, 'function');
  const app = fixture(), original = structuredClone(app.previous);
  assert.ok(Buffer.byteLength(JSON.stringify(prepareEvidenceRequest(app.options.request, BATCH_ANALYSIS_SCHEMA).request)) > 768 * 1024);
  const result = await pipeline.reconcileAnalysisBatch(app.options);
  assert.deepEqual(result.output.requirements.map(item => item.id), ['REQ-EARLY', 'REQ-LATE']);
  assert.ok(result.output.requirements[1].description.includes('72시간'));
  assert.ok(result.output.requirements[1].citations.some(cite => cite.clauseId === 'CURRENT'));
  assert.equal(validateAnalysisProposal(result.output, app.snapshot).coverage.length, app.old.length + 1);
  assert.ok(app.old.every(clause => app.seenQuotes.has(clause.text)), 'every historical quote must be visited verbatim');
  assert.deepEqual(app.previous, original);
});

test('a context cancellation resumes after cached comparisons without regenerating pending candidates', async () => {
  assert.equal(typeof pipeline.reconcileAnalysisBatch, 'function');
  const app = fixture(), controller = new AbortController();
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, signal: controller.signal, onCheckpoint: state => { app.checkpoints.push(structuredClone(state)); if (state.contexts.length === 1) controller.abort(); } }), { code: 'AI_CANCELLED' });
  const pending = app.checkpoints.at(-1), firstPages = app.calls.filter(call => call.phase === 'analysis-context').flatMap(call => call.pages);
  app.calls.length = 0;
  const result = await pipeline.reconcileAnalysisBatch({ ...app.options, resume: pending });
  assert.ok(!app.calls.some(call => call.phase === 'analysis'));
  assert.ok(app.calls.filter(call => call.phase === 'analysis-context').every(call => call.pages.every(page => !firstPages.includes(page))));
  assert.equal(result.output.requirements.length, 2); assert.ok(app.reused.length >= 2);
});

test('two matching existing IDs are preserved and an explicit blocking ambiguity remains', async () => {
  assert.equal(typeof pipeline.reconcileAnalysisBatch, 'function');
  const app = fixture({ many: false }); app.matchBoth();
  const result = await pipeline.reconcileAnalysisBatch(app.options), ids = result.output.requirements.map(item => item.id);
  assert.ok(ids.includes('REQ-EARLY') && ids.includes('REQ-LATE'));
  assert.ok(result.output.issues.some(issue => issue.severity === 'blocking' && issue.requirementIds.includes('REQ-EARLY') && issue.requirementIds.includes('REQ-LATE')));
});

test('a distinct related requirement retains a nonblocking link for downstream planning', async () => {
  const app = fixture({ many: false }); app.related();
  const result = await pipeline.reconcileAnalysisBatch(app.options);
  assert.equal(result.output.requirements.length, 3);
  const note = result.output.issues.find(issue => issue.id.includes('CTX-REL') || issue.question.startsWith('계획 연계:'));
  assert.equal(note.severity, 'observation'); assert.equal(note.kind, 'risk');
  assert.ok(note.requirementIds.includes('REQ-LATE'));
  assert.ok(note.requirementIds.some(id => id.startsWith('B-SYNTHETIC-24-TMP-')));
});

test('source-valid evidence outside the supplied context page is rejected before a checkpoint advances', async () => {
  assert.equal(typeof pipeline.reconcileAnalysisBatch, 'function');
  const app = fixture(); app.unseen();
  await assert.rejects(pipeline.reconcileAnalysisBatch(app.options), { code: 'AI_OUTPUT_INVALID' });
  assert.equal(app.checkpoints.at(-1).contexts.length, 0);
  assert.equal(app.calls.filter(call => call.phase === 'analysis-context').length, 2, 'only one value-free correction');
});

test('a substituted pending comparison task is rejected before any new paid call', async () => {
  const app = fixture(), controller = new AbortController();
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, signal: controller.signal, onCheckpoint: state => { app.checkpoints.push(structuredClone(state)); if (state.contexts.length === 1) controller.abort(); } }), { code: 'AI_CANCELLED' });
  const pending = app.checkpoints.at(-1); pending.contexts[0].taskId = '0'.repeat(64); app.calls.length = 0;
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, resume: pending }), { code: 'AI_CHECKPOINT_INVALID' });
  assert.deepEqual(app.calls, []);
});
