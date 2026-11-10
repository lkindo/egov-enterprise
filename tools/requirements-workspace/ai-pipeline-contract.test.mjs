import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeIssues, validateBusinessModel, validateRequirementReview, validatePlanReview } from './ai-pipeline-contract.mjs';
import { planningGroups, prepareBusinessModel, planAndReview, reviewRequirements } from './ai-pipeline.mjs';
import { prepareEvidenceRequest } from './ai-evidence.mjs';
import { CONTEXT_WINDOW_BYTES } from './ai-analysis-batches.mjs';
import { validateEvidenceCitations, validateAnalysisProposal, projectAnalysisBacklog } from './ai-contract.mjs';
import { context, source, analysis, decomposition } from './test-fixtures/ai.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
const snapshot = () => ({ backlog: { sources: [structuredClone(source)], businessRequirements: [] }, metadata: { context } });
const model = () => ({ summary: '접수 조회 업무의 책임과 열람 범위를 정리한다.', actors: [{ name: '담당자', responsibility: '접수 목록 조회', sourceIds: ['SRC-1'] }], processes: [{ name: '접수 조회', trigger: '담당자의 조회 요청', steps: ['조회 조건 입력', '허용 범위의 결과 확인'], exceptions: ['열람 범위 미결정'], rules: [], data: ['접수 목록'], sourceIds: ['SRC-1'] }], terms: [], issues: [], sourceCoverage: [{ sourceId: 'SRC-1', role: 'business', rationale: '조회 업무와 담당 범위의 근거' }] });

test('shared semantic questions are visited losslessly through bounded quality and planning windows', async () => {
  const state = { backlog: createEmptyBacklogPack(context), metadata: { context, ai: { decisions: [] } } };
  state.backlog.project = { code: 'SYNTHETIC', name: '공통 문맥 분할', institution: '', baselineProfile: '' }; state.backlog.sources = [structuredClone(source)];
  const proposal = analysis({ data: { sources: state.backlog.sources, decisions: [] } }, { question: false });
  proposal.issues = Array.from({ length: 450 }, (_, index) => ({ id: `SEMANTIC-${index}`, kind: 'risk', severity: 'observation', question: `${index}: ${'원문의 조건과 예외를 의미 그대로 유지한다. '.repeat(65)}`, options: [], requirementIds: [proposal.requirements[0].id], citations: structuredClone(proposal.requirements[0].citations) }));
  const seen = new Map(); let calls = 0;
  const run = async ({ request, schema }) => {
    calls++; const prepared = prepareEvidenceRequest(request, schema);
    assert.ok(Buffer.byteLength(JSON.stringify(prepared.request)) + Buffer.byteLength(JSON.stringify(prepared.schema)) <= CONTEXT_WINDOW_BYTES);
    if (!seen.has(request.phase)) seen.set(request.phase, new Set());
    for (const issue of [...(request.data.existingIssues ?? []), ...(request.data.analysisIssues ?? [])]) { seen.get(request.phase).add(issue.id); assert.equal(issue.question, proposal.issues.find(old => old.id === issue.id).question); }
    if (request.phase === 'review-requirements') return { output: { revisions: [], issues: [] } };
    if (request.phase === 'review-plan') return { output: { workItemUpdates: [], acceptanceUpdates: [], traceUpdates: [], issues: [] } };
    const plan = decomposition(), prefix = request.data.planningBatch.idPrefix, rename = id => `${prefix}${id}`;
    for (const work of plan.workItems) { work.id = rename(work.id); if (work.parentEpicId) work.parentEpicId = rename(work.parentEpicId); }
    for (const ac of plan.acceptanceCriteria) { ac.id = rename(ac.id); ac.workItemId = rename(ac.workItemId); }
    for (const trace of plan.traceLinks) { trace.id = rename(trace.id); trace.workItemId = rename(trace.workItemId); trace.acId = rename(trace.acId); }
    assert.deepEqual(request.data.planningBatch.requirementIds, [proposal.requirements[0].id]);
    return { output: plan };
  };
  const reviewed = await reviewRequirements(proposal, model(), state, { run, evidenceReferences: true });
  assert.deepEqual(reviewed.issues, proposal.issues);
  const result = await planAndReview(reviewed, model(), state, [], { run, evidenceReferences: true });
  for (const stage of ['review-requirements', 'decomposition', 'review-plan']) assert.equal(seen.get(stage).size, 450, stage);
  assert.ok(calls >= 6); assert.equal(result.planningOutput.workItems.length, 2);
});

test('quality review pages a large single requirement without omitting original clauses or old proof and binds resume to its exact tasks', async () => {
  const state = { backlog: createEmptyBacklogPack(context), metadata: { context, ai: { decisions: [] } } };
  state.backlog.project = { code: 'SYNTHETIC', name: '합성 근거 검토', institution: '합성 기관', baselineProfile: '' };
  state.backlog.sources = [{ ...structuredClone(source), clauses: Array.from({ length: 96 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}`, text: `${index}번 조건: ${'담당자만 열람하고 야간 오프라인 예외를 유지한다. '.repeat(110)}` })) }];
  const proposal = analysis({ data: { sources: state.backlog.sources, decisions: [] } }, { question: false });
  proposal.requirements[0].citations = state.backlog.sources[0].clauses.flatMap(clause => [clause.text.slice(0, 1800), clause.text.slice(100, 1900)].map(quote => ({ sourceId: source.id, clauseId: clause.id, quote })));
  proposal.requirements[0].solutionDisposition = 'undecided';
  proposal.issues = [{ id: 'FULL-PROOF', kind: 'risk', severity: 'observation', question: '전체 근거를 유지한 검토 기록', options: [], requirementIds: [proposal.requirements[0].id], citations: structuredClone(proposal.requirements[0].citations) }];
  const seen = new Set(), replies = [], taskIds = []; let pause = true;
  const markers = new Set();
  const run = async ({ request, schema }) => {
    const prepared = prepareEvidenceRequest(request, schema);
    assert.ok(Buffer.byteLength(JSON.stringify(prepared.request)) + Buffer.byteLength(JSON.stringify(prepared.schema)) <= CONTEXT_WINDOW_BYTES);
    if (pause && replies.length === 1) throw Object.assign(Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' });
    for (const item of request.data.sources) for (const clause of item.clauses) { seen.add(clause.id); assert.equal(clause.text, state.backlog.sources[0].clauses.find(old => old.id === clause.id).text); }
    assert.ok(request.data.requirements[0].description.includes('접수'));
    const first = request.data.sources[0].clauses[0], marker = `검토창 ${first.id}`; markers.add(marker);
    const allowed = new Set(request.data.sources.flatMap(src => src.clauses.map(clause => `${src.id}/${clause.id}`)));
    for (const issue of [...request.data.existingIssues, ...request.data.validationIssues, ...request.data.businessModel.issues]) assert.ok(issue.citations.every(cite => allowed.has(`${cite.sourceId}/${cite.clauseId}`)), 'other-window proof must neither inflate nor authorize this call');
    await new Promise(resolve => setTimeout(resolve, 5));
    return { output: { issues: [], revisions: [{ ...request.data.requirements[0], description: `${request.data.requirements[0].description} ${marker}`, citations: [{ sourceId: source.id, clauseId: first.id, quote: first.text.slice(0, 1800) }] }] } };
  };
  const options = { run, concurrency: 2, evidenceReferences: true, onReply(index, reply, _merged, taskId) { assert.equal(index, replies.length); replies.push(reply); taskIds.push(taskId); } };
  await assert.rejects(reviewRequirements(proposal, model(), state, options), { code: 'AI_TIMEOUT' });
  assert.equal(replies.length, 1); const firstSeen = new Set(seen); seen.clear(); pause = false;
  const result = await reviewRequirements(proposal, model(), state, { ...options, resumeReplies: [...replies], resumeTaskIds: [...taskIds] });
  assert.ok([...firstSeen].every(id => !seen.has(id)), 'verified source windows are not paid for twice');
  assert.equal(new Set([...firstSeen, ...seen]).size, 96);
  assert.deepEqual(result.requirements[0].citations, proposal.requirements[0].citations);
  assert.deepEqual(result.issues[0].citations, proposal.issues[0].citations);
  for (const marker of markers) assert.ok(result.requirements[0].description.includes(marker), 'later windows preserve earlier semantic revisions');
  assert.equal(result.coverage.length, 96);
  let reset = false; const regenerated = [];
  const recovered = await reviewRequirements(proposal, model(), state, { run, evidenceReferences: true, resumeReplies: replies.slice(0, 1), resumeTaskIds: ['0'.repeat(64)], onReset() { reset = true; }, onReply(index) { regenerated.push(index); } });
  assert.ok(reset); assert.equal(regenerated[0], 0); assert.deepEqual(recovered.requirements[0].citations, proposal.requirements[0].citations);
});

test('requirement review adds a thirty-first source without discarding prior verified quotations', () => {
  const state = snapshot(); state.backlog.sources[0].clauses = Array.from({ length: 31 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index}` }));
  const request = { data: { sources: state.backlog.sources, decisions: [] } }, previous = analysis(request, { question: false });
  previous.requirements[0].citations = previous.requirements[0].citations.slice(0, 30);
  const revision = { ...structuredClone(previous.requirements[0]), citations: [{ sourceId: source.id, clauseId: 'C-30', quote: source.clauses[0].text }] };
  const result = validateRequirementReview({ revisions: [revision], issues: [] }, previous, state);
  assert.equal(result.requirements[0].citations.length, 31);
  assert.deepEqual(result.requirements[0].citations.slice(0, 30), previous.requirements[0].citations);
});

test('project issue merging preserves distinct options, kinds and requirement scope even when wording and citations match', () => {
  const first = { id: 'Q', kind: 'decision', severity: 'observation', question: '적용 범위를 확인해 주세요.', options: ['본인 담당 건'], requirementIds: ['REQ-1'], citations: [{ sourceId: 'SRC-1', clauseId: 'C-1', quote: source.clauses[0].text }] };
  const differentOptions = { ...structuredClone(first), options: ['부서 전체 건'] };
  const differentScope = { ...structuredClone(first), requirementIds: ['REQ-2'] };
  const differentKind = { ...structuredClone(first), kind: 'conflict' };
  const merged = mergeIssues([first], [differentOptions, differentScope, differentKind]);
  assert.equal(merged.length, 4); assert.equal(new Set(merged.map(issue => issue.id)).size, 4);
  assert.deepEqual(merged[0], first);
  const repeated = mergeIssues(merged, [{ ...structuredClone(first), id: 'OTHER-ID', severity: 'blocking' }]);
  assert.equal(repeated.length, 4); assert.equal(repeated[0].severity, 'blocking');
});

test('every planning request retains the full executable scope of an existing shared epic', async () => {
  const state = { backlog: createEmptyBacklogPack(context), metadata: { context } };
  state.backlog.project = { code: 'SYNTHETIC', name: '공유 에픽 업무', institution: '', baselineProfile: '' };
  state.backlog.sources = [structuredClone(source)];
  const output = analysis({ data: { sources: state.backlog.sources, decisions: [] } }, { question: false });
  output.requirements = Array.from({ length: 5 }, (_, index) => ({ ...structuredClone(output.requirements[0]), id: `REQ-${index + 1}` }));
  output.requirements[4].requirementType = 'constraint';
  output.requirements[4].nfrCriteria = { metric: '타인 접수의 노출', threshold: '거부', verificationMethod: 'integration-test' };
  output.issues = [{ id: 'RELATED', kind: 'risk', severity: 'observation', question: 'REQ-1 내보내기는 REQ-5의 노출 금지 조건을 함께 따른다.', options: [], requirementIds: ['REQ-1', 'REQ-5'], citations: structuredClone(output.requirements[0].citations) }];
  output.coverage[0].requirementIds = output.requirements.map(req => req.id);
  state.backlog = projectAnalysisBacklog(state, validateAnalysisProposal(output, state));
  const original = decomposition(), ids = output.requirements.map(req => req.id);
  state.backlog.workItems = [{ ...original.workItems[0], requirementIds: ids }, ...ids.map((id, index) => ({ ...original.workItems[1], id: `STORY-${index}`, requirementIds: [id] }))];
  state.backlog.acceptanceCriteria = ids.flatMap((id, index) => original.acceptanceCriteria.map(ac => ({ ...ac, id: `${ac.id}-${index}`, workItemId: `STORY-${index}`, requirementIds: [id] })));
  state.backlog.traceLinks = ids.map((id, index) => ({ ...original.traceLinks[0], id: `TRACE-${index}`, requirementId: id, workItemId: `STORY-${index}`, acId: `AC-ALLOW-${index}` }));
  const before = structuredClone(state.backlog); let calls = 0;
  const result = await planAndReview(output, model(), state, [], { run: async ({ request }) => {
    assert.ok(request.data.analysisIssues.some(issue => issue.id === 'RELATED'));
    const scope = new Set(request.data.planningBatch?.requirementIds ?? request.data.requirements.map(req => req.id));
    if (!scope.has('REQ-5')) assert.ok(request.data.crossRequirementContext.some(req => req.id === 'REQ-5' && req.description === output.requirements[4].description));
    if (request.phase === 'review-plan') return { output: { issues: [], workItemUpdates: [], acceptanceUpdates: [], traceUpdates: [] } };
    calls++;
    assert.deepEqual(request.data.previousWorkItems.find(item => item.id === 'EPIC-1').requirementIds, ids);
    assert.equal(request.data.previousPlanIndex.find(item => item.id === 'STORY-0').priority, 'MUST');
    assert.equal(request.data.previousPlanIndex.find(item => item.id === 'STORY-0').batch, 1);
    const current = new Set(request.data.planningBatch.requirementIds);
    return { output: { workItems: [{ ...original.workItems[0], requirementIds: [...current] }, ...before.workItems.filter(item => item.workItemType !== 'epic' && item.requirementIds.some(id => current.has(id)))], acceptanceCriteria: before.acceptanceCriteria.filter(item => item.requirementIds.some(id => current.has(id))), traceLinks: before.traceLinks.filter(item => current.has(item.requirementId)), issues: [] } };
  } });
  assert.equal(calls, 2); assert.deepEqual(result.planningOutput.workItems.find(item => item.id === 'EPIC-1').requirementIds, ids);
  assert.deepEqual(state.backlog, before);
});

test('synthesis receives only quotable representative anchors while retaining every original clause', async () => {
  const state = snapshot();
  state.backlog.sources[0].clauses = Array.from({ length: 40 }, (_, index) => ({ ...source.clauses[0], id: `C-${index}`, text: index % 4 === 0 ? '─'.repeat(300) : index % 4 === 1 ? ' '.repeat(200) + source.clauses[0].text : index % 4 === 2 ? 'A' + ' '.repeat(200) + 'B' + ' '.repeat(200) + 'C'.repeat(20) : source.clauses[0].text }));
  state.backlog.sources[0].clauses[39].text = '𠮷'.repeat(250);
  state.backlog.sources[0].clauses[38].text = 'A' + '─'.repeat(300);
  state.backlog.sources[0].clauses[37].text = ('A' + ' '.repeat(300)).repeat(13);
  const before = structuredClone(state.backlog.sources); let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: () => ({ summary: '담당자의 접수 열람 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async ({ request }) => {
    calls++; const doc = request.data.documents[0];
    assert.equal(doc.clauseCount, 40); assert.equal(doc.anchors.length, 29);
    for (const anchor of doc.anchors) { validateEvidenceCitations([{ citations: [anchor] }], state); assert.ok(Array.from(anchor.quote).length <= 180); assert.match(anchor.quote, /^[\p{L}\p{N}]/u); }
    return { output: model() };
  } });
  assert.equal(calls, 1); assert.deepEqual(state.backlog.sources, before); assert.equal(result.documents[0].clauseCount, 40);
});

for (const fault of ['source-reference', 'schema']) test(`synthesis retries an invalid ${fault} once with value-free violations and original evidence`, async () => {
  const state = snapshot(), requests = [], validated = [];
  const result = await prepareBusinessModel(state, { sourceReading: () => ({ summary: '담당자의 접수 열람 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async ({ request }) => {
    requests.push(structuredClone(request)); const output = model(); if (requests.length === 1) { if (fault === 'source-reference') output.actors[0].sourceIds = ['UNKNOWN-UNTRUSTED-DRAFT']; else output.unknownField = 'UNKNOWN-UNTRUSTED-DRAFT'; }
    return { output };
  }, onValidated: (stage, value) => { if (stage === 'synthesis') validated.push(value); } });
  assert.equal(requests.length, 2); assert.equal(validated.length, 1); assert.deepEqual(result.businessModel, model());
  assert.deepEqual(requests[1].data.documents, requests[0].data.documents);
  assert.deepEqual(requests[1].data.correction, { violations: [{ kind: fault === 'source-reference' ? 'business-model-source' : 'schema', path: '$' }], budget: { reason: 'target', limitBytes: requests[1].data.discoveryBudget.targetMergedBytesForBatch, hardLimitBytes: requests[1].data.discoveryBudget.maxMergedBytesForBatch } });
  assert.equal(JSON.stringify(requests[1]).includes('UNKNOWN-UNTRUSTED-DRAFT'), false);
});

test('synthesis validates its own inputs before a model call and respects cancellation and genuine model capacity', async () => {
  const reading = { summary: '담당자의 접수 열람 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] };
  let calls = 0;
  await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: () => ({ ...reading, summary: '' }), run: async () => { calls++; return { output: model() }; } }), { code: 'AI_DOCUMENT_INPUT_INVALID' });
  assert.equal(calls, 0);
  const controller = new AbortController();
  await assert.rejects(prepareBusinessModel(snapshot(), { signal: controller.signal, sourceReading: () => reading, run: async () => { calls++; controller.abort(); return { output: { ...model(), sourceCoverage: [] } }; } }), { code: 'AI_CANCELLED' });
  assert.equal(calls, 1); calls = 0;
  const large = { ...model(), summary: 'x'.repeat(8000), actors: Array.from({ length: 80 }, (_, index) => ({ name: `actor-${index}`, responsibility: 'x'.repeat(2000), sourceIds: ['SRC-1'] })) };
  await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: () => reading, run: async () => { calls++; return { output: large }; } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 1);
});

test('synthesis never retries timeout or capacity errors and rejects a second invalid response', async () => {
  for (const code of ['AI_TIMEOUT', 'AI_BUSINESS_MODEL_CAPACITY', 'AI_OUTPUT_INVALID']) {
    let calls = 0;
    await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: () => ({ summary: '담당자의 접수 열람 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async () => { calls++; if (code !== 'AI_OUTPUT_INVALID') throw Object.assign(new Error(code), { code }); const output = model(); output.actors[0].sourceIds = ['UNKNOWN']; return { output }; } }), { code });
    assert.equal(calls, code === 'AI_OUTPUT_INVALID' ? 2 : 1);
  }
});

test('synthesis notices cancellation after valid and second invalid model responses', async () => {
  for (const stopAt of [1, 2]) {
    const controller = new AbortController(); let calls = 0, callbacks = 0;
    await assert.rejects(prepareBusinessModel(snapshot(), { signal: controller.signal, sourceReading: () => ({ summary: '담당자의 접수 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async () => { calls++; const output = model(); if (stopAt === 2) output.sourceCoverage = []; if (calls === stopAt) controller.abort(); return { output }; }, onValidated: stage => { if (stage === 'synthesis') callbacks++; } }), { code: 'AI_CANCELLED' });
    assert.equal(calls, stopAt); assert.equal(callbacks, 0);
  }
});

test('schema-valid synthesis output over one MiB is a capacity failure without regeneration', async () => {
  let calls = 0;
  const output = { ...model(), terms: Array.from({ length: 200 }, (_, index) => ({ term: `term-${index}`, meaning: '가'.repeat(2000), sourceIds: ['SRC-1'] })) };
  assert.ok(Buffer.byteLength(JSON.stringify(output)) > 1024 ** 2);
  await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: () => ({ summary: '담당자의 접수 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async () => { calls++; return { output }; } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 1);
});

test('unquotable uncertain readings fail before synthesis and only a complete discovery emits validated synthesis', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses[0].text = '─'.repeat(300); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: () => ({ summary: '판독 한계 확인', blocks: [{ heading: '표', certainty: 'uncertain', inputId: 'U-1', note: '표 내용 확인 필요' }], unreadable: [] }), run: async () => { calls++; return { output: model() }; } }), { code: 'AI_DOCUMENT_UNREADABLE' });
  assert.equal(calls, 0);
  for (const failLast of [true, false]) {
    const state = snapshot(); state.backlog.sources = Array.from({ length: 5 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` })); let calls = 0, callbacks = 0;
    const pending = prepareBusinessModel(state, { sourceReading: () => ({ summary: '담당자의 접수 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async ({ request }) => { if (++calls === 2 && failLast) throw Object.assign(new Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' }); return { output: { ...model(), actors: [], processes: [], sourceCoverage: request.data.documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: '접수 업무' })) } }; }, onValidated: stage => { if (stage === 'synthesis') callbacks++; } });
    if (failLast) await assert.rejects(pending, { code: 'AI_TIMEOUT' }); else await pending;
    assert.equal(callbacks, failLast ? 0 : 1);
  }
});

test('synthesis merge overflow regenerates once and a second-batch correction retains the prior validated model', async () => {
  for (const fault of ['merged-text', 'merged-actors', 'correctable-source']) {
    const state = snapshot(); state.backlog.sources = Array.from({ length: fault === 'merged-text' ? 33 : 5 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
    let calls = 0, prior;
    const pending = prepareBusinessModel(state, { sourceReading: () => ({ summary: '담당자의 접수 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async ({ request }) => {
      calls++; const ids = request.data.documents.map(doc => doc.sourceId);
      if (fault === 'correctable-source' && calls === 3) assert.deepEqual(request.data.previousModel, prior);
      if (fault === 'merged-actors' && calls === 3) assert.equal(request.data.correction.budget.reason, 'merged-schema');
      const output = { ...model(), processes: [], actors: fault === 'merged-actors' ? Array.from({ length: calls === 1 ? 80 : 1 }, (_, index) => ({ name: `actor-${calls}-${index}`, responsibility: '접수 조회', sourceIds: ids })) : [{ name: '담당자', responsibility: fault === 'merged-text' ? String.fromCharCode(96 + calls).repeat(240) : '접수 조회', sourceIds: ids }], sourceCoverage: ids.map(sourceId => ({ sourceId, role: 'business', rationale: '접수 업무' })) };
      if (calls === 1) prior = structuredClone(output);
      if (fault === 'correctable-source' && calls === 2) output.actors[0].sourceIds = ['UNKNOWN'];
      return { output };
    } });
    if (fault === 'correctable-source') { const result = await pending; assert.equal(calls, 3); assert.deepEqual(result.businessModel.actors[0].sourceIds, state.backlog.sources.map(source => source.id)); }
    else { await assert.rejects(pending, { code: 'AI_BUSINESS_MODEL_CAPACITY' }); assert.equal(calls, fault === 'merged-text' ? 10 : 3); }
  }
});

test('integrated business model retains document provenance and rejects invented source or quotation references', () => {
  const state = snapshot(); assert.equal(validateBusinessModel(model(), state).actors[0].name, '담당자');
  const forged = model(); forged.actors[0].sourceIds = ['UNKNOWN']; assert.throws(() => validateBusinessModel(forged, state), { code: 'AI_OUTPUT_INVALID' });
  const issue = { id: 'Q-1', kind: 'conflict', severity: 'blocking', question: '열람 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [{ sourceId: 'SRC-1', clauseId: 'C-1', quote: '원문에 존재하지 않는 전사 오류를 숨긴다.' }] };
  assert.throws(() => validateBusinessModel({ ...model(), issues: [issue] }, state), { code: 'AI_OUTPUT_INVALID' });
});

test('requirement review can clarify a draft but cannot invent requirements, change scope or remove prior questions', () => {
  const state = snapshot(), proposal = analysis({ data: { sources: state.backlog.sources, decisions: [] } });
  const originalQuestion = proposal.issues[0];
  const revised = { ...proposal.requirements[0], description: '담당자는 접수 목록을 조회하며 열람 범위가 결정되지 않은 부분은 확인 질문으로 남긴다.' };
  const next = validateRequirementReview({ issues: [], revisions: [revised] }, proposal, state);
  assert.equal(next.requirements[0].description, revised.description);
  assert.ok(next.issues.some(issue => issue.id === originalQuestion.id));
  assert.throws(() => validateRequirementReview({ issues: [], revisions: [{ ...revised, id: 'UNSEEN' }] }, proposal, state), { code: 'AI_OUTPUT_INVALID' });
  assert.throws(() => validateRequirementReview({ issues: [], revisions: [{ ...revised, scope: 'excluded' }] }, proposal, state), { code: 'AI_OUTPUT_INVALID' });
});

test('plan quality updates preserve omitted existing plan entries and reject unrelated executable requirement references', () => {
  const state = snapshot(); state.backlog.businessRequirements = [{ id: 'REQ-1', scopeDisposition: 'included' }];
  const plan = decomposition();
  const updated = { ...plan.workItems[1], title: '본인 접수 목록을 조회하고 빈 결과를 확인한다.' };
  const value = validatePlanReview({ issues: [], workItemUpdates: [updated], acceptanceUpdates: [], traceUpdates: [] }, plan, state);
  assert.equal(value.workItems.length, 2); assert.equal(value.acceptanceCriteria.length, 2);
  assert.equal(value.workItems[1].title, updated.title);
  assert.throws(() => validatePlanReview({ issues: [], workItemUpdates: [{ ...updated, requirementIds: ['UNKNOWN'] }], acceptanceUpdates: [], traceUpdates: [] }, plan, state), { code: 'AI_OUTPUT_INVALID' });
  assert.throws(() => validatePlanReview({ issues: [], workItemUpdates: [{ ...updated, id: 'UNSEEN' }], acceptanceUpdates: [], traceUpdates: [] }, plan, state), { code: 'AI_OUTPUT_INVALID' });
  const shared = structuredClone(plan); shared.workItems[0].requirementIds.push('REQ-2'); state.backlog.businessRequirements.push({ id: 'REQ-2', scopeDisposition: 'included' });
  const reviewed = validatePlanReview({ issues: [], workItemUpdates: [plan.workItems[0]], acceptanceUpdates: [], traceUpdates: [] }, shared, state);
  assert.deepEqual(reviewed.workItems[0].requirementIds, ['REQ-1', 'REQ-2']);
});

test('an existing child spanning planning boundaries stays in one connected batch', () => {
  const requirements = Array.from({ length: 6 }, (_, index) => ({ id: `REQ-${index + 1}` }));
  const batches = planningGroups(requirements, [{ workItemType: 'story', requirementIds: ['REQ-1', 'REQ-5'] }]);
  assert.ok(batches.some(batch => batch.some(req => req.id === 'REQ-1') && batch.some(req => req.id === 'REQ-5')));
  assert.equal(batches.flat().length, 6);
});

test('shared acceptance evidence also keeps its complete requirement scope in one planning group', () => {
  const requirements = Array.from({ length: 6 }, (_, index) => ({ id: `REQ-${index + 1}` }));
  const batches = planningGroups(requirements, [], [{ id: 'HUMAN-AC', workItemId: 'SHARED-EPIC', requirementIds: ['REQ-1', 'REQ-6'] }]);
  assert.ok(batches.some(batch => batch.some(req => req.id === 'REQ-1') && batch.some(req => req.id === 'REQ-6')));
  assert.equal(batches.flat().length, 6);
});
