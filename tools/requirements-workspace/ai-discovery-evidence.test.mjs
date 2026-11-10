import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBusinessModel, documentAnchors } from './ai-pipeline.mjs';
import { BUSINESS_MODEL_MAX_BYTES, BUSINESS_MODEL_SCHEMA, validateBusinessModel } from './ai-pipeline-contract.mjs';
import { validatePrivateAiValue } from './ai-contract.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { context, source, envelope } from './test-fixtures/ai.mjs';

const snapshot = () => ({ backlog: { ...createEmptyBacklogPack(context), project: { code: 'SYNTHETIC', name: '합성 근거 선택', institution: '합성 기관', baselineProfile: '' }, sources: [structuredClone(source)] }, metadata: { context } });
const reading = () => ({ summary: '담당자의 접수 조회와 열람 범위에 관한 원문이다.', blocks: [{ heading: '접수 조회', certainty: 'clear' }], unreadable: [] });
const model = request => ({ summary: '접수 조회 업무의 원문 근거를 연결한다.', actors: [], processes: [], terms: [], sourceCoverage: request.data.documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: '접수 조회의 원문' })), issues: [] });
const question = (id, citations) => ({ id, kind: 'decision', severity: 'blocking', question: '접수 열람 범위를 확인해 주세요.', options: [], requirementIds: [], citations });
const plain = ({ sourceId, clauseId, quote }) => ({ sourceId, clauseId, quote });

test('discovery selects numbered evidence and materializes exact Unicode source quotes without rewriting them', async () => {
  const state = snapshot(), template = structuredClone(BUSINESS_MODEL_SCHEMA);
  state.backlog.sources[0].clauses[0].text = '담당자는 "접수 내역"을 조회한다.\r\n𠮷 부서의 열람 범위는 원문을 그대로 보존한다.';
  const originals = structuredClone(state.backlog.sources), expected = documentAnchors(originals[0])[0];
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    const anchor = request.data.documents[0].anchors[0];
    assert.equal(typeof anchor.evidenceIndex, 'number');
    assert.deepEqual(plain(anchor), expected);
    const ref = schema.properties.issues.items.properties.citations.items;
    assert.deepEqual(Object.keys(ref.properties), ['evidenceIndex']);
    assert.deepEqual(ref.required, ['evidenceIndex']); assert.equal(ref.additionalProperties, false);
    assert.deepEqual(ref.properties.evidenceIndex, { type: 'integer', minimum: 0, maximum: 0 });
    anchor.quote = 'SYNTHETIC_OVERRIDE'; anchor.clauseId = 'SYNTHETIC_CLAUSE';
    return envelope({ ...model(request), issues: [question('Q-UNICODE', [{ evidenceIndex: anchor.evidenceIndex }])] });
  } });
  assert.deepEqual(result.businessModel.issues[0].citations, [expected]);
  assert.deepEqual(result.documents[0].anchors, [expected]);
  assert.doesNotThrow(() => validateBusinessModel(result.businessModel, state));
  assert.equal(JSON.stringify(result).includes('evidenceIndex'), false);
  assert.deepEqual(state.backlog.sources, originals); assert.deepEqual(BUSINESS_MODEL_SCHEMA, template);
});

test('discovery can cite prior validated questions across batches while retaining omitted questions and deduplicating their evidence', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 5 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  const oldAnchor = documentAnchors(state.backlog.sources[0])[0], currentAnchor = documentAnchors(state.backlog.sources[4])[0];
  let calls = 0, generationSchema;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    calls++;
    const value = model(request), current = request.data.documents[0].anchors[0].evidenceIndex;
    if (calls === 1) { generationSchema = structuredClone(schema); assert.equal(request.data.evidenceCount, 4); value.issues = [question('Q-KEEP-1', [{ evidenceIndex: current }]), question('Q-KEEP-2', [{ evidenceIndex: current }])]; }
    else {
      assert.deepEqual(request.data.previousModel.issues[0].citations, [oldAnchor]);
      const previous = request.data.previousIssueEvidence;
      assert.deepEqual(previous.map(item => item.issueId), ['Q-KEEP-1', 'Q-KEEP-2']);
      const oldIndex = previous[0].evidenceIndexes[0];
      assert.equal(oldIndex, previous[1].evidenceIndexes[0]);
      assert.notEqual(current, oldIndex);
      assert.equal(request.data.evidenceCount, 2);
      assert.deepEqual(schema, generationSchema);
      assert.equal(schema.properties.issues.items.properties.citations.items.properties.evidenceIndex.maximum, 4);
      value.issues = [question('Q-CROSS', [{ evidenceIndex: oldIndex }, { evidenceIndex: current }])];
    }
    return envelope(value);
  } });
  assert.equal(calls, 2); assert.equal(result.businessModel.issues.length, 3);
  assert.deepEqual(result.businessModel.issues.find(issue => issue.id === 'Q-CROSS').citations, [oldAnchor, currentAnchor]);
  assert.deepEqual(result.businessModel.issues.find(issue => issue.id === 'Q-KEEP-1').citations, [oldAnchor]);
  assert.equal(result.businessModel.sourceCoverage.length, 5);
});

test('discovery refuses fabricated references and free-form quote overrides without storing or forwarding rejected values', async () => {
  for (const citation of [{ evidenceIndex: -1 }, { evidenceIndex: 1 }, { evidenceIndex: 0.5 }, { evidenceIndex: '0' }, { evidenceIndex: 0, quote: 'SYNTHETIC_OVERRIDE' }, { sourceId: source.id, clauseId: source.clauses[0].id, quote: source.clauses[0].text }]) {
    const state = snapshot(), originals = structuredClone(state.backlog.sources); let calls = 0, published = 0;
    await assert.rejects(prepareBusinessModel(state, { sourceReading: reading, onValidated: stage => { if (stage === 'synthesis') published++; }, run: async ({ request }) => {
      calls++;
      if (calls === 2) assert.equal(JSON.stringify(request).includes('SYNTHETIC_OVERRIDE'), false);
      return envelope({ ...model(request), issues: [question('Q-INVALID', [citation])] });
    } }), { code: 'AI_OUTPUT_INVALID' });
    assert.equal(calls, 2); assert.equal(published, 0); assert.deepEqual(state.backlog.sources, originals);
  }
});

test('the active evidence range is enforced locally even when a reference fits the stable generation schema', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 5 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    calls++; const output = model(request);
    if (calls === 2) {
      assert.equal(request.data.evidenceCount, 1);
      output.issues = [question('Q-NOT-SUPPLIED', [{ evidenceIndex: 1 }])];
      assert.doesNotThrow(() => validatePrivateAiValue(output, schema));
    }
    if (calls === 3) { assert.equal(request.data.evidenceCount, 1); assert.deepEqual(request.data.correction.violations, [{ kind: 'citation-reference', path: '$.issues[0].citations[0]' }]); }
    return envelope(output);
  } });
  assert.equal(calls, 3); assert.equal(result.businessModel.issues.length, 0);
  assert.equal(result.businessModel.sourceCoverage.length, 5);
});

test('the canonical byte cap counts materialized quotes and never retries a compact response whose resolved evidence exceeds capacity', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses = Array.from({ length: 30 }, (_, index) => ({ ...structuredClone(source.clauses[0]), id: `C-${index + 1}`, text: `${index + 1}번 조항: ${'담당자의 접수 조회 정책과 예외 처리 근거를 원문 그대로 보존한다. '.repeat(10)}` }));
  const anchors = documentAnchors(state.backlog.sources[0]); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++;
    const output = { ...model(request), issues: Array.from({ length: 100 }, (_, index) => question(`Q-${index}`, request.data.documents[0].anchors.map(anchor => ({ evidenceIndex: anchor.evidenceIndex })))) };
    assert.ok(Buffer.byteLength(JSON.stringify(output)) < BUSINESS_MODEL_MAX_BYTES);
    const resolved = { ...output, issues: output.issues.map(issue => ({ ...issue, citations: anchors })) };
    assert.ok(Buffer.byteLength(JSON.stringify(resolved)) > BUSINESS_MODEL_MAX_BYTES);
    return envelope(output);
  } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 1);
});

test('duplicate evidence within one question is corrected once without silently deleting citations', async () => {
  const state = snapshot(); let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++;
    if (calls === 2) assert.deepEqual(request.data.correction.violations, [{ kind: 'citation-reference', path: '$.issues[0].citations[1]' }]);
    return envelope({ ...model(request), issues: [question('Q-DUPLICATE', Array.from({ length: calls === 1 ? 2 : 1 }, () => ({ evidenceIndex: 0 })))] });
  } });
  assert.equal(calls, 2); assert.deepEqual(result.businessModel.issues[0].citations, documentAnchors(state.backlog.sources[0]));
});

test('unquotable registered text is rejected before reading any other source or publishing a reading', async () => {
  const state = snapshot(); state.backlog.sources.push({ ...structuredClone(source), id: 'SRC-UNQUOTABLE', clauses: [{ ...structuredClone(source.clauses[0]), text: '─'.repeat(300) }] });
  let calls = 0, published = 0;
  await assert.rejects(prepareBusinessModel(state, { onValidated: () => { published++; }, run: async () => { calls++; throw Error('UNEXPECTED_READING_CALL'); } }), { code: 'AI_DOCUMENT_UNREADABLE' });
  assert.equal(calls, 0); assert.equal(published, 0);
});

test('canonical historical discovery remains valid while unresolved numeric references are never canonical cache data', () => {
  const state = snapshot(), anchor = documentAnchors(state.backlog.sources[0])[0];
  const legacy = { ...model({ data: { documents: [{ sourceId: source.id }] } }), issues: [question('Q-LEGACY', [anchor])] };
  assert.doesNotThrow(() => validateBusinessModel(legacy, state));
  assert.throws(() => validateBusinessModel({ ...legacy, issues: [question('Q-NATIVE', [{ evidenceIndex: 0 }])] }, state), { code: 'AI_OUTPUT_INVALID' });
});

test('discovery cannot invent evidence for a clear-looking source that has no quotable text', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses[0].text = '─'.repeat(300); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => { calls++; return envelope(model(request)); } }), { code: 'AI_DOCUMENT_UNREADABLE' });
  assert.equal(calls, 0);
});

for (const count of [2, 5]) test(`an unquotable source among ${count} documents fails before synthesis despite other or prior evidence`, async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: count }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  state.backlog.sources.at(-1).clauses[0].text = '─'.repeat(300); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++; const output = model(request);
    if (calls === 1) output.issues = [question('Q-PRIOR', [{ evidenceIndex: request.data.documents[0].anchors[0].evidenceIndex }])];
    return envelope(output);
  } }), { code: 'AI_DOCUMENT_UNREADABLE' });
  assert.equal(calls, 0);
});

test('a rejected runner cannot mutate human decisions, evidence input or validation schema for the corrective attempt', async () => {
  const state = snapshot(); state.metadata.ai = { decisions: [{ issueId: 'Q-HUMAN', question: '원본 확인', answer: '원문 대조를 완료했다.' }] };
  const decisions = structuredClone(state.metadata.ai.decisions), expected = documentAnchors(state.backlog.sources[0])[0]; let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    calls++;
    if (calls === 1) {
      request.data.documents[0].anchors[0].quote = 'SYNTHETIC_MUTATION';
      request.data.decisions[0].answer = 'SYNTHETIC_MUTATION'; schema.properties.summary.maxLength = 1;
      throw Object.assign(Error('SYNTHETIC_MUTATION'), { code: 'AI_OUTPUT_INVALID' });
    }
    assert.deepEqual(plain(request.data.documents[0].anchors[0]), expected);
    assert.deepEqual(request.data.decisions, decisions); assert.equal(schema.properties.summary.maxLength, 2000);
    assert.equal(JSON.stringify(request).includes('SYNTHETIC_MUTATION'), false);
    return envelope({ ...model(request), issues: [question('Q-RESULT', [{ evidenceIndex: request.data.documents[0].anchors[0].evidenceIndex }])] });
  } });
  assert.equal(calls, 2); assert.deepEqual(state.metadata.ai.decisions, decisions);
  assert.deepEqual(result.businessModel.issues[0].citations, [expected]);
});

test('reading questions reserve real capacity and an oversized intermediate map is corrected before exhausting later batches', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 24 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: () => ({ ...reading(), blocks: [{ heading: '원본 대조', certainty: 'uncertain', inputId: 'C-1', note: '표의 조건을 원본과 대조해야 한다. '.repeat(40) }] }), run: async ({ request }) => {
    calls++; const value = model(request), budget = request.data.discoveryBudget;
    if (calls === 1) value.actors = Array.from({ length: 80 }, (_, index) => ({ name: `담당자-${index}`, responsibility: '접수 내역과 업무 책임을 원문 기준으로 확인한다. '.repeat(6).slice(0, 240), sourceIds: [request.data.documents[0].sourceId] }));
    if (calls === 2) {
      assert.deepEqual(request.data.correction.violations, [{ kind: 'business-model-budget', path: '$' }]);
      assert.ok(budget.readingIssueBytes > 30_000); assert.equal(budget.targetMergedBytesForBatch, budget.targetBatchBytes);
      assert.equal(request.data.previousModel, null);
    }
    return envelope(value);
  } });
  assert.equal(calls, 7); assert.equal(result.businessModel.actors.length, 0);
  assert.equal(result.businessModel.issues.length, 24); assert.equal(result.businessModel.sourceCoverage.length, 24);
  assert.ok(Buffer.byteLength(JSON.stringify(result.businessModel)) <= BUSINESS_MODEL_MAX_BYTES);
});

for (const termCount of [100, 160]) test(`cumulative rejection of ${termCount} terms preserves the earlier map and allows one correction`, async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 8 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++; const value = model(request);
    if (calls === 1) value.actors = Array.from({ length: 70 }, (_, index) => ({ name: `담당자-${index}`, responsibility: '가'.repeat(240), sourceIds: [request.data.documents[0].sourceId] }));
    if (calls === 2) value.terms = Array.from({ length: termCount }, (_, index) => ({ term: `업무 용어-${index}`, meaning: '나'.repeat(240), sourceIds: [request.data.documents[0].sourceId] }));
    if (calls === 3) {
      assert.deepEqual(request.data.correction.violations, [{ kind: 'business-model-budget', path: '$' }]);
      assert.equal(request.data.correction.budget.reason, termCount === 100 ? 'bytes' : 'merged-bytes');
      assert.equal(request.data.previousModel.actors.length, 70); assert.equal(request.data.previousModel.terms.length, 0);
      value.terms = [{ term: '접수', meaning: '원본의 접수 업무', sourceIds: [request.data.documents[0].sourceId] }];
    }
    return envelope(value);
  } });
  assert.equal(calls, 3); assert.equal(result.businessModel.actors.length, 70); assert.equal(result.businessModel.terms.length, 1);
  assert.equal(result.businessModel.sourceCoverage.length, 8);
});

for (const count of [100, 101]) test(`reading questions preserve project slots while each model response stays bounded to one hundred (${count})`, async () => {
  const state = snapshot(); let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: () => ({ ...reading(), unreadable: [{ inputId: 'C-1', reason: '원본의 처리기간을 대조해야 한다.' }] }), run: async ({ request, schema }) => {
    calls++;
    assert.equal(schema.properties.issues.maxItems, 100);
    assert.equal(request.data.discoveryBudget.maxIssues, 1000);
    assert.equal(request.data.discoveryBudget.maxIssuesPerResponse, 100);
    assert.equal(request.data.discoveryBudget.readingIssueCount, 1);
    if (calls === 2) {
      assert.deepEqual(request.data.correction.violations, [{ kind: 'schema', path: '$' }]);
    }
    return envelope({ ...model(request), issues: Array.from({ length: calls === 1 ? count : 1 }, (_, index) => ({ ...question(`Q-SLOT-${index}`, [{ evidenceIndex: 0 }]), question: `${index + 1}번 접수 열람 범위를 확인해 주세요.` })) });
  } });
  assert.equal(calls, count === 100 ? 1 : 2);
  assert.equal(result.businessModel.issues.length, count === 100 ? 101 : 2);
  assert.ok(result.businessModel.issues.some(issue => issue.id.startsWith('DOC-')));
});

test('an impossible reading-question reserve fails before any synthesis call', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 100 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` })); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: () => ({ ...reading(), blocks: [{ heading: '원본 대조', certainty: 'uncertain', inputId: 'C-1', note: '가'.repeat(900) }] }), run: async ({ request }) => { calls++; return envelope(model(request)); } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 0);
});

test('a necessary early summary and questions may exceed a small linear target after one correction when the real project capacity permits them', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 100 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` })); let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++; const value = model(request);
    if (calls <= 2) {
      value.summary = '가'.repeat(2000);
      value.issues = Array.from({ length: 5 }, (_, index) => ({ ...question(`Q-EARLY-${index}`, [{ evidenceIndex: 0 }]), question: `${index + 1}번 원문의 열람 정책을 확인해 주세요.` }));
    }
    if (calls === 2) assert.equal(request.data.correction.budget.reason, 'bytes');
    return envelope(value);
  } });
  assert.equal(calls, 26); assert.equal(result.businessModel.issues.length, 5); assert.equal(result.businessModel.sourceCoverage.length, 100);
});

test('the final real byte ceiling remains available after compacting once instead of imposing an unused quarter-capacity restriction', async () => {
  const state = snapshot(); let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++; const value = { ...model(request), terms: Array.from({ length: 200 }, (_, index) => ({ term: `용어-${index}`, meaning: '가'.repeat(190), sourceIds: [source.id] })) };
    const bytes = Buffer.byteLength(JSON.stringify(value)); assert.ok(bytes > BUSINESS_MODEL_MAX_BYTES * 0.75 && bytes < BUSINESS_MODEL_MAX_BYTES);
    if (calls === 2) assert.equal(request.data.discoveryBudget.maxMergedBytesForBatch, BUSINESS_MODEL_MAX_BYTES);
    return envelope(value);
  } });
  assert.equal(calls, 2); assert.equal(result.businessModel.terms.length, 200);
});

test('two real reserved-capacity overruns fail with capacity after two calls and never publish a synthesis', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 24 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` })); let calls = 0, published = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: () => ({ ...reading(), blocks: [{ heading: '원본 대조', certainty: 'uncertain', inputId: 'C-1', note: '표의 조건을 원본과 대조해야 한다. '.repeat(40) }] }), onValidated: stage => { if (stage === 'synthesis') published++; }, run: async ({ request }) => {
    calls++; const value = { ...model(request), actors: Array.from({ length: 80 }, (_, index) => ({ name: `담당자-${index}`, responsibility: '가'.repeat(240), sourceIds: [request.data.documents[0].sourceId] })), terms: Array.from({ length: 60 }, (_, index) => ({ term: `용어-${index}`, meaning: '가'.repeat(240), sourceIds: [request.data.documents[0].sourceId] })) };
    assert.ok(Buffer.byteLength(JSON.stringify(value)) < BUSINESS_MODEL_MAX_BYTES);
    return envelope(value);
  } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 2); assert.equal(published, 0);
});

test('remaining source coverage is reserved before accepting a near-full first map', async () => {
  const state = snapshot(); state.backlog.sources = Array.from({ length: 8 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` })); let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => {
    calls++; const value = { ...model(request), summary: '가', actors: Array.from({ length: 80 }, (_, index) => ({ name: `담당자-${index}`, responsibility: '가'.repeat(240), sourceIds: [request.data.documents[0].sourceId] })) };
    const desiredBytes = BUSINESS_MODEL_MAX_BYTES - 100; value.terms = [];
    for (let index = 0; index < 200; index++) {
      value.terms.push({ term: `용어-${index}`, meaning: '가'.repeat(240), sourceIds: [request.data.documents[0].sourceId] });
      const base = Buffer.byteLength(JSON.stringify(value));
      if (base >= desiredBytes - 5997 && base <= desiredBytes) { value.summary = '가'.repeat(1 + Math.floor((desiredBytes - base) / 3)); break; }
    }
    const bytes = Buffer.byteLength(JSON.stringify(value));
    assert.ok(value.summary.length <= 2000 && bytes < BUSINESS_MODEL_MAX_BYTES && bytes > BUSINESS_MODEL_MAX_BYTES - 200);
    return envelope(value);
  } }), { code: 'AI_BUSINESS_MODEL_CAPACITY' });
  assert.equal(calls, 2);
});
