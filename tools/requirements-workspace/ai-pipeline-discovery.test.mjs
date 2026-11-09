import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBusinessModel, reviewRequirements } from './ai-pipeline.mjs';
import { source, context, envelope, analysis } from './test-fixtures/ai.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { BUSINESS_MODEL_MAX_BYTES, BUSINESS_MODEL_SCHEMA, validateBusinessModel, validateDocumentSummaries } from './ai-pipeline-contract.mjs';
import { validatePrivateAiValue } from './ai-contract.mjs';
const snapshot = () => ({ backlog: { ...createEmptyBacklogPack(context), project: { code: 'SYNTHETIC', name: '합성 검토', institution: '합성 기관', baselineProfile: '' }, sources: [structuredClone(source)] }, metadata: { context } });
const reading = () => ({ summary: '담당자의 접수 조회 책임과 열람 범위에 관한 문서다.', blocks: [{ heading: '접수 조회', certainty: 'clear', inputId: 'C-1', note: '담당자의 업무' }], unreadable: [] });
const response = request => envelope({ summary: '접수 조회 업무를 통합한다.', actors: [], processes: [], terms: [], issues: [], sourceCoverage: request.data.documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: '조회 업무의 근거' })) });

test('synthesis with no registered requirements constrains corrective regeneration without discarding source-grounded questions', async () => {
  const state = snapshot(), template = structuredClone(BUSINESS_MODEL_SCHEMA), originals = structuredClone(state.backlog.sources);
  let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    calls++;
    assert.equal(schema.properties.issues.items.properties.requirementIds.maxItems, 0);
    assert.ok(JSON.stringify(schema).length <= 20_000);
    const value = response(request).output;
    value.actors.push({ name: '담당자', responsibility: '접수 조회', sourceIds: [source.id] });
    const issue = { id: 'QUESTION-SCOPE', kind: 'decision', severity: 'blocking', question: '담당자의 접수 열람 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [request.data.documents[0].anchors[0]] };
    value.issues.push(issue);
    assert.doesNotThrow(() => validatePrivateAiValue(value, schema));
    assert.throws(() => validatePrivateAiValue({ ...value, issues: [{ ...issue, requirementIds: ['UNREGISTERED'] }] }, schema), { code: 'AI_OUTPUT_INVALID' });
    if (calls === 1) value.actors[0].sourceIds = ['UNKNOWN-SOURCE'];
    else assert.deepEqual(request.data.correction.violations, [{ kind: 'business-model-source', path: '$' }]);
    return envelope(value);
  } });
  assert.equal(calls, 2); assert.equal(result.businessModel.issues.length, 1);
  assert.deepEqual(result.businessModel.issues[0].requirementIds, []);
  assert.equal(result.businessModel.issues[0].severity, 'blocking');
  assert.deepEqual(state.backlog.sources, originals); assert.deepEqual(BUSINESS_MODEL_SCHEMA, template);
});

test('synthesis keeps registered requirement references valid without polluting the shared schema', async () => {
  const state = snapshot(), template = structuredClone(BUSINESS_MODEL_SCHEMA);
  state.backlog.businessRequirements = [{ id: 'REQ-EXISTING' }];
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    assert.deepEqual(schema.properties.issues, template.properties.issues);
    assert.equal(schema.properties.summary.maxLength, 2000);
    assert.doesNotMatch(schema.description, /No project requirements are registered yet/);
    const value = response(request).output;
    value.issues.push({ id: 'QUESTION-EXISTING', kind: 'decision', severity: 'blocking', question: '기존 접수 요구사항의 열람 범위를 확인해 주세요.', options: [], requirementIds: ['REQ-EXISTING'], citations: [request.data.documents[0].anchors[0]] });
    assert.doesNotThrow(() => validatePrivateAiValue(value, schema));
    return envelope(value);
  } });
  assert.deepEqual(result.businessModel.issues[0].requirementIds, ['REQ-EXISTING']);
  const forged = structuredClone(result.businessModel); forged.issues[0].requirementIds = ['UNREGISTERED'];
  assert.throws(() => validateBusinessModel(forged, state), error => error.code === 'AI_OUTPUT_INVALID' && error.details.some(detail => detail.kind === 'issue-reference'));
  assert.deepEqual(BUSINESS_MODEL_SCHEMA, template);
});

test('discovery generates a bounded outline while retaining original clauses and unresolved evidence', async () => {
  const state = snapshot(), template = structuredClone(BUSINESS_MODEL_SCHEMA);
  state.backlog.sources = Array.from({ length: 37 }, (_, index) => ({ ...structuredClone(source), id: `SRC-${index + 1}` }));
  const originals = structuredClone(state.backlog.sources);
  let calls = 0;
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request, schema }) => {
    calls++;
    assert.equal(schema.properties.summary.maxLength, 2000);
    assert.equal(schema.properties.actors.items.properties.responsibility.maxLength, 240);
    assert.equal(schema.properties.terms.items.properties.meaning.maxLength, 240);
    assert.equal(schema.properties.sourceCoverage.items.properties.rationale.maxLength, 240);
    const fields = schema.properties.processes.items.properties;
    assert.equal(fields.trigger.maxLength, 240);
    for (const field of ['steps', 'exceptions', 'rules', 'data']) {
      assert.equal(fields[field].maxItems, 6);
      assert.equal(fields[field].items.maxLength, field === 'data' ? 180 : 240);
    }
    const expectedIssues = structuredClone(template.properties.issues);
    expectedIssues.items.properties.requirementIds.maxItems = 0;
    assert.deepEqual(schema.properties.issues, expectedIssues);
    assert.deepEqual(request.data.discoveryBudget, { maxMergedBytes: BUSINESS_MODEL_MAX_BYTES, targetBatchBytes: 12288, readingIssueBytes: 0, previousModelBytes: request.data.previousModel ? Buffer.byteLength(JSON.stringify(request.data.previousModel)) : 0, batch: calls, batches: 10 });
    assert.match(schema.description, /전체 원문 조항/);
    assert.match(schema.description, /변경 없는 기존 항목은 반환에서 생략/);
    assert.ok(JSON.stringify(schema).length <= 20_000);
    const value = response(request).output;
    value.processes.push({ name: '접수', trigger: '접수 요청', steps: Array(7).fill('담당자가 접수를 조회한다.'), exceptions: [], rules: [], data: [], sourceIds: [request.data.documents[0].sourceId] });
    assert.throws(() => validatePrivateAiValue(value, schema), { code: 'AI_OUTPUT_INVALID' });
    assert.doesNotThrow(() => validateBusinessModel(value, state, request.data.documents.map(doc => doc.sourceId)));
    const description = (calls === 2 ? '나' : '가').repeat(240), sourceIds = request.data.documents.map(doc => doc.sourceId);
    value.actors.push({ name: '담당자', responsibility: description, sourceIds });
    value.terms.push({ term: '접수', meaning: description, sourceIds });
    value.processes = [{ name: '접수', trigger: description, steps: calls <= 2 ? Array.from({ length: 6 }, (_, index) => `${calls}차 접수 확인 ${index + 1}`) : [], exceptions: [], rules: [], data: [], sourceIds }];
    if (calls === 1) value.issues.push({ id: 'QUESTION-RETAINED', kind: 'decision', severity: 'blocking', question: '접수 열람 범위를 확인해 주세요.', options: [], requirementIds: [], citations: [request.data.documents[0].anchors[0]] });
    assert.doesNotThrow(() => validatePrivateAiValue(value, schema));
    return envelope(value);
  } });
  assert.equal(calls, 10); assert.equal(result.documents.length, 37);
  assert.equal(result.businessModel.sourceCoverage.length, 37);
  for (const [items, field] of [[result.businessModel.actors, 'responsibility'], [result.businessModel.terms, 'meaning'], [result.businessModel.processes, 'trigger']]) {
    assert.equal(items[0][field], `${'가'.repeat(240)}\n${'나'.repeat(240)}`);
    assert.equal(items[0].sourceIds.length, 37);
  }
  assert.equal(result.businessModel.processes[0].steps.length, 12);
  assert.equal(result.businessModel.issues[0].id, 'QUESTION-RETAINED');
  assert.equal(result.businessModel.issues[0].severity, 'blocking');
  assert.deepEqual(state.backlog.sources, originals); assert.deepEqual(BUSINESS_MODEL_SCHEMA, template);
});

test('synthesis validates real runner responses against outline bounds before publishing', async () => {
  let calls = 0, published = 0;
  const result = await prepareBusinessModel(snapshot(), { sourceReading: reading, onValidated: stage => { if (stage === 'synthesis') published++; }, run: async ({ request }) => {
    calls++;
    const value = response(request).output;
    if (calls === 1) value.processes.push({ name: '접수', trigger: '접수 요청', steps: Array(7).fill('담당자가 접수를 확인한다.'), exceptions: [], rules: [], data: [], sourceIds: [source.id] });
    else assert.equal(request.data.correction.violations[0].kind, 'schema');
    return envelope(value);
  } });
  assert.equal(calls, 2); assert.equal(published, 1);
  assert.deepEqual(result.businessModel.processes, []);
});

test('synthesis corrects runner schema rejections once without forwarding their message', async () => {
  for (const fault of ['missing', 'unsafe', 'array']) {
    const alwaysInvalid = fault === 'unsafe';
    let calls = 0;
    const operation = prepareBusinessModel(snapshot(), { sourceReading: reading, run: async ({ request }) => {
      calls++;
      if (calls === 2) {
        assert.deepEqual(request.data.correction.violations, [{ kind: 'schema', path: '$' }]);
        assert.equal(JSON.stringify(request).includes('SYNTHETIC_REJECTED_BODY'), false);
      }
      if (calls === 1 || alwaysInvalid) throw Object.assign(Error('SYNTHETIC_REJECTED_BODY'), { code: 'AI_OUTPUT_INVALID', ...(fault === 'unsafe' ? { details: [{ kind: 'SYNTHETIC_REJECTED_BODY', path: '$."SYNTHETIC_REJECTED_BODY"' }] } : fault === 'array' ? { details: [{ kind: ['output-size'], path: ['$.actors'] }] } : {}) });
      return response(request);
    } });
    if (alwaysInvalid) await assert.rejects(operation, { code: 'AI_OUTPUT_INVALID' });
    else await operation;
    assert.equal(calls, 2);
  }
});

test('synthesis never retries transport limits or a real model capacity failure', async () => {
  for (const code of ['AI_TIMEOUT', 'AI_OUTPUT_TOO_LARGE', 'AI_MODEL_MISMATCH', 'AI_INPUT_TOO_LARGE', 'AI_OUTPUT_INVALID', 'AI_BUSINESS_MODEL_CAPACITY']) {
    let calls = 0;
    await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: reading, run: async ({ request }) => {
      calls++;
      if (code !== 'AI_BUSINESS_MODEL_CAPACITY') throw Object.assign(Error(code), { code, ...(code === 'AI_OUTPUT_INVALID' ? { details: [{ kind: 'output-size', path: '$' }] } : {}) });
      const value = response(request).output;
      value.actors = Array.from({ length: 30 }, (_, index) => ({ name: `담당자${index}`, responsibility: '가'.repeat(1900), sourceIds: [source.id] }));
      return envelope(value);
    } }), { code });
    assert.equal(calls, 1);
  }
});

test('synthesis preserves cancellation when a runner rejects after abort', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(prepareBusinessModel(snapshot(), { sourceReading: reading, signal: controller.signal, run: async () => {
    calls++; controller.abort(); throw Object.assign(Error('SYNTHETIC_REJECTED_BODY'), { code: 'AI_OUTPUT_INVALID' });
  } }), { code: 'AI_CANCELLED' });
  assert.equal(calls, 1);
});

test('discovery byte guidance reserves the known source-reading questions', async () => {
  let budget;
  const result = await prepareBusinessModel(snapshot(), { sourceReading: () => ({ ...reading(), unreadable: [{ inputId: 'C-1', reason: '처리기간을 원본과 대조해야 한다.' }] }), run: async ({ request }) => { budget = request.data.discoveryBudget; return response(request); } });
  const bytes = Buffer.byteLength(JSON.stringify(result.businessModel.issues));
  assert.ok(bytes > 0); assert.equal(budget.readingIssueBytes, bytes);
  assert.equal(budget.targetBatchBytes, Math.floor((BUSINESS_MODEL_MAX_BYTES - bytes) * 0.75));
  assert.equal(budget.maxMergedBytes, BUSINESS_MODEL_MAX_BYTES);
});

test('large documents provide bounded representative anchors with honest full clause counts', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses = Array.from({ length: 1000 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` }));
  let seen;
  await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => { seen = request.data.documents[0]; return response(request); } });
  assert.equal(seen.clauseCount, 1000); assert.equal(seen.anchors.length, 32);
  assert.equal(seen.anchors[0].clauseId, 'C-1'); assert.equal(seen.anchors.at(-1).clauseId, 'C-1000');
});

test('a model cannot hide unreadable document regions and a recorded human answer is respected', async () => {
  const state = snapshot();
  const options = { sourceReading: () => ({ ...reading(), unreadable: [{ inputId: 'C-1', reason: '표의 처리기간 숫자가 흐려 원본 대조가 필요하다.' }] }), run: async ({ request }) => response(request) };
  const result = await prepareBusinessModel(state, options);
  assert.equal(result.businessModel.issues.length, 1); assert.equal(result.businessModel.issues[0].severity, 'blocking');
  state.metadata.ai = { decisions: [{ issueId: result.businessModel.issues[0].id, answer: '원본을 대조했으며 처리기간은 3일이다.' }] };
  const resolved = await prepareBusinessModel(state, options); assert.equal(resolved.businessModel.issues.length, 0);
});

test('an imported original with no current AI reading cannot silently fall back to old local OCR in the full pipeline', async () => {
  const state = snapshot(); state.backlog.sources[0].fileSha256 = 'a'.repeat(64);
  state.metadata.imports = [{ status: 'ready', sourceId: 'SRC-1', originalRef: { id: 'synthetic' } }];
  let calls = 0;
  await assert.rejects(prepareBusinessModel(state, { sourceReading: () => null, run: async ({ request }) => { calls++; return response(request); } }), { code: 'AI_DOCUMENT_READING_REQUIRED' });
  assert.equal(calls, 0);
});

test('converter omissions cannot be silently certified by an otherwise clear AI response', async () => {
  const result = await prepareBusinessModel(snapshot(), { sourceReading: () => ({ ...reading(), warningCodes: ['DOCUMENT_IMAGE_UNREADABLE'] }), run: async ({ request }) => response(request) });
  assert.equal(result.businessModel.issues.length, 1); assert.equal(result.businessModel.issues[0].severity, 'blocking');
});

test('quality review also inspects source clauses omitted from all requirement citations', async () => {
  const state = snapshot(), proposal = analysis({ data: { sources: state.backlog.sources, decisions: [] } }, { question: false });
  state.backlog.sources[0].clauses.push({ ...source.clauses[0], id: 'C-2', text: '업무 담당자는 접수 결과를 변경할 수 없으며 열람만 가능하다.' });
  proposal.coverage.push({ sourceId: 'SRC-1', clauseId: 'C-2', disposition: 'excluded', requirementIds: [], rationale: '배경으로 잘못 분류한 합성 초안' });
  let inspected = false;
  const result = await reviewRequirements(proposal, null, state, { run: async ({ request }) => {
    const clause = request.data.sources.flatMap(source => source.clauses).find(clause => clause.id === 'C-2');
    if (clause) { inspected = true; return envelope({ revisions: [], issues: [{ id: 'MISSING-READ-ONLY', kind: 'missing', severity: 'blocking', question: '조회 전용 제약을 배경으로 제외한 이유를 확인해 주세요.', options: ['조회 전용 제약 반영'], requirementIds: ['REQ-1'], citations: [{ sourceId: 'SRC-1', clauseId: clause.id, quote: clause.text }] }] }); }
    return envelope({ revisions: [], issues: [] });
  } });
  assert.equal(inspected, true); assert.ok(result.issues.some(issue => issue.id === 'MISSING-READ-ONLY'));
});

test('manual sources with more than 200 short clauses are packed before any reading calls', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses = Array.from({ length: 201 }, (_, index) => ({ ...source.clauses[0], id: `C-${index + 1}` }));
  let readingCalls = 0;
  const result = await prepareBusinessModel(state, { run: async ({ request }) => {
    if (request.phase !== 'reading') return response(request);
    readingCalls++;
    return envelope({ documentTypes: ['interview'], summary: '접수 조회 범위를 반복 설명한 합성 자료다.', blocks: request.data.units.map(unit => ({ inputId: unit.id, heading: '접수 조회', kind: 'paragraph', text: null, certainty: 'clear', note: '네이티브 원문 보존' })), unreadable: [] }, 'reading');
  } });
  assert.equal(readingCalls, 1); assert.equal(result.documents[0].clauseCount, 201);
});

test('quality review sees prior decisions, reuse evidence and computed validation questions without freezing resolved system questions', async () => {
  const state = snapshot(); state.metadata.ai = { decisions: [{ issueId: 'POLICY', question: '구현 방향', answer: '신규 추가 개발로 진행한다.' }] };
  state.metadata.context = { ...context, modules: [{ id: 'receipt', label: '접수' }] };
  const proposal = analysis({ data: { sources: state.backlog.sources, decisions: [] } }, { question: false }); proposal.requirements[0].solutionDisposition = 'undecided';
  const result = await reviewRequirements(proposal, null, state, { run: async ({ request }) => {
    assert.deepEqual(request.data.decisions, state.metadata.ai.decisions);
    assert.equal(request.data.modules[0].id, 'receipt'); assert.ok(request.data.repositoryMatches.results.length);
    assert.ok(request.data.validationIssues.some(issue => issue.severity === 'blocking'));
    return envelope({ issues: [], revisions: [{ ...proposal.requirements[0], solutionDisposition: 'gap-dev' }] });
  } });
  assert.equal(result.requirements[0].solutionDisposition, 'gap-dev');
  assert.equal(result.issues.some(issue => issue.id.startsWith('SYS-')), false);
});

test('document anchors preserve Unicode code points without rejecting valid supplementary characters', async () => {
  const state = snapshot(); state.backlog.sources[0].clauses[0].text = '🌐'.repeat(160) + '담당자는본인소유접수목록만조회할수있다.';
  const result = await prepareBusinessModel(state, { sourceReading: reading, run: async ({ request }) => response(request) });
  assert.doesNotThrow(() => validateDocumentSummaries(result.documents, state));
});
