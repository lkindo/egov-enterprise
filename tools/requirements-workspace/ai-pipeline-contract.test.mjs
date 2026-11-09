import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBusinessModel, validateRequirementReview, validatePlanReview } from './ai-pipeline-contract.mjs';
import { planningGroups, prepareBusinessModel } from './ai-pipeline.mjs';
import { validateEvidenceCitations } from './ai-contract.mjs';
import { context, source, analysis, decomposition } from './test-fixtures/ai.mjs';
const snapshot = () => ({ backlog: { sources: [structuredClone(source)], businessRequirements: [] }, metadata: { context } });
const model = () => ({ summary: '접수 조회 업무의 책임과 열람 범위를 정리한다.', actors: [{ name: '담당자', responsibility: '접수 목록 조회', sourceIds: ['SRC-1'] }], processes: [{ name: '접수 조회', trigger: '담당자의 조회 요청', steps: ['조회 조건 입력', '허용 범위의 결과 확인'], exceptions: ['열람 범위 미결정'], rules: [], data: ['접수 목록'], sourceIds: ['SRC-1'] }], terms: [], issues: [], sourceCoverage: [{ sourceId: 'SRC-1', role: 'business', rationale: '조회 업무와 담당 범위의 근거' }] });

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
  assert.deepEqual(requests[1].data.correction, { violations: [{ kind: fault === 'source-reference' ? 'business-model-source' : 'schema', path: '$' }] });
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

test('synthesis merge overflow never regenerates and a second-batch correction retains the prior validated model', async () => {
  for (const fault of ['merged-text', 'merged-actors', 'correctable-source']) {
    const state = snapshot(); state.backlog.sources = Array.from({ length: fault === 'merged-text' ? 33 : 5 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
    let calls = 0, prior;
    const pending = prepareBusinessModel(state, { sourceReading: () => ({ summary: '담당자의 접수 정책', blocks: [{ heading: '조회', certainty: 'clear' }], unreadable: [] }), run: async ({ request }) => {
      calls++; const ids = request.data.documents.map(doc => doc.sourceId);
      if (fault === 'correctable-source' && calls === 3) assert.deepEqual(request.data.previousModel, prior);
      const output = { ...model(), processes: [], actors: fault === 'merged-actors' ? Array.from({ length: calls === 1 ? 80 : 1 }, (_, index) => ({ name: `actor-${calls}-${index}`, responsibility: '접수 조회', sourceIds: ids })) : [{ name: '담당자', responsibility: fault === 'merged-text' ? String.fromCharCode(96 + calls).repeat(240) : '접수 조회', sourceIds: ids }], sourceCoverage: ids.map(sourceId => ({ sourceId, role: 'business', rationale: '접수 업무' })) };
      if (calls === 1) prior = structuredClone(output);
      if (fault === 'correctable-source' && calls === 2) output.actors[0].sourceIds = ['UNKNOWN'];
      return { output };
    } });
    if (fault === 'correctable-source') { const result = await pending; assert.equal(calls, 3); assert.deepEqual(result.businessModel.actors[0].sourceIds, state.backlog.sources.map(source => source.id)); }
    else { await assert.rejects(pending, { code: 'AI_BUSINESS_MODEL_CAPACITY' }); assert.equal(calls, fault === 'merged-text' ? 9 : 2); }
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
