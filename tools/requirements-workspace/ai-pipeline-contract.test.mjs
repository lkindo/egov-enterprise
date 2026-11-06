import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBusinessModel, validateRequirementReview, validatePlanReview } from './ai-pipeline-contract.mjs';
import { planningGroups } from './ai-pipeline.mjs';
import { context, source, analysis, decomposition } from './test-fixtures/ai.mjs';
const snapshot = () => ({ backlog: { sources: [structuredClone(source)], businessRequirements: [] }, metadata: { context } });
const model = () => ({ summary: '접수 조회 업무의 책임과 열람 범위를 정리한다.', actors: [{ name: '담당자', responsibility: '접수 목록 조회', sourceIds: ['SRC-1'] }], processes: [{ name: '접수 조회', trigger: '담당자의 조회 요청', steps: ['조회 조건 입력', '허용 범위의 결과 확인'], exceptions: ['열람 범위 미결정'], rules: [], data: ['접수 목록'], sourceIds: ['SRC-1'] }], terms: [], issues: [], sourceCoverage: [{ sourceId: 'SRC-1', role: 'business', rationale: '조회 업무와 담당 범위의 근거' }] });

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
