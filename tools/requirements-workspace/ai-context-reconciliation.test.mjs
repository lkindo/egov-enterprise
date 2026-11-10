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
function fixture({ many = true, reference = false } = {}) {
  const backlog = createEmptyBacklogPack(context); backlog.project = { code: 'SYNTHETIC', name: '합성 문맥 재개', institution: '합성 기관', baselineProfile: '' };
  const old = Array.from({ length: many ? 200 : 2 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `OLD-${index}`, text: `기존 ${index}번 조건: ${'담당 업무의 조건과 오프라인 예외를 그대로 보존한다. '.repeat(many ? 65 : 1)}` }));
  const current = { ...structuredClone(source.clauses[0]), id: 'CURRENT', text: '담당자는 신규 접수 목록을 조회하며 타 부서 접수는 거부한다.' };
  const ref = { ...structuredClone(source), id: 'SRC-REF', clauses: [{ ...source.clauses[0], id: 'REF', text: '이 참고 문서의 별칭은 다른 문서로 확대 적용하지 않는다.' }] };
  backlog.sources = [{ ...structuredClone(source), clauses: [...old, current] }];
  if (reference) backlog.sources.push(ref);
  const cite = clause => ({ sourceId: source.id, clauseId: clause.id, quote: clause.text });
  const requirement = (id, clauses) => ({ id, title: `${id} 접수 업무`, description: `${id}의 기존 조건과 오프라인 72시간 예외를 보존한다.`, requirementType: 'functional', solutionDisposition: 'gap-dev', moduleCandidates: [], rationale: '합성 원문 근거', nfrCriteria: null, citations: clauses.map(cite) });
  const previous = { requirements: [requirement('REQ-EARLY', old.slice(0, -1)), requirement('REQ-LATE', old.slice(-1))], issues: [], coverage: old.map(clause => ({ sourceId: source.id, clauseId: clause.id, disposition: 'included', requirementIds: [clause === old.at(-1) ? 'REQ-LATE' : 'REQ-EARLY'], rationale: '기존 원문과 연결' })) };
  const snapshot = { backlog, metadata: { context, imports: [], ai: { decisions: [] } } }, sources = [{ ...backlog.sources[0], clauses: [current] }];
  if (reference) sources.push(ref);
  const request = buildAiRequest(snapshot, 'analysis', [], { sources, batch: { index: 24, total: 96, idPrefix: 'B-SYNTHETIC-24-' }, previousAnalysis: previous, evidenceReferences: true });
  const records = new Map(), checkpoints = [], seenQuotes = new Set(), seenPages = [], calls = [], reused = [];
  const writePart = value => { const ref = { id: randomUUID(), kind: 'ai', sha256: digest(value), bytes: Buffer.byteLength(JSON.stringify(value)) }; records.set(ref.id, structuredClone(value)); return ref; };
  const readPart = ref => { const value = records.get(ref?.id); if (!value || digest(value) !== ref.sha256 || Buffer.byteLength(JSON.stringify(value)) !== ref.bytes) throw Object.assign(Error('invalid part'), { code: 'AI_CHECKPOINT_INVALID' }); return structuredClone(value); };
  let matchBoth = false, unseen = false, relatedOnly = false, badModule = false, badScope = false, enrichAll = false, scopeProposal = false;
  const run = async ({ request, schema, preparedEvidence }) => {
    const prepared = preparedEvidence ?? prepareEvidenceRequest(request, schema), wire = prepared.request, data = wire.data;
    assert.ok(Buffer.byteLength(JSON.stringify(wire)) + Buffer.byteLength(JSON.stringify(prepared.schema)) <= 72 * 1024);
    calls.push({ phase: request.phase, pages: data.contextPages?.map(page => page.pageId) ?? [] });
    let output;
    if (request.phase === 'analysis') {
      const id = `${data.analysisBatch.idPrefix}REQ-1`;
      output = { requirements: [{ ...requirement(id, [current]), description: '담당자는 신규 접수를 조회하고 타 부서 접수를 거부한다.' }], issues: [], coverage: [{ sourceId: source.id, clauseId: current.id, disposition: 'included', requirementIds: [id], rationale: '신규 조건의 임시 후보' }] };
      if (reference) output.coverage.push({ sourceId: ref.id, clauseId: 'REF', disposition: 'deferred', requirementIds: [], rationale: '독립 기능이 아닌 문서 적용 범위의 참고' });
    } else if (request.phase === 'analysis-context') {
      const candidates = data.requirements, ids = new Set((data.previousAnalysis?.requirements ?? []).map(item => item.id));
      for (const row of data.evidenceCatalog ?? []) if (typeof row[2] === 'string') seenQuotes.add(row[2]);
      for (const record of data.previousAnalysis?.requirements ?? []) for (const cite of record.citations) { assert.equal(typeof cite.quote, 'string'); seenQuotes.add(cite.quote); }
      for (const src of data.historicalSources ?? []) for (const clause of src.clauses) seenQuotes.add(clause.text);
      seenPages.push(...data.contextPages.map(page => page.pageId));
      const lateProvided = data.historicalSources?.some(src => src.clauses.some(clause => clause.id === old.at(-1).id));
      output = { inspectedPageIds: data.contextPages.map(page => page.pageId), matches: candidates.filter(candidate => !candidate.questionOnly).flatMap(candidate => [...ids].filter(id => matchBoth || id === 'REQ-LATE' && lateProvided).map(requirementId => ({ candidateId: candidate.id, requirementId, relation: relatedOnly ? 'related' : 'same', rationale: '합성 기존 ID와 연결되는 업무 조건' }))), issues: unseen ? [{ id: 'Q-UNSEEN', kind: 'risk', severity: 'blocking', question: '제공되지 않은 증거를 선택해서는 안 된다.', options: [], requirementIds: [candidates[0].id], citations: [cite(old.at(-1))] }] : [] };
      for (const match of output.matches) {
        const candidate = candidates.find(item => item.id === match.candidateId);
        if (candidate.contextOnly) match.citations = candidate.sourceRefs.map(ref => ({ ...ref, quote: data.sources.find(src => src.id === ref.sourceId).clauses.find(clause => clause.id === ref.clauseId).text }));
      }
      if (enrichAll && data.historicalSources.length) output.evidenceLinks = [{ candidateId: candidates[0].id, clarification: '자료 연계: 제공된 과거 조건을 현재 접수 기준과 함께 보존한다.', citations: data.historicalSources.flatMap(src => src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, quote: clause.text }))) }];
    } else if (request.phase === 'analysis-merge') {
      output = { revisions: data.mergeTargets.map(target => ({ ...target.existing, description: `${target.existing.description} ${target.candidates.map(item => item.description).join(' ')}`, citations: target.candidates.flatMap(item => [cite(current)]) })), issues: [] };
      if (reference) output.revisions[0].citations.push({ sourceId: ref.id, clauseId: 'REF', quote: ref.clauses[0].text });
      if (badModule) { output.revisions[0].moduleCandidates = ['UNPROVIDED-MODULE']; badModule = false; }
      if (badScope) output.revisions[0].scope = 'OUTSIDE-CONTRACT';
      if (scopeProposal) output.revisions[0].scope = 'excluded';
    } else throw Error('UNEXPECTED_SYNTHETIC_PHASE');
    if (prepared.schema.properties.matches) { output.evidenceLinks ??= []; output.referenceAnswers ??= []; }
    return { output: prepared.resolve(output) };
  };
  const options = { snapshot, sources, previous, request, run, writePart, readPart, limitBytes: 72 * 1024, onCheckpoint: value => { checkpoints.push(structuredClone(value)); }, onReuse: name => reused.push(name) };
  return { options, previous, snapshot, old, current, records, checkpoints, calls, seenQuotes, seenPages, reused, matchBoth: () => { matchBoth = true; }, related: () => { relatedOnly = true; }, unseen: () => { unseen = true; }, badModule: () => { badModule = true; }, badScope: () => { badScope = true; }, enrich: () => { enrichAll = true; }, proposeScope: () => { scopeProposal = true; } };
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
  const note = result.output.contextRelations[0];
  assert.equal(result.output.issues.length, 0);
  assert.ok(note.requirementIds.includes('REQ-LATE'));
  assert.ok(note.requirementIds.some(id => id.startsWith('B-SYNTHETIC-24-REQ-')));
  assert.ok(result.output.requirements.every(req => !req.id.includes('TMP-')));
});

test('a newly cited current reference is linked after integration without turning its document-scoped rule into approval', async () => {
  const app = fixture({ many: false, reference: true }), result = await pipeline.reconcileAnalysisBatch(app.options);
  assert.equal(result.output.coverage.find(entry => entry.sourceId === 'SRC-REF').disposition, 'merged');
  assert.ok(result.output.requirements.find(req => req.id === 'REQ-LATE').citations.some(cite => cite.sourceId === 'SRC-REF'));
});

test('an unknown merge module is corrected before a successful piece is checkpointed', async () => {
  const app = fixture({ many: false }); app.badModule();
  const result = await pipeline.reconcileAnalysisBatch(app.options);
  assert.equal(app.calls.filter(call => call.phase === 'analysis-merge').length, 2);
  assert.equal(app.checkpoints.at(-1).merges.length, 1);
  assert.deepEqual(result.output.requirements.find(req => req.id === 'REQ-LATE').moduleCandidates, []);
});

test('an invalid merge scope is rejected before it can poison a reusable pending piece', async () => {
  const app = fixture({ many: false }); app.badScope();
  await assert.rejects(pipeline.reconcileAnalysisBatch(app.options), { code: 'AI_OUTPUT_INVALID' });
  assert.equal(app.calls.filter(call => call.phase === 'analysis-merge').length, 2);
  assert.equal(app.checkpoints.at(-1).merges.length, 0);
});

test('a grounded scope change remains a visible proposal and leaves the registered human scope untouched', async () => {
  const app = fixture({ many: false }); app.proposeScope();
  app.current.text = '기관의 요청: 이번 사업 범위에서 접수 목록 조회를 제외한다. 기존 요구사항 식별자는 유지한다.';
  const old = app.previous.requirements.find(req => req.id === 'REQ-LATE');
  app.snapshot.backlog.businessRequirements = [{ ...structuredClone(old), sourceIds: [source.id], scopeDisposition: 'included', openQuestions: [], acceptanceDisposition: 'pending' }];
  delete app.snapshot.backlog.businessRequirements[0].citations;
  app.options.request = buildAiRequest(app.snapshot, 'analysis', [], { sources: app.options.sources, previousAnalysis: app.previous, batch: { index: 24, total: 96, idPrefix: 'B-SYNTHETIC-24-' }, evidenceReferences: true });
  const result = await pipeline.reconcileAnalysisBatch(app.options), checked = validateAnalysisProposal(result.output, app.snapshot);
  assert.equal(result.output.requirements.find(req => req.id === 'REQ-LATE').scope, 'excluded');
  assert.equal(app.snapshot.backlog.businessRequirements[0].scopeDisposition, 'included');
  assert.ok(JSON.stringify(checked.changes).includes('scopeDisposition'));
});

test('one large enriched candidate is merged through bounded proof pages and resumes after its verified first merge', async () => {
  const app = fixture(), controller = new AbortController(), original = structuredClone(app.previous); app.enrich();
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, signal: controller.signal, onCheckpoint: state => { app.checkpoints.push(structuredClone(state)); if (state.merges.length === 1) controller.abort(); } }), { code: 'AI_CANCELLED' });
  const pending = app.checkpoints.at(-1); assert.equal(pending.merges.length, 1); assert.deepEqual(app.previous, original);
  app.calls.length = 0;
  const result = await pipeline.reconcileAnalysisBatch({ ...app.options, resume: pending });
  assert.ok(app.calls.length > 1); assert.ok(app.calls.every(call => call.phase === 'analysis-merge'));
  const req = result.output.requirements.find(req => req.id === 'REQ-LATE');
  assert.ok(app.old.every(clause => req.citations.some(cite => cite.clauseId === clause.id && cite.quote === clause.text)));
  assert.ok(req.citations.some(cite => cite.clauseId === 'CURRENT'));
  assert.equal(new Set(req.citations.map(cite => JSON.stringify(cite))).size, req.citations.length);
});

test('source-valid evidence outside the supplied context page is rejected before a checkpoint advances', async () => {
  assert.equal(typeof pipeline.reconcileAnalysisBatch, 'function');
  const app = fixture(); app.unseen();
  await assert.rejects(pipeline.reconcileAnalysisBatch(app.options), { code: 'AI_OUTPUT_INVALID' });
  assert.equal(app.checkpoints.at(-1).contexts.length, 0);
  assert.equal(app.calls.filter(call => call.phase === 'analysis-context').length, 2, 'only one value-free correction');
});

test('a substituted pending comparison task rebuilds only pending work and preserves the canonical prefix', async () => {
  const app = fixture(), controller = new AbortController();
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, signal: controller.signal, onCheckpoint: state => { app.checkpoints.push(structuredClone(state)); if (state.contexts.length === 1) controller.abort(); } }), { code: 'AI_CANCELLED' });
  const pending = app.checkpoints.at(-1); pending.contexts[0].taskId = '0'.repeat(64); app.calls.length = 0;
  const original = structuredClone(app.previous), resets = [];
  const result = await pipeline.reconcileAnalysisBatch({ ...app.options, resume: pending, onReset: reason => resets.push(reason) });
  assert.deepEqual(resets, ['pending-invalid']); assert.deepEqual(app.previous, original);
  assert.equal(app.calls.filter(call => call.phase === 'analysis').length, 1); assert.equal(result.output.requirements.length, 2);
});

test('previously uncited background definitions are read in full and integrated into the current requirement before its ID is committed', async () => {
  const backlog = createEmptyBacklogPack(context); backlog.project = { code: 'SYNTHETIC', name: '합성 과거 정의 연결', institution: '', baselineProfile: '' };
  const definition = { ...structuredClone(source), id: 'SRC-OLD', clauses: [{ ...source.clauses[0], id: 'DEF', text: '기관 달력: 정기 신청은 접수 완료일부터 17영업일 이내 처리한다. 비상 신청에는 별도 5영업일 규칙을 적용한다.' }] };
  const current = { ...structuredClone(source), clauses: [{ ...source.clauses[0], text: '담당자는 정기 신청을 기관 달력에 정한 처리기간 안에 처리한다.' }] };
  backlog.sources = [definition, current];
  const snapshot = { backlog, metadata: { context, imports: [], ai: { decisions: [] } } }, previous = { requirements: [], issues: [], coverage: [{ sourceId: definition.id, clauseId: 'DEF', disposition: 'excluded', rationale: '앞선 묶음의 배경 정의', requirementIds: [] }] };
  const request = buildAiRequest(snapshot, 'analysis', [], { sources: [current], previousAnalysis: previous, batch: { index: 2, total: 2, idPrefix: 'B-BACKGROUND-' }, evidenceReferences: true });
  const storage = new Map(), cite = src => ({ sourceId: src.id, clauseId: src.clauses[0].id, quote: src.clauses[0].text });
  const base = { id: 'B-BACKGROUND-TMP-REQ', title: '정기 신청 처리', description: '정기 신청은 기관 달력의 처리기간을 따른다.', requirementType: 'functional', solutionDisposition: 'gap-dev', moduleCandidates: [], rationale: '현재 문서의 기관 달력 참조', nfrCriteria: null, citations: [cite(current)] };
  const phases = [];
  const result = await pipeline.reconcileAnalysisBatch({ snapshot, sources: [current], previous, request,
    writePart(value) { const ref = { id: randomUUID(), kind: 'ai', sha256: digest(value), bytes: Buffer.byteLength(JSON.stringify(value)) }; storage.set(ref.id, structuredClone(value)); return ref; }, readPart: ref => structuredClone(storage.get(ref.id)),
    run: async ({ request, preparedEvidence }) => {
      phases.push(request.phase); let output;
      if (request.phase === 'analysis') output = { requirements: [base], issues: [], updatedRequirementIds: [], coverage: [{ sourceId: current.id, clauseId: current.clauses[0].id, disposition: 'included', requirementIds: [base.id], rationale: '기관 달력을 참조하는 정기 처리' }] };
      else if (request.phase === 'analysis-context') {
        assert.equal(request.data.historicalSources[0].clauses[0].text, definition.clauses[0].text);
        output = { inspectedPageIds: request.data.contextPages.map(page => page.pageId), matches: [], issues: [], evidenceLinks: [{ candidateId: base.id, clarification: '기관 달력의 정기 신청 17영업일 정의를 적용하고 비상 5영업일과 구별한다.', citations: [cite(definition)] }] };
      } else {
        assert.equal(request.phase, 'analysis-merge');
        assert.ok(request.data.mergeTargets[0].candidates.some(req => req.citations.some(citation => citation.quote === definition.clauses[0].text)));
        output = { revisions: [{ ...base, id: request.data.mergeTargets[0].existing.id, description: '담당자는 정기 신청을 접수 완료일부터 17영업일 이내 처리한다. 비상 신청은 이 요구사항의 대상이 아니다.', citations: [cite(current), cite(definition)] }], issues: [] };
      }
      if (preparedEvidence.schema.properties.matches) { output.evidenceLinks ??= []; output.referenceAnswers ??= []; }
      if (preparedEvidence.schema.properties.matches) { output.evidenceLinks ??= []; output.referenceAnswers ??= []; }
    return { output: preparedEvidence.resolve(output) };
    },
  });
  assert.deepEqual(phases, ['analysis', 'analysis-context', 'analysis-merge']);
  assert.equal(result.output.requirements.length, 1); assert.match(result.output.requirements[0].description, /17영업일/);
  assert.ok(result.output.requirements[0].citations.some(citation => citation.sourceId === definition.id));
  assert.equal(result.output.coverage.find(entry => entry.sourceId === definition.id).disposition, 'merged');
  assert.equal(validateAnalysisProposal(result.output, snapshot).coverage.length, 2);
});

test('a later definitions-only block refines an existing requirement without publishing a fake feature or temporary ID', async () => {
  const backlog = createEmptyBacklogPack(context); backlog.project = { code: 'SYNTHETIC', name: '합성 후속 정의 연결', institution: '', baselineProfile: '' };
  const old = { ...structuredClone(source), id: 'OLD', clauses: [{ ...source.clauses[0], id: 'REF', text: '담당자는 정기 신청을 기관 달력에 정한 기간 안에 처리한다.' }] }, current = { ...structuredClone(source), id: 'DEFINITION', clauses: [{ ...source.clauses[0], text: '기관 달력에서 정기 신청 처리기간은 접수 완료일부터 17영업일이다. 비상 신청은 5영업일이다.' }] };
  backlog.sources = [old, current];
  const cite = src => ({ sourceId: src.id, clauseId: src.clauses[0].id, quote: src.clauses[0].text });
  const requirement = { id: 'EXISTING', title: '정기 신청 처리', description: old.clauses[0].text, requirementType: 'functional', solutionDisposition: 'gap-dev', moduleCandidates: [], rationale: '원문 참조', nfrCriteria: null, citations: [cite(old)] };
  const previous = { requirements: [requirement], issues: [], coverage: [{ sourceId: old.id, clauseId: 'REF', disposition: 'included', requirementIds: ['EXISTING'], rationale: '기존 정기 신청 처리' }] }, snapshot = { backlog, metadata: { context, imports: [], ai: { decisions: [] } } };
  const request = buildAiRequest(snapshot, 'analysis', [], { sources: [current], previousAnalysis: previous, batch: { index: 2, total: 2, idPrefix: 'B-DEFINITIONS-' }, evidenceReferences: true }), parts = new Map();
  const result = await pipeline.reconcileAnalysisBatch({ snapshot, sources: [current], previous, request, writePart(value) { const ref = { id: randomUUID(), kind: 'ai', sha256: digest(value), bytes: Buffer.byteLength(JSON.stringify(value)) }; parts.set(ref.id, structuredClone(value)); return ref; }, readPart: ref => structuredClone(parts.get(ref.id)), run: async ({ request, preparedEvidence }) => {
    let output;
    if (request.phase === 'analysis') output = { requirements: [], issues: [], coverage: [{ sourceId: current.id, clauseId: current.clauses[0].id, disposition: 'excluded', requirementIds: [], rationale: '정의 자료이며 독립적인 새 기능은 아님' }] };
    else if (request.phase === 'analysis-context') {
      const unit = request.data.requirements.find(item => item.contextOnly); assert.ok(unit);
      output = { inspectedPageIds: request.data.contextPages.map(page => page.pageId), matches: [{ candidateId: unit.id, requirementId: 'EXISTING', relation: 'same', rationale: '기존 기관 달력 참조를 정기 17영업일로 구체화한다.', citations: [cite(current)] }], issues: [] };
    } else {
      assert.equal(request.data.mergeTargets[0].existing.id, 'EXISTING');
      output = { revisions: [{ ...requirement, description: '담당자는 정기 신청을 접수 완료일부터 17영업일 이내 처리한다. 비상 5영업일 규칙을 정기 신청에 적용하지 않는다.', citations: [cite(current)] }], issues: [] };
    }
    if (preparedEvidence.schema.properties.matches) { output.evidenceLinks ??= []; output.referenceAnswers ??= []; }
    return { output: preparedEvidence.resolve(output) };
  } });
  assert.deepEqual(result.output.requirements.map(req => req.id), ['EXISTING']);
  assert.match(result.output.requirements[0].description, /17영업일/);
  assert.equal(result.output.coverage.find(entry => entry.sourceId === current.id).disposition, 'merged');
  assert.equal(validateAnalysisProposal(result.output, snapshot).coverage.length, 2);
});

for (const relation of ['related', 'conflict']) test(`${relation} and blocking issue proof never become supporting requirement evidence`, async () => {
  const app = fixture({ many: false }), original = structuredClone(app.previous), run = app.options.run;
  app.options.run = async args => {
    const response = await run(args);
    if (args.request.phase === 'analysis-context') {
      for (const match of response.output.matches) { match.relation = relation; match.citations = [{ sourceId: source.id, clauseId: app.old.at(-1).id, quote: app.old.at(-1).text }]; }
      response.output.issues.push({ id: 'REAL-QUESTION', kind: 'decision', severity: 'blocking', question: '상충하는 적용 범위를 결정해 주세요.', options: [], requirementIds: [args.request.data.requirements[0].id], citations: [{ sourceId: source.id, clauseId: app.old[0].id, quote: app.old[0].text }] });
    }
    return response;
  };
  const result = await pipeline.reconcileAnalysisBatch(app.options), added = result.output.requirements.find(req => !original.requirements.some(old => old.id === req.id));
  assert.deepEqual(app.previous, original); assert.deepEqual(added.citations.map(cite => cite.clauseId), ['CURRENT']);
  assert.ok(!app.calls.some(call => call.phase === 'analysis-merge'));
  assert.ok(result.output.issues.some(issue => issue.question === '상충하는 적용 범위를 결정해 주세요.'));
  if (relation === 'conflict') assert.ok(result.output.issues.some(issue => issue.kind === 'conflict' && issue.citations.some(cite => cite.clauseId === 'CURRENT') && issue.citations.some(cite => cite.clauseId !== 'CURRENT')));
});

for (const outcome of ['missing', 'resolved', 'conflict', 'partial']) test(`a provisional external reference is ${outcome} only after every historical comparison`, async () => {
  const app = fixture({ many: outcome === 'conflict' }), run = app.options.run, questionId = 'PENDING-REFERENCE'; let question, adjudications = 0;
  if (outcome === 'conflict') app.related();
  const oldQuestion = { id: 'HUMAN-Q', kind: 'decision', severity: 'blocking', question: '기관이 승인할 담당 역할은 무엇인가?', options: [], requirementIds: ['REQ-LATE'], citations: [app.previous.requirements[1].citations[0]] };
  app.previous.issues.push(oldQuestion);
  app.options.request.data.previousAnalysis.issues = structuredClone(app.previous.issues);
  app.options.run = async args => {
    if (args.request.data.question) {
      adjudications++; assert.ok(app.calls.filter(call => call.phase === 'analysis-context').length > 0);
      const status = outcome === 'partial' ? 'unresolved' : outcome === 'conflict' && adjudications > 1 ? 'resolved' : outcome;
      return { output: { status, remainingQuestion: status === 'resolved' ? null : outcome === 'partial' ? '72시간을 넘긴 신청의 후속 조치는 무엇인가?' : question.question, remainingOptions: [], answer: '원문은 기존 담당 접수의 72시간 조건을 명시한다. 다른 범위의 정책 승인에는 답하지 않는다.', citations: args.request.data.answers.flatMap(answer => answer.citations) } };
    }
    const response = await run(args);
    if (args.request.phase === 'analysis') {
      question = { id: questionId, kind: 'missing', severity: 'blocking', question: '참조된 기존 처리시간은 얼마인가?', options: [], requirementIds: [response.output.requirements[0].id], citations: response.output.requirements[0].citations };
      response.output.issues.push(question);
    } else if (args.request.phase === 'analysis-context' && outcome !== 'missing') {
      const src = args.request.data.historicalSources[0], clause = src?.clauses[0];
      if (clause) response.output.referenceAnswers.push({ issueId: questionId, answer: outcome === 'conflict' ? '기관 원문의 적용 대상과 예외 조건을 하나도 빼지 않고 비교하여야 한다. '.repeat(100) : '기존 담당 접수 처리시간은 72시간이다.', citations: [{ sourceId: src.id, clauseId: clause.id, quote: clause.text }] });
    }
    return response;
  };
  const result = await pipeline.reconcileAnalysisBatch(app.options);
  assert.deepEqual(result.output.issues.find(issue => issue.id === 'HUMAN-Q'), oldQuestion);
  assert.equal(result.output.issues.some(issue => issue.question === question.question), !['resolved', 'partial'].includes(outcome));
  if (outcome === 'partial') {
    const remaining = result.output.issues.find(issue => issue.question === '72시간을 넘긴 신청의 후속 조치는 무엇인가?');
    assert.equal(remaining.severity, 'blocking'); assert.ok(remaining.citations.some(cite => cite.clauseId !== 'CURRENT'));
    assert.equal(result.output.referenceResolutions[0].issue.question, question.question);
  }
  assert.equal(result.output.referenceResolutions.length, outcome === 'missing' ? 0 : 1);
  if (outcome === 'conflict') assert.equal(result.output.referenceResolutions[0].status, 'partial');
  if (outcome === 'conflict') assert.deepEqual(result.output.requirements.find(req => !app.previous.requirements.some(old => old.id === req.id)).citations.map(cite => cite.clauseId), ['CURRENT'], 'conflicting reference answers belong to the unresolved question, never requirement support');
  if (outcome === 'conflict') assert.ok(adjudications > 1, 'a later resolved page cannot erase an earlier conflict');
  else assert.equal(adjudications, outcome === 'missing' ? 0 : 1);
  if (outcome === 'resolved') assert.equal(result.output.referenceResolutions[0].issue.question, question.question);
});

test('a corrupt pending candidate is discarded without reusing any poisoned piece or changing the canonical prefix', async () => {
  const app = fixture({ many: false }), controller = new AbortController();
  await assert.rejects(pipeline.reconcileAnalysisBatch({ ...app.options, signal: controller.signal, onCheckpoint(state) { app.checkpoints.push(state); controller.abort(); } }), { code: 'AI_CANCELLED' });
  const state = app.checkpoints.at(-1), old = structuredClone(app.previous), resets = [];
  app.records.set(state.candidateRef.id, {}); app.calls.length = 0;
  const result = await pipeline.reconcileAnalysisBatch({ ...app.options, resume: state, onReset: reason => resets.push(reason) });
  assert.deepEqual(resets, ['pending-invalid']); assert.deepEqual(app.previous, old);
  assert.equal(app.calls[0].phase, 'analysis'); assert.equal(result.output.requirements.length, 2);
});

test('published narratives replace full and abbreviated temporary requirement and question IDs', async () => {
  const app = fixture({ many: false }), run = app.options.run;
  app.options.run = async args => {
    const response = await run(args);
    if (args.request.phase === 'analysis') {
      const req = response.output.requirements[0], questionId = `${args.request.data.analysisBatch.idPrefix}Q1`, shortId = req.id.slice('B-SYNTHETIC-24-'.length);
      req.description += ` ${req.id} · ${shortId} · ${questionId}`;
      response.output.coverage[0].rationale += ` ${shortId}`;
      response.output.issues.push({ id: questionId, kind: 'decision', severity: 'blocking', question: `${req.id}의 범위를 ${questionId}에서 결정해 주세요.`, options: [], requirementIds: [req.id], citations: req.citations });
    }
    return response;
  };
  const result = await pipeline.reconcileAnalysisBatch(app.options), issue = result.output.issues[0];
  assert.ok(result.output.requirements.some(req => req.description.includes(issue.id)));
  assert.ok(result.output.requirements.every(req => !req.description.includes('TMP-')));
  assert.ok(result.output.coverage.every(row => !row.rationale.includes('TMP-')));
  assert.ok(!issue.question.includes('TMP-')); assert.ok(issue.question.includes('REQ-LATE'));
});
