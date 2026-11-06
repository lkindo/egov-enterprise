import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBusinessModel, reviewRequirements } from './ai-pipeline.mjs';
import { source, context, envelope, analysis } from './test-fixtures/ai.mjs';
import { createEmptyBacklogPack } from '../../scripts/export-deliverables-workspace.mjs';
const snapshot = () => ({ backlog: { ...createEmptyBacklogPack(context), project: { code: 'SYNTHETIC', name: '합성 검토', institution: '합성 기관', baselineProfile: '' }, sources: [structuredClone(source)] }, metadata: { context } });
const reading = () => ({ summary: '담당자의 접수 조회 책임과 열람 범위에 관한 문서다.', blocks: [{ heading: '접수 조회', certainty: 'clear', inputId: 'C-1', note: '담당자의 업무' }], unreadable: [] });
const response = request => envelope({ summary: '접수 조회 업무를 통합한다.', actors: [], processes: [], terms: [], issues: [], sourceCoverage: request.data.documents.map(doc => ({ sourceId: doc.sourceId, role: 'business', rationale: '조회 업무의 근거' })) });

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
    return envelope({ documentTypes: ['interview'], summary: '접수 조회 범위를 반복 설명한 합성 자료다.', blocks: request.data.units.map(unit => ({ inputId: unit.id, heading: '접수 조회', kind: 'paragraph', text: null, certainty: 'clear', note: '네이티브 원문 보존' })), unreadable: [] });
  } });
  assert.equal(readingCalls, 1); assert.equal(result.documents[0].clauseCount, 201);
});
