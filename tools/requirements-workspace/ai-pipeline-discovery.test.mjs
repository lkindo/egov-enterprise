import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBusinessModel, reviewRequirements } from './ai-pipeline.mjs';
import { source, context, envelope, analysis } from './test-fixtures/ai.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
import { BUSINESS_MODEL_SCHEMA, validateBusinessModel, validateDocumentSummaries } from './ai-pipeline-contract.mjs';
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
    assert.deepEqual(schema, template);
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
